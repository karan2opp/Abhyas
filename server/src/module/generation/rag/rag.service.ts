import crypto from "crypto";
import fs from "fs";
import { ApiError } from "../../../common/utils/ApiError.js";
import { chunkMarkdown } from "./markdown-chunker.js";
import { chunkPdf } from "./pdf-chunker.js";
import { subjectMatchAgent } from "../agents/subject_match_agent.js";
import {
  getCollectionForOrg,
  getEmbeddings,
  getQdrantHeaders,
  getQdrantConfig,
  ensureQdrantCollection,
  ensureRagCollection,
  upsertChunkedDocument,
  getDistinctCollections,
  invalidateCollectionsCache,
} from "./qdrant-client.js";

// Re-exported so existing consumers (question bank, scripts) keep working.
export {
  getCollectionForOrg,
  getEmbeddings,
  getQdrantHeaders,
  getQdrantConfig,
  ensureQdrantCollection,
  getDistinctCollections,
};

const computeFileHash = (filePath: string): string => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  } catch (hashError) {
    console.error("Error computing file hash:", hashError);
    throw ApiError.internal("Failed to process file hash");
  }
};

// Delete all previously indexed chunks (parents + children) for a given source
// file. Used when a file is re-indexed after being edited (new hash) so old
// content does not accumulate.
const deleteChunksForSourceFile = async (sourceFile: string, organisationId?: string | null): Promise<void> => {
  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
  const collectionName = getCollectionForOrg(organisationId);
  try {
    const res = await fetch(`${qdrantUrl}/collections/${collectionName}/points/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getQdrantHeaders() },
      body: JSON.stringify({
        filter: {
          must: [
            {
              key: "metadata.sourceFile",
              match: { value: sourceFile },
            },
          ],
        },
      }),
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
  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
  const collectionName = getCollectionForOrg(organisationId);
  try {
    await ensureRagCollection(collectionName);

    const res = await fetch(`${qdrantUrl}/collections/${collectionName}/points/scroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filter: {
          must: [
            {
              key: "metadata.fileHash",
              match: { value: fileHash },
            },
          ],
        },
        limit: 1,
        with_payload: true,
        with_vector: false,
      }),
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

const indexChunkedFile = async (
  filePath: string,
  originalFileName: string,
  subject: string,
  topic: string,
  subtopic: string,
  organisationId: string | null | undefined,
  docType: "markdown" | "pdf"
): Promise<{ chunksIndexed: number; fileHash: string }> => {
  const fileHash = computeFileHash(filePath);
  const collectionName = getCollectionForOrg(organisationId);

  await ensureRagCollection(collectionName);

  if (await checkIfHashIndexed(fileHash, organisationId)) {
    return { chunksIndexed: 0, fileHash };
  }

  const doc =
    docType === "markdown"
      ? chunkMarkdown(fs.readFileSync(filePath, "utf-8"), originalFileName)
      : await chunkPdf(filePath, originalFileName);

  if (doc.parents.length === 0 || doc.children.length === 0) {
    throw ApiError.badRequest("File produced no indexable parent/child chunks.");
  }

  await deleteChunksForSourceFile(originalFileName, organisationId);

  const chunksIndexed = await upsertChunkedDocument(collectionName, doc, {
    subject: subject.trim(),
    topic: topic.trim(),
    subtopic: subtopic.trim(),
    sourceFile: originalFileName,
    fileHash,
    indexedAt: Date.now(),
    organisationId: organisationId ?? "",
    docType,
  });

  invalidateCollectionsCache();
  return { chunksIndexed, fileHash };
};

export const indexPdfDocument = async (
  filePath: string,
  originalFileName: string,
  subject: string,
  topic?: string,
  subtopic?: string,
  organisationId?: string | null
): Promise<{ chunksIndexed: number; fileHash: string }> => {
  return indexChunkedFile(
    filePath,
    originalFileName,
    subject,
    topic ?? "",
    subtopic ?? "",
    organisationId,
    "pdf"
  );
};

const indexMarkdownDocument = async (
  filePath: string,
  originalFileName: string,
  subject: string,
  topic?: string,
  subtopic?: string,
  organisationId?: string | null
): Promise<{ chunksIndexed: number; fileHash: string }> => {
  return indexChunkedFile(
    filePath,
    originalFileName,
    subject,
    topic ?? "",
    subtopic ?? "",
    organisationId,
    "markdown"
  );
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

// ── Subject fuzzy matching ────────────────────────────────────────────────────
const SUBJECT_MATCH_CACHE_TTL_MS = 5 * 60 * 1000;
let subjectMatchCache: { key: string; matched: string | null; expiresAt: number } | null = null;

export const resolveIndexedSubject = async (
  userSubject: string,
  organisationId?: string | null
): Promise<{ matched: string | null; score: number }> => {
  let collections: { subject: string; topic: string; count: number }[] = [];
  try {
    collections = await getDistinctCollections(organisationId);
  } catch (err) {
    console.error(`Failed to load indexed subjects for matching:`, err);
    return { matched: null, score: 0 };
  }

  const subjects = [...new Set(collections.map((c) => c.subject))];
  if (subjects.length === 0) return { matched: null, score: 0 };

  const cacheKey = `${organisationId || "global"}::${userSubject.trim().toLowerCase()}`;
  if (subjectMatchCache && subjectMatchCache.key === cacheKey && Date.now() < subjectMatchCache.expiresAt) {
    return { matched: subjectMatchCache.matched, score: subjectMatchCache.matched ? 1 : 0 };
  }

  const exact = subjects.find((s) => s.trim().toLowerCase() === userSubject.trim().toLowerCase());
  if (exact) {
    subjectMatchCache = { key: cacheKey, matched: exact, expiresAt: Date.now() + SUBJECT_MATCH_CACHE_TTL_MS };
    return { matched: exact, score: 1 };
  }

  let matched: string | null = null;
  try {
    const result = await subjectMatchAgent(userSubject.trim(), subjects);
    matched = result.matchedSubject;
    if (matched && !subjects.includes(matched)) matched = null;
  } catch (err) {
    console.error(`Subject match agent failed for "${userSubject}":`, err);
    matched = null;
  }

  subjectMatchCache = { key: cacheKey, matched, expiresAt: Date.now() + SUBJECT_MATCH_CACHE_TTL_MS };
  return { matched, score: matched ? 1 : 0 };
};

// ── Retrieval (Phase 2) ──────────────────────────────────────────────────────
// Both modes run on the dedicated "rag-retrieval" BullMQ worker because each
// request makes several LLM calls (sub-questions/step-back/HyDE/rerank) and
// Qdrant queries. The callers keep their existing synchronous call patterns via
// waitUntilFinished.
import { ragRetrievalQueue, ragRetrievalEvents } from "../../../common/queue/queues.js";

const RETRIEVAL_JOB_TIMEOUT_MS = 4 * 60 * 1000;
const RETRIEVAL_JOB_OPTS = {
  attempts: 2,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: true,
  removeOnFail: false,
};

export const queryRelevantChunks = async (
  subject: string,
  topic: string,
  subtopic: string,
  topK: number = 5,
  organisationId?: string | null,
  query?: string
): Promise<{ text: string; score: number; sourceFile: string }[]> => {
  try {
    const job = await ragRetrievalQueue.add(
      "retrieve-standard",
      { mode: "standard", subject, topic, subtopic, topK, organisationId, query },
      RETRIEVAL_JOB_OPTS
    );
    const result = await job.waitUntilFinished(ragRetrievalEvents, RETRIEVAL_JOB_TIMEOUT_MS);
    return result as { text: string; score: number; sourceFile: string }[];
  } catch (error) {
    console.warn(`Error querying relevant chunks for "${subject} - ${topic} - ${subtopic}":`, error);
    return [];
  }
};

export const retrieveChatChunks = async (
  question: string,
  topK: number = 5,
  organisationId?: string | null
): Promise<{
  text: string;
  childText: string;
  score: number;
  sourceFile: string;
  heading: string;
  parentHeading: string;
  page: number | undefined;
}[]> => {
  try {
    const job = await ragRetrievalQueue.add(
      "retrieve-advanced",
      { mode: "advanced", question, topK, organisationId },
      RETRIEVAL_JOB_OPTS
    );
    const result = await job.waitUntilFinished(ragRetrievalEvents, RETRIEVAL_JOB_TIMEOUT_MS);
    return result as {
      text: string;
      childText: string;
      score: number;
      sourceFile: string;
      heading: string;
      parentHeading: string;
      page: number | undefined;
    }[];
  } catch (error) {
    console.warn(`Error retrieving chat chunks for question: "${question.slice(0, 80)}":`, error);
    return [];
  }
};