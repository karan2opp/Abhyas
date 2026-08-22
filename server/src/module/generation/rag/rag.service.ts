import fs from "fs";
import crypto from "crypto";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { ApiError } from "../../../common/utils/ApiError.js";
import { loadMarkdownChunks } from "./markdown.js";
const COLLECTION_NAME = "exams";

// ── Per-org collection resolution ─────────────────────────────────────────────
// Each organisation gets its own Qdrant collection ("knowledge_{orgId}") so an
// org's uploaded material is isolated from every other org. When no org is given
// (e.g. system-admin global uploads), fall back to the shared collection.
export const getCollectionForOrg = (organisationId?: string | null): string => {
  return organisationId ? `knowledge_${organisationId}` : COLLECTION_NAME;
};

let embeddings: OpenAIEmbeddings | null = null;

export const getEmbeddings = (): OpenAIEmbeddings => {
  if (!embeddings) {
    embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }
  return embeddings;
};

export const getQdrantHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.QDRANT_API_KEY) {
    headers['api-key'] = process.env.QDRANT_API_KEY;
  }
  return headers;
};

export const getQdrantConfig = (collectionName: string = COLLECTION_NAME) => {
  const config: { url: string; collectionName: string; apiKey?: string } = {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    collectionName,
  };
  if (process.env.QDRANT_API_KEY) {
    config.apiKey = process.env.QDRANT_API_KEY;
  }
  return config;
};

export const ensureQdrantCollection = async (collectionName: string = COLLECTION_NAME): Promise<void> => {
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  try {
    const res = await fetch(`${qdrantUrl}/collections/${collectionName}`, {
      headers: getQdrantHeaders()
    });
    if (res.ok) {
      return; // Already exists
    }
    
    // Collection doesn't exist, create it
    console.log(`Creating Qdrant collection: ${collectionName}`);
    const createRes = await fetch(`${qdrantUrl}/collections/${collectionName}`, {
      method: 'PUT',
      headers: getQdrantHeaders(),
      body: JSON.stringify({
        vectors: {
          size: 1536, // size for text-embedding-3-small
          distance: 'Cosine'
        }
      })
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

// Delete all previously indexed chunks for a given source file. Used when a file
// is re-indexed after being edited (new hash) so old content does not accumulate.
const deleteChunksForSourceFile = async (sourceFile: string, organisationId?: string | null): Promise<void> => {
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const collectionName = getCollectionForOrg(organisationId);
  try {
    const res = await fetch(`${qdrantUrl}/collections/${collectionName}/points/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getQdrantHeaders() },
      body: JSON.stringify({
        filter: {
          must: [
            {
              key: "metadata.sourceFile",
              match: { value: sourceFile }
            }
          ]
        }
      })
    });
    if (!res.ok) {
      console.warn(`[RAG] Failed to delete stale chunks for "${sourceFile}" in ${collectionName}: ${res.statusText}`);
    } else {
      console.log(`[RAG] Removed stale chunks for previously indexed "${sourceFile}" in ${collectionName}`);
    }
  } catch (deleteError) {
    console.error(`[RAG] Error deleting stale chunks for "${sourceFile}":`, deleteError);
  }
};

export const checkIfHashIndexed = async (fileHash: string, organisationId?: string | null): Promise<boolean> => {
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const collectionName = getCollectionForOrg(organisationId);
  try {
    await ensureQdrantCollection(collectionName);

    const res = await fetch(`${qdrantUrl}/collections/${collectionName}/points/scroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: {
          must: [
            {
              key: "metadata.fileHash",
              match: {
                value: fileHash
              }
            }
          ]
        },
        limit: 1,
        with_payload: true,
        with_vector: false
      })
    });

    if (!res.ok) {
      return false;
    }

    const data: any = await res.json();
    return (data.result?.points?.length || 0) > 0;
  } catch (error) {
    console.error("Error checking duplicate hash in Qdrant:", error);
    return false;
  }
};

export const indexPdfDocument = async (
  filePath: string,
  originalFileName: string,
  subject: string,
  topic?: string,
  subtopic?: string,
  organisationId?: string | null
): Promise<{ chunksIndexed: number; fileHash: string }> => {
  // Compute SHA-256 hash of the file content
  let fileHash: string;
  try {
    const fileBuffer = fs.readFileSync(filePath);
    fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  } catch (hashError) {
    console.error("Error computing file hash:", hashError);
    throw ApiError.internal("Failed to process file hash");
  }

  const collectionName = getCollectionForOrg(organisationId);

  // Check Qdrant for duplicate hash
  const isAlreadyIndexed = await checkIfHashIndexed(fileHash, organisationId);
  if (isAlreadyIndexed) {
    return { chunksIndexed: 0, fileHash };
  }

  // Load PDF using PDFLoader
  let documents;
  try {
    const loader = new PDFLoader(filePath);
    documents = await loader.load();
  } catch (parseError) {
    console.error("PDF Parsing failed:", parseError);
    throw ApiError.badRequest("Failed to parse PDF file. Ensure it is a valid, unencrypted PDF.");
  }

  if (!documents || documents.length === 0) {
    throw ApiError.badRequest("PDF contains no readable page-level content.");
  }

  // Attach metadata to every chunk before embedding
  const timestamp = Date.now();
  documents.forEach((doc) => {
    doc.metadata = {
      ...doc.metadata,
      subject: subject.trim(),
      topic: topic ? topic.trim() : "",
      subtopic: subtopic ? subtopic.trim() : "",
      sourceFile: originalFileName,
      fileHash,
      indexedAt: timestamp,
      organisationId: organisationId || "",
    };
  });


  // Ensure collection exists
  await ensureQdrantCollection(collectionName);

  // Initialize embedding model
  const embeddings = getEmbeddings();

  // Get Vector Store and add documents
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    getQdrantConfig(collectionName)
  );

  try {
    await vectorStore.addDocuments(documents);
    invalidateCollectionsCache();
  } catch (qdrantError: any) {
    console.error("Qdrant indexing failed:", qdrantError);
    throw ApiError.internal(`Failed to store document embeddings in Qdrant: ${qdrantError?.message || qdrantError}`);
  }

  return { chunksIndexed: documents.length, fileHash };
};

