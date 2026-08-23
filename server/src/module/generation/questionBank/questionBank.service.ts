import { Document } from "@langchain/core/documents";
import { QdrantVectorStore } from "@langchain/qdrant";
import {
  ensureQdrantCollection,
  getEmbeddings,
  getQdrantConfig,
  getQdrantHeaders,
} from "../rag/rag.service.js";
import { cosineSimilarity } from "../dedupe.js";
import { parseCuratedQuestions } from "./parser.js";
import type { CuratedQuestion } from "./types.js";
import { ApiError } from "../../../common/utils/ApiError.js";

// Separate collection for manually-curated previous questions used as
// reference examples by the generation agent (NOT the factual RAG source).
export const QUESTION_EXAMPLES_COLLECTION = "question_examples";

// ── Per-org collection resolution ─────────────────────────────────────────────
// Each organisation gets its own question-bank collection
// ("question_examples_{orgId}") so one org's curated examples are isolated from
// every other org. When no org is given (e.g. system-admin global management),
// fall back to the shared collection.
export const getQuestionExamplesCollectionForOrg = (organisationId?: string | null): string => {
  return organisationId ? `question_examples_${organisationId}` : QUESTION_EXAMPLES_COLLECTION;
};

export const ensureQuestionExamplesCollection = async (organisationId?: string | null): Promise<void> => {
  await ensureQdrantCollection(getQuestionExamplesCollectionForOrg(organisationId));
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

  const embeddings = getEmbeddings();
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    getQdrantConfig(collectionName)
  );

  let indexed = 0;
  let skipped = 0;
  for (const question of questions) {
    if (await questionIdExists(question.questionId, organisationId)) {
      skipped++;
      continue;
    }
    await vectorStore.addDocuments([questionToDocument(question, organisationId)]);
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
      question: payload.content || metadata.question || "",
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

const questionToDocument = (q: CuratedQuestion, organisationId?: string | null): Document => {
  const metadata: Record<string, any> = {
    subject: q.subject,
    topic: q.topic,
    subtopic: q.subtopic,
    type: q.type,
    difficulty: q.difficulty,
    marks: q.marks,
    questionId: q.questionId,
    source: q.source,
    organisationId: organisationId || "",
  };
  if (q.options) metadata.options = q.options;
  if (q.correctOption) metadata.correct_option = q.correctOption;
  if (q.rubric) metadata.rubric = q.rubric;

  return new Document({
    pageContent: q.question,
    metadata,
  });
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

  const embeddings = getEmbeddings();
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    getQdrantConfig(collectionName)
  );

  let indexed = 0;
  let skipped = 0;
  let errors = 0;

  for (const question of questions) {
    try {
      if (await questionIdExists(question.questionId, organisationId)) {
        skipped++;
        continue;
      }
      await vectorStore.addDocuments([questionToDocument(question, organisationId)]);
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
  difficulty: string;
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
 * Retrieves diverse previous questions (reference examples) for a subtopic.
 * Filters tiered: subject+type+difficulty -> subject+type -> subject. Fetches a
 * larger candidate pool then applies MMR to return `topK` diverse examples.
 */
export const retrieveExampleQuestions = async (
  subject: string,
  topic: string,
  subtopic: string,
  type: string,
  difficulty: string,
  topK: number = 3,
  candidatePool: number = 15,
  lambda: number = 0.7,
  organisationId?: string | null
): Promise<RetrievedExample[]> => {
  const collectionName = getQuestionExamplesCollectionForOrg(organisationId);
  await ensureQuestionExamplesCollection(organisationId);

  const embeddings = getEmbeddings();
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    getQdrantConfig(collectionName)
  );

  // Build a meaningful embedding query. topic/subtopic may be empty (metadata is
  // optional now) — fall back to whatever parts are present, then subject.
  const parts = [topic.trim(), subtopic.trim()].filter(Boolean);
  const query = parts.length > 0 ? parts.join(" - ") : subject.trim();

  const filters: any[] = [
    {
      must: [
        { key: "metadata.subject", match: { value: subject } },
        { key: "metadata.type", match: { value: type } },
        { key: "metadata.difficulty", match: { value: difficulty } },
      ],
    },
    {
      must: [
        { key: "metadata.subject", match: { value: subject } },
        { key: "metadata.type", match: { value: type } },
      ],
    },
    {
      must: [{ key: "metadata.subject", match: { value: subject } }],
    },
  ];

  let results: [Document, number][] = [];
  for (const filter of filters) {
    results = await vectorStore.similaritySearchWithScore(query, candidatePool, filter);
    if (results.length > 0) break;
  }

  if (results.length === 0) return [];

  // Recompute a consistent relevance score (cosine) and use candidate vectors
  // for pairwise diversity, independent of Qdrant's raw score semantics.
  const texts = results.map(([doc]) => doc.pageContent);
  const [queryVec, candidateVecs] = await Promise.all([
    embeddings.embedQuery(query),
    embeddings.embedDocuments(texts),
  ]);

  const relevance = candidateVecs.map((v) => cosineSimilarity(queryVec, v));
  const similarity = (a: number, b: number) => cosineSimilarity(candidateVecs[a]!, candidateVecs[b]!);
  const selectedIdx = mmrSelect(relevance, similarity, lambda, Math.min(topK, results.length));

  return selectedIdx.map((idx) => {
    const [doc] = results[idx]!;
    const md = doc.metadata as any;
    return {
      question: doc.pageContent,
      options: md.options,
      correctOption: md.correct_option,
      rubric: md.rubric,
      marks: typeof md.marks === "number" ? md.marks : 1,
      topic: md.topic || "",
      subtopic: md.subtopic || "",
      type: md.type || type,
      difficulty: md.difficulty || difficulty,
      score: relevance[idx]!,
    };
  });
};
