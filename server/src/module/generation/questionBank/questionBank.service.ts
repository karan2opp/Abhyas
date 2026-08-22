import fs from "fs";
import path from "path";
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

// Separate collection for manually-curated previous questions used as
// reference examples by the generation agent (NOT the factual RAG source).
export const QUESTION_EXAMPLES_COLLECTION = "question_examples";

export const ensureQuestionExamplesCollection = async (): Promise<void> => {
  await ensureQdrantCollection(QUESTION_EXAMPLES_COLLECTION);
};

const questionToDocument = (q: CuratedQuestion): Document => {
  const metadata: Record<string, any> = {
    subject: q.subject,
    topic: q.topic,
    subtopic: q.subtopic,
    type: q.type,
    difficulty: q.difficulty,
    marks: q.marks,
    questionId: q.questionId,
    source: q.source,
  };
  if (q.options) metadata.options = q.options;
  if (q.correctOption) metadata.correct_option = q.correctOption;
  if (q.rubric) metadata.rubric = q.rubric;

  return new Document({
    pageContent: q.question,
    metadata,
  });
};

const questionIdExists = async (questionId: string): Promise<boolean> => {
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  try {
    const res = await fetch(`${qdrantUrl}/collections/${QUESTION_EXAMPLES_COLLECTION}/points/scroll`, {
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

export const indexCuratedQuestionBank = async (
  dir: string
): Promise<{ indexed: number; skipped: number; errors: number }> => {
  await ensureQuestionExamplesCollection();

  if (!fs.existsSync(dir)) {
    throw new Error(`Question bank directory not found: ${dir}`);
  }

  const files = fs.readdirSync(dir).filter((f) => /\.(md|markdown|json)$/i.test(f));
  const embeddings = getEmbeddings();
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    getQdrantConfig(QUESTION_EXAMPLES_COLLECTION)
  );

  let indexed = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const questions = parseCuratedQuestions(content, file);

      for (const question of questions) {
        if (await questionIdExists(question.questionId)) {
          console.log(`- Already indexed: ${file} (${question.subtopic})`);
          skipped++;
          continue;
        }

        await vectorStore.addDocuments([questionToDocument(question)]);
        console.log(`- Indexed: ${file} (${question.type}, ${question.difficulty}, ${question.subtopic})`);
        indexed++;
      }
    } catch (error: any) {
      console.error(`- Failed to index ${file}:`, error?.message || error);
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
  lambda: number = 0.7
): Promise<RetrievedExample[]> => {
  await ensureQuestionExamplesCollection();

  const embeddings = getEmbeddings();
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    getQdrantConfig(QUESTION_EXAMPLES_COLLECTION)
  );

  const query = `${topic} - ${subtopic}`;

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