export const indexDocument = async (
  filePath: string,
  originalFileName: string,
  subject: string,
  topic?: string,
  subtopic?: string,
  organisationId?: string | null
): Promise<{ chunksIndexed: number; fileHash: string }> => {
  const extension = originalFileName.split(".").pop()?.toLowerCase() || "";

  if (extension === "md" || extension === "markdown") {
    return indexMarkdownDocument(filePath, originalFileName, subject, topic, subtopic, organisationId);
  }

  return indexPdfDocument(filePath, originalFileName, subject, topic, subtopic, organisationId);
};

const indexMarkdownDocument = async (
  filePath: string,
  originalFileName: string,
  subject: string,
  topic?: string,
  subtopic?: string,
  organisationId?: string | null
): Promise<{ chunksIndexed: number; fileHash: string }> => {
  // Compute SHA-256 hash of the file content
  let fileHash: string;
  try {
    const fileBuffer = fs.readFileSync(filePath);
    fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  } catch (hashError) {
    console.error("Error computing file hash:", hashError);
    throw ApiError.internal("Failed to process file hash");
  }

  const collectionName = getCollectionForOrg(organisationId);

  // Check Qdrant for duplicate hash
  const isAlreadyIndexed = await checkIfHashIndexed(fileHash, organisationId);
  if (isAlreadyIndexed) {
    return { chunksIndexed: 0, fileHash };
  }

  // Load markdown, clean it and chunk it
  const documents = await loadMarkdownChunks(
    filePath,
    originalFileName,
    subject,
    topic,
    subtopic,
    fileHash,
    organisationId
  );

  // Ensure collection exists
  await ensureQdrantCollection(collectionName);

  // Remove stale chunks from a previously indexed version of this file before
  // adding the updated one, so outdated content does not accumulate in Qdrant.
  await deleteChunksForSourceFile(originalFileName, organisationId);

  // Initialize embedding model
  const embeddings = getEmbeddings();

  // Get Vector Store and add documents
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    getQdrantConfig(collectionName)
  );

  try {
    await vectorStore.addDocuments(documents);
    invalidateCollectionsCache();
  } catch (qdrantError: any) {
    console.error("Qdrant indexing failed:", qdrantError);
    throw ApiError.internal(`Failed to store document embeddings in Qdrant: ${qdrantError?.message || qdrantError}`);
  }

  return { chunksIndexed: documents.length, fileHash };
};

// ── Distinct-collections cache ────────────────────────────────────────────────
// getDistinctCollections() scrolls a Qdrant collection, so we cache the result
// per collection with a short TTL to avoid rescanning on every retrieval.
const COLLECTIONS_CACHE_TTL_MS = 60 * 1000;
let collectionsCache: { key: string; data: { subject: string; topic: string; count: number }[]; expiresAt: number } | null = null;

const invalidateCollectionsCache = () => {
  collectionsCache = null;
};

export const getDistinctCollections = async (organisationId?: string | null): Promise<{ subject: string; topic: string; count: number }[]> => {
  const collectionName = getCollectionForOrg(organisationId);
  const cacheKey = collectionName;

  // Serve a fresh cached result if available
  if (collectionsCache && collectionsCache.key === cacheKey && Date.now() < collectionsCache.expiresAt) {
    return collectionsCache.data;
  }

  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  
  // Check if collection exists
  try {
    const checkRes = await fetch(`${qdrantUrl}/collections/${collectionName}`);
    if (!checkRes.ok) {
      return [];
    }
  } catch (checkError) {
    console.error("Qdrant connection error:", checkError);
    return [];
  }

  // Scroll through all points in the org's Qdrant collection
  const points: any[] = [];
  let nextPageOffset: string | number | null = null;
  let hasMore = true;

  while (hasMore) {
    const body: any = {
      limit: 100,
      with_payload: true,
      with_vector: false
    };
    if (nextPageOffset !== null) {
      body.offset = nextPageOffset;
    }

    const scrollRes = await fetch(`${qdrantUrl}/collections/${collectionName}/points/scroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
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

  // Group by (subject, topic) in memory
  const groups: Record<string, { subject: string; topic: string; count: number }> = {};
  for (const point of points) {
    const metadata = point.payload?.metadata;
    if (metadata && metadata.subject && metadata.topic) {
      const key = `${metadata.subject.trim()}|||${metadata.topic.trim()}`;
      if (!groups[key]) {
        groups[key] = {
          subject: metadata.subject.trim(),
          topic: metadata.topic.trim(),
          count: 0
        };
      }
      groups[key].count++;
    }
  }

  const result = Object.values(groups);
  collectionsCache = { key: cacheKey, data: result, expiresAt: Date.now() + COLLECTIONS_CACHE_TTL_MS };
  return result;
};

export const queryRelevantChunks = async (
  subject: string,
  topic: string,
  subtopic: string,
  topK: number = 5,
  organisationId?: string | null
): Promise<{ text: string; score: number; sourceFile: string }[]> => {
  try {
    const collectionName = getCollectionForOrg(organisationId);
    const collections = await getDistinctCollections(organisationId);
    const trimmedSub = subject.trim().toLowerCase();
    const matchedObj = collections.find((c) => c.subject.toLowerCase() === trimmedSub);
    const canonicalSubject = matchedObj ? matchedObj.subject : subject.trim();

    const query = `${topic} - ${subtopic}`;

    const embeddings = getEmbeddings();

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      getQdrantConfig(collectionName)
    );

    // Fetch a larger candidate pool so re-ranking has something to work with.
    const poolK = Math.max(topK * 4, 20);

    // 1. Try exact topic match under canonical subject
    let filter: any = {
      must: [
        {
          key: "metadata.subject",
          match: {
            value: canonicalSubject
          }
        },
        {
          key: "metadata.topic",
          match: {
            value: topic.trim()
          }
        }
      ]
    };

    let results = await vectorStore.similaritySearchWithScore(query, poolK, filter);

    // 2. If no results, try case-insensitive topic match from indexed collections
    if (!results || results.length === 0) {
      const trimmedTop = topic.trim().toLowerCase();
      const matchedTopic = collections.find(
        (c) => c.subject.toLowerCase() === canonicalSubject.toLowerCase() && c.topic.toLowerCase() === trimmedTop
      );
      if (matchedTopic) {
        filter = {
          must: [
            { key: "metadata.subject", match: { value: canonicalSubject } },
            { key: "metadata.topic", match: { value: matchedTopic.topic } }
          ]
        };
        results = await vectorStore.similaritySearchWithScore(query, poolK, filter);
      }
    }

    // 3. If still no results, fallback to subject-only filter for semantic vector search across the entire subject
    if (!results || results.length === 0) {
      filter = {
        must: [
          {
            key: "metadata.subject",
            match: {
              value: canonicalSubject
            }
          }
        ]
      };
      results = await vectorStore.similaritySearchWithScore(query, poolK, filter);
    }

    if (!results || results.length === 0) {
      console.warn(`No relevant chunks found in Qdrant for subject: "${subject}", topic: "${topic}"`);
      return [];
    }

    // Re-rank: boost chunks whose topic/subtopic metadata matches the query, then
    // keep the best topK by combined score.
    const trimmedTopic = topic.trim().toLowerCase();
    const trimmedSubtopic = (subtopic || "").trim().toLowerCase();
    const ranked = results
      .map(([doc, score]: [any, number]) => {
        const md = doc.metadata || {};
        let combined = score;
        if (md.topic && md.topic.trim().toLowerCase() === trimmedTopic) combined += 0.05;
        if (trimmedSubtopic && md.subtopic && md.subtopic.trim().toLowerCase() === trimmedSubtopic) combined += 0.1;
        return { doc, score: combined };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    console.log(`Successfully retrieved ${ranked.length} relevant chunk(s) from Qdrant for subject: "${subject.trim()}", topic: "${topic.trim()}", subtopic: "${subtopic.trim()}"`);

    return ranked.map(({ doc, score }) => ({
      text: doc.pageContent,
      score: score,
      sourceFile: (doc.metadata.sourceFile || doc.metadata.source || "") as string
    }));

  } catch (error) {
    console.warn(`Error or empty result querying relevant chunks for "${subject} - ${topic} - ${subtopic}":`, error);
    return [];
  }
};

