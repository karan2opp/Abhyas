import crypto from "crypto";
import { OpenAIEmbeddings } from "@langchain/openai";
import { buildSparseVector } from "./sparse.js";
import type { ChunkedDocument } from "./chunk-types.js";

export const COLLECTION_NAME = "exams";
export const RAG_VECTOR_SIZE = 1536; // text-embedding-3-small

// ── Per-org collection resolution ─────────────────────────────────────────────
// Each organisation gets its own Qdrant collection ("knowledge_{orgId}") so an
// org's uploaded material is isolated from every other org. When no org is given
// (e.g. system-admin global uploads), fall back to the shared collection.
export const getCollectionForOrg = (organisationId?: string | null): string => {
  return organisationId ? `knowledge_${organisationId}` : COLLECTION_NAME;
};

export const getQdrantHeaders = () => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.QDRANT_API_KEY) {
    headers["api-key"] = process.env.QDRANT_API_KEY;
  }
  return headers;
};

export const getQdrantConfig = (collectionName: string = COLLECTION_NAME) => {
  const config: { url: string; collectionName: string; apiKey?: string } = {
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collectionName,
  };
  if (process.env.QDRANT_API_KEY) {
    config.apiKey = process.env.QDRANT_API_KEY;
  }
  return config;
};

let embeddings: OpenAIEmbeddings | null = null;

export const getEmbeddings = (): OpenAIEmbeddings => {
  if (!embeddings) {
    embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      apiKey: process.env.OPENAI_API_KEY || "",
    });
  }
  return embeddings;
};

/**
 * Legacy single-vector collection (unnamed "default" dense vector). Kept for
 * the question bank, which still uses langchain's QdrantVectorStore.
 */
export const ensureQdrantCollection = async (collectionName: string): Promise<void> => {
  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
  try {
    const res = await fetch(`${qdrantUrl}/collections/${collectionName}`, {
      headers: getQdrantHeaders(),
    });
    if (res.ok) return;

    console.log(`Creating Qdrant collection: ${collectionName}`);
    const createRes = await fetch(`${qdrantUrl}/collections/${collectionName}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getQdrantHeaders() },
      body: JSON.stringify({
        vectors: {
          size: RAG_VECTOR_SIZE,
          distance: "Cosine",
        },
      }),
    });
    if (!createRes.ok) {
      const errorText = await createRes.text();
      throw new Error(`Failed to create Qdrant collection: ${errorText}`);
    }
  } catch (error) {
    console.error("Error in ensureQdrantCollection:", error);
    throw error;
  }
};

/**
 * RAG parent/child collection with named vectors:
 *  - "dense": 1536-dim cosine (OpenAI text-embedding-3-small)
 *  - "sparse": native BM25 sparse vectors (idf modifier, no extra model)
 */
export const ensureRagCollection = async (collectionName: string): Promise<void> => {
  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
  const res = await fetch(`${qdrantUrl}/collections/${collectionName}`, {
    headers: getQdrantHeaders(),
  });
  if (res.ok) {
    await ensurePayloadIndexes(collectionName);
    return;
  }

  console.log(`Creating RAG Qdrant collection (named vectors): ${collectionName}`);
  const createRes = await fetch(`${qdrantUrl}/collections/${collectionName}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getQdrantHeaders() },
    body: JSON.stringify({
      vectors: {
        dense: { size: RAG_VECTOR_SIZE, distance: "Cosine" },
      },
      sparse_vectors: {
        sparse: { modifier: "idf" },
      },
    }),
  });
  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create RAG Qdrant collection: ${errorText}`);
  }

  await ensurePayloadIndexes(collectionName);
};

// ── Payload keyword indexes ───────────────────────────────────────────────────
// Qdrant only supports filtering by a payload field once a keyword index exists
// on it. Without these, "metadata.topic"/"metadata.subject" filters fail with
// "Index required but not found" and every scoped retrieval silently returns [].
// Indexes are non-destructive and apply to existing points — no re-upload needed.
const INDEX_FIELDS = [
  "metadata.subject",
  "metadata.topic",
  "metadata.topicKey",
  "metadata.subtopic",
  "metadata.subtopicKey",
  "metadata.type",
  "metadata.fileHash",
  "metadata.sourceFile",
  "metadata.questionId",
];

const indexedCollections = new Set<string>();

/**
 * Creates keyword payload indexes for a collection. Runs once per collection per
 * process; creating an index that already exists returns 400, which is ignored.
 */
export const ensurePayloadIndexes = async (collectionName: string): Promise<void> => {
  if (indexedCollections.has(collectionName)) return;
  indexedCollections.add(collectionName);

  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
  for (const field of INDEX_FIELDS) {
    try {
      const res = await fetch(`${qdrantUrl}/collections/${collectionName}/index`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getQdrantHeaders() },
        body: JSON.stringify({ field_name: field, field_schema: "keyword" }),
      });
      if (!res.ok && res.status !== 400) {
        console.warn(`[Qdrant] Failed to create index on "${field}" in "${collectionName}": ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      console.warn(`[Qdrant] Error creating index on "${field}" in "${collectionName}":`, err);
    }
  }
};

export const embedInBatches = async (
  embeddings: OpenAIEmbeddings,
  texts: string[],
  batchSize: number = 64
): Promise<number[][]> => {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    out.push(...(await embeddings.embedDocuments(batch)));
  }
  return out;
};

