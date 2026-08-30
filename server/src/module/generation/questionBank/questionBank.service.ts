import crypto from "crypto";
import {
  getEmbeddings,
  getQdrantHeaders,
  ensureRagCollection,
  embedInBatches,
} from "../rag/qdrant-client.js";
import { buildSparseVector } from "../rag/sparse.js";
import { cosineSimilarity } from "../dedupe.js";
import { parseCuratedQuestions } from "./parser.js";
import type { CuratedQuestion } from "./types.js";
import { ApiError } from "../../../common/utils/ApiError.js";

// Separate collection for manually-curated previous questions used as
// reference examples by the generation agent (NOT the factual RAG source).
export const QUESTION_EXAMPLES_COLLECTION = "question_examples";

// Normalizes topic/subtopic into a stable key ("Variable Scope" -> "variablescope")
// so retrieval matches regardless of casing/spacing (JavaScript vs Javascript).
export const normalizeKey = (s: string): string =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

// ── Per-org collection resolution ─────────────────────────────────────────────
// Each organisation gets its own question-bank collection
// ("question_examples_{orgId}") so one org's curated examples are isolated from
// every other org. When no org is given (e.g. system-admin global management),
// fall back to the shared collection.
export const getQuestionExamplesCollectionForOrg = (organisationId?: string | null): string => {
  return organisationId ? `question_examples_${organisationId}` : QUESTION_EXAMPLES_COLLECTION;
};

export const ensureQuestionExamplesCollection = async (organisationId?: string | null): Promise<void> => {
  // Named vectors (dense + sparse) so retrieval can run hybrid (semantic + BM25).
  await ensureRagCollection(getQuestionExamplesCollectionForOrg(organisationId));
};

/**
 * Adds one or more curated questions (single object or array) directly to the
 * question bank. Input is validated with the same parser used by the CLI
 * indexing script; already-indexed questions (by questionId) are skipped.
 */
export const addCuratedQuestions = async (
  input: any,
  organisationId?: string | null
): Promise<{ indexed: number; skipped: number }> => {
  const collectionName = getQuestionExamplesCollectionForOrg(organisationId);
  await ensureQuestionExamplesCollection(organisationId);

  const questions = parseCuratedQuestions(JSON.stringify(input), "manual");
  if (questions.length === 0) {
    throw ApiError.badRequest("No questions could be parsed from the input.");
  }

  let indexed = 0;
  let skipped = 0;
  for (const question of questions) {
    if (await questionIdExists(question.questionId, organisationId)) {
      skipped++;
      continue;
    }
    await upsertQuestionPoint(collectionName, question, organisationId);
    indexed++;
  }

  return { indexed, skipped };
};

/** Lists all questions currently stored in the question bank. */
export const listCuratedQuestions = async (organisationId?: string | null): Promise<any[]> => {
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const collectionName = getQuestionExamplesCollectionForOrg(organisationId);
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

    const res = await fetch(`${qdrantUrl}/collections/${collectionName}/points/scroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getQdrantHeaders() },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Failed to scroll question bank: ${res.statusText}`);
    }

    const data: any = await res.json();
    const batch = data.result?.points || [];
    points.push(...batch);

    nextPageOffset = data.result?.next_page_offset || null;
    if (!nextPageOffset) hasMore = false;
  }

  return points.map((point) => {
    const payload = point.payload || {};
    const metadata = payload.metadata || {};
    return {
      ...metadata,
      question: payload.pageContent || metadata.question || "",
    };
  });
};

/** Deletes a question from the bank by its questionId. */
export const deleteCuratedQuestion = async (questionId: string, organisationId?: string | null): Promise<boolean> => {
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const collectionName = getQuestionExamplesCollectionForOrg(organisationId);
  const res = await fetch(`${qdrantUrl}/collections/${collectionName}/points/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getQdrantHeaders() },
    body: JSON.stringify({
      filter: {
        must: [{ key: "metadata.questionId", match: { value: questionId } }],
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to delete question: ${res.statusText}`);
  }
  return true;
};

/**
 * Embeds (dense) and builds a BM25 (sparse) vector for a question and upserts it
 * into the question-bank collection. Subject is intentionally NOT stored — the
 * bank is topic-scoped only.
 */
const upsertQuestionPoint = async (
  collectionName: string,
  question: CuratedQuestion,
  organisationId?: string | null
): Promise<void> => {
  const embeddings = getEmbeddings();
  const [dense] = await embedInBatches(embeddings, [question.question], 1);

  const metadata: Record<string, any> = {
    topic: question.topic,
    topicKey: normalizeKey(question.topic),
    subtopic: question.subtopic,
    subtopicKey: normalizeKey(question.subtopic),
    type: question.type,
    marks: question.marks,
    questionId: question.questionId,
    source: question.source,
    organisationId: organisationId || "",
  };
  if (question.options) metadata.options = question.options;
  if (question.correctOption) metadata.correct_option = question.correctOption;
  if (question.rubric) metadata.rubric = question.rubric;

  const point = {
    id: crypto.randomUUID(),
    vector: { dense, sparse: buildSparseVector(question.question) },
    payload: { pageContent: question.question, metadata },
  };

  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
  const res = await fetch(`${qdrantUrl}/collections/${collectionName}/points?wait=true`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getQdrantHeaders() },
    body: JSON.stringify({ points: [point] }),
  });
  if (!res.ok) {
    throw new Error(`Qdrant upsert failed: ${res.status} ${await res.text()}`);
  }
};

const questionIdExists = async (questionId: string, organisationId?: string | null): Promise<boolean> => {
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const collectionName = getQuestionExamplesCollectionForOrg(organisationId);
  try {
    const res = await fetch(`${qdrantUrl}/collections/${collectionName}/points/scroll`, {
      method: 'POST',
      headers: getQdrantHeaders(),
      body: JSON.stringify({
        filter: {
          must: [
            { key: "metadata.questionId", match: { value: questionId } }
          ]
        },
        limit: 1,
        with_payload: true,
        with_vector: false,
      }),
    });
    if (!res.ok) return false;
    const data: any = await res.json();
    return (data.result?.points?.length || 0) > 0;
  } catch (error) {
    console.error("Error checking question id in Qdrant:", error);
    return false;
  }
};

/**
 * Parses and indexes question-bank content (markdown or JSON text, same formats
 * accepted by the CLI script) directly into the org's question-bank collection.
 * Already-indexed questions (by questionId) are skipped.
 */
export const indexQuestionBankContent = async (
  content: string,
  sourceFile: string,
  organisationId?: string | null
): Promise<{ indexed: number; skipped: number; errors: number }> => {
  const collectionName = getQuestionExamplesCollectionForOrg(organisationId);
  await ensureQuestionExamplesCollection(organisationId);

  const questions = parseCuratedQuestions(content, sourceFile);

  let indexed = 0;
  let skipped = 0;
  let errors = 0;

  for (const question of questions) {
    try {
      if (await questionIdExists(question.questionId, organisationId)) {
        skipped++;
        continue;
      }
      await upsertQuestionPoint(collectionName, question, organisationId);
      indexed++;
    } catch (error: any) {
      console.error(`- Failed to index question in ${sourceFile}:`, error?.message || error);
      errors++;
    }
  }

  return { indexed, skipped, errors };
};

export interface RetrievedExample {
  question: string;
  options?: string[];
  correctOption?: string;
  rubric?: CuratedQuestion["rubric"];
  marks: number;
  topic: string;
  subtopic: string;
  type: string;
  score: number;
}

/**
 * Maximal Marginal Relevance: greedily select `topK` candidates that balance
 * relevance to the query against diversity from already-selected items.
 */
const mmrSelect = (
  relevance: number[],
  similarity: (a: number, b: number) => number,
  lambda: number,
  topK: number
): number[] => {
  const selected: number[] = [];
  const remaining = new Set<number>(relevance.map((_, i) => i));

  while (selected.length < topK && remaining.size > 0) {
    let bestIdx = -1;
    let bestScore = -Infinity;
    for (const i of remaining) {
      const diversity = selected.length === 0
        ? 0
        : Math.max(...selected.map((j) => similarity(i, j)));
      const score = lambda * relevance[i]! - (1 - lambda) * diversity;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    selected.push(bestIdx);
    remaining.delete(bestIdx);
  }

  return selected;
};

/**
 * Retrieves diverse previous questions (reference examples) for a topic.
 * Runs a hybrid search (dense embedding + BM25 sparse, fused with Qdrant's
 * native RRF) scoped to the topic via filter: topic+type first, then topic
 * alone. If nothing matches we return [] — there is no subject fallback. The
 * candidate pool is then re-scored and MMR selects `topK` diverse examples.
 */
export const retrieveExampleQuestions = async (
  topic: string,
  subtopic: string,
  type: string,
  topK: number = 3,
  candidatePool: number = 15,
  lambda: number = 0.7,
  organisationId?: string | null
): Promise<RetrievedExample[]> => {
  const collectionName = getQuestionExamplesCollectionForOrg(organisationId);
  await ensureQuestionExamplesCollection(organisationId);

  const trimmedTopic = topic.trim();
  const topicKey = normalizeKey(trimmedTopic);
  const query = [trimmedTopic, subtopic.trim()].filter(Boolean).join(" - ");
  if (!trimmedTopic || !query) return [];

  const embeddings = getEmbeddings();

  const hybridSearch = async (filter: Record<string, unknown> | null): Promise<{ text: string; metadata: any }[]> => {
    const [dense, sparse] = await Promise.all([
      embeddings.embedQuery(query),
      Promise.resolve(buildSparseVector(query)),
    ]);

    const body: Record<string, unknown> = {
      prefetch: [
        { query: dense, using: "dense", limit: candidatePool },
        { query: { indices: sparse.indices, values: sparse.values }, using: "sparse", limit: candidatePool },
      ],
      query: { rrf: { k: 60 } },
      limit: candidatePool,
      with_payload: true,
    };
    if (filter) body.filter = filter;

    const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
    const res = await fetch(`${qdrantUrl}/collections/${collectionName}/points/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getQdrantHeaders() },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Qdrant hybrid query failed: ${res.status} ${await res.text()}`);
    }

    const data: any = await res.json();
    return (data.result?.points ?? []).map((p: any) => ({
      text: p.payload?.pageContent ?? "",
      metadata: p.payload?.metadata ?? {},
    }));
  };

  // Tiered topic-scoped filters. Match on the exact topic OR the normalized
  // topicKey (so existing + newly ingested points both work). If both come back
  // empty, return nothing.
  const topicMatch = (field: string, value: string) => ({ key: field, match: { value } });
  const topicShould = [
    topicMatch("metadata.topic", trimmedTopic),
    topicMatch("metadata.topicKey", topicKey),
  ];
  const filters: (Record<string, unknown> | null)[] = [
    { must: [{ key: "metadata.type", match: { value: type } }], should: topicShould },
    { should: topicShould },
  ];

  let results: { text: string; metadata: any }[] = [];
  for (const filter of filters) {
    try {
      results = await hybridSearch(filter);
    } catch (error) {
      console.warn(`Question-bank hybrid search failed for topic "${trimmedTopic}":`, error);
    }
    if (results.length > 0) break;
  }

  if (results.length === 0) return [];

  // Recompute a consistent relevance score (cosine) and use candidate vectors
  // for pairwise diversity, independent of Qdrant's raw score semantics.
  const texts = results.map((r) => r.text);
  const [queryVec, candidateVecs] = await Promise.all([
    embeddings.embedQuery(query),
    embeddings.embedDocuments(texts),
  ]);

  const relevance = candidateVecs.map((v) => cosineSimilarity(queryVec, v));
  const similarity = (a: number, b: number) => cosineSimilarity(candidateVecs[a]!, candidateVecs[b]!);
  const selectedIdx = mmrSelect(relevance, similarity, lambda, Math.min(topK, results.length));

  return selectedIdx.map((idx) => {
    const { text, metadata } = results[idx]!;
    return {
      question: text,
      options: metadata.options,
      correctOption: metadata.correct_option,
      rubric: metadata.rubric,
      marks: typeof metadata.marks === "number" ? metadata.marks : 1,
      topic: metadata.topic || trimmedTopic,
      subtopic: metadata.subtopic || "",
      type: metadata.type || type,
      score: relevance[idx]!,
    };
  });
};