export interface RagMetadata {
  subject: string;
  topic: string;
  subtopic: string;
  sourceFile: string;
  fileHash: string;
  indexedAt: number;
  organisationId: string;
  docType: "markdown" | "pdf";
}

const upsertPoints = async (collectionName: string, points: any[]): Promise<void> => {
  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
  for (let i = 0; i < points.length; i += 64) {
    const batch = points.slice(i, i + 64);
    const res = await fetch(`${qdrantUrl}/collections/${collectionName}/points?wait=true`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getQdrantHeaders() },
      body: JSON.stringify({ points: batch }),
    });
    if (!res.ok) {
      throw new Error(`Qdrant upsert failed: ${res.status} ${await res.text()}`);
    }
  }
};

/**
 * Embeds and upserts a parent/child chunked document into the given RAG
 * collection. Parents get a dense vector (full section text); children get both
 * a dense and a BM25 sparse vector. Returns the number of child chunks indexed.
 */
export const upsertChunkedDocument = async (
  collectionName: string,
  doc: ChunkedDocument,
  meta: RagMetadata
): Promise<number> => {
  const embeddings = getEmbeddings();

  const parentTexts = doc.parents.map((p) => p.text);
  const childTexts = doc.children.map((c) => c.text);
  const allDense = await embedInBatches(embeddings, [...parentTexts, ...childTexts]);

  const parentDense = allDense.slice(0, parentTexts.length);
  const childDense = allDense.slice(parentTexts.length);

  const parentIdByKey = new Map<string, string>();
  const parentHeadingByKey = new Map<string, string>();
  for (const parent of doc.parents) {
    parentIdByKey.set(parent.key, crypto.randomUUID());
    parentHeadingByKey.set(parent.key, parent.heading);
  }

  const points: any[] = [];
  doc.parents.forEach((parent, i) => {
    const id = parentIdByKey.get(parent.key)!;
    points.push({
      id,
      vector: { dense: parentDense[i] },
      payload: {
        pageContent: parent.text,
        metadata: {
          ...meta,
          level: "parent",
          heading: parent.heading,
        },
      },
    });
  });

  doc.children.forEach((child, i) => {
    const parentId = parentIdByKey.get(child.parentKey);
    points.push({
      id: crypto.randomUUID(),
      vector: { dense: childDense[i], sparse: buildSparseVector(child.text) },
      payload: {
        pageContent: child.text,
        metadata: {
          ...meta,
          level: "child",
          heading: child.heading,
          parentId,
          parentHeading: parentHeadingByKey.get(child.parentKey) ?? "",
          part: child.part,
          page: child.page ?? 0,
        },
      },
    });
  });

  await upsertPoints(collectionName, points);
  return doc.children.length;
};

// ── Distinct-collections cache ────────────────────────────────────────────────
// getDistinctCollections() scrolls a Qdrant collection, so we cache the result
// per collection with a short TTL to avoid rescanning on every retrieval.
const COLLECTIONS_CACHE_TTL_MS = 60 * 1000;
let collectionsCache: { key: string; data: { subject: string; topic: string; count: number }[]; expiresAt: number } | null = null;

export const invalidateCollectionsCache = (): void => {
  collectionsCache = null;
};

export const getDistinctCollections = async (
  organisationId?: string | null
): Promise<{ subject: string; topic: string; count: number }[]> => {
  const collectionName = getCollectionForOrg(organisationId);
  const cacheKey = collectionName;

  if (collectionsCache && collectionsCache.key === cacheKey && Date.now() < collectionsCache.expiresAt) {
    return collectionsCache.data;
  }

  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";

  try {
    const checkRes = await fetch(`${qdrantUrl}/collections/${collectionName}`, {
      headers: getQdrantHeaders(),
    });
    if (!checkRes.ok) {
      return [];
    }
  } catch (checkError) {
    console.error("Qdrant connection error:", checkError);
    return [];
  }

  const points: any[] = [];
  let nextPageOffset: string | number | null = null;
  let hasMore = true;

  while (hasMore) {
    const body: any = {
      limit: 100,
      with_payload: true,
      with_vector: false,
    };
    if (nextPageOffset !== null) {
      body.offset = nextPageOffset;
    }

    const scrollRes = await fetch(`${qdrantUrl}/collections/${collectionName}/points/scroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getQdrantHeaders() },
      body: JSON.stringify(body),
    });

    if (!scrollRes.ok) {
      throw new Error(`Failed to scroll points from Qdrant: ${scrollRes.statusText}`);
    }

    const data: any = await scrollRes.json();
    const batch = data.result?.points || [];
    points.push(...batch);

    nextPageOffset = data.result?.next_page_offset || null;
    if (!nextPageOffset) {
      hasMore = false;
    }
  }

  const groups: Record<string, { subject: string; topic: string; count: number }> = {};
  for (const point of points) {
    const metadata = point.payload?.metadata;
    if (metadata && metadata.subject && metadata.topic) {
      const key = `${metadata.subject.trim()}|||${metadata.topic.trim()}`;
      if (!groups[key]) {
        groups[key] = {
          subject: metadata.subject.trim(),
          topic: metadata.topic.trim(),
          count: 0,
        };
      }
      groups[key].count++;
    }
  }

  const result = Object.values(groups);
  collectionsCache = { key: cacheKey, data: result, expiresAt: Date.now() + COLLECTIONS_CACHE_TTL_MS };
  return result;
};