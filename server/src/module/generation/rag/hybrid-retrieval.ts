import { getEmbeddings, getQdrantHeaders, getCollectionForOrg, getDistinctCollections } from "./qdrant-client.js";
import { buildSparseVector } from "./sparse.js";
import { reciprocalRankFusion } from "./rrf.js";
import { llmRerank } from "./reranker.js";
import { subquestionAgent } from "../agents/subquestion_agent.js";
import { stepBackAgent } from "../agents/step_back_agent.js";
import { hydeAgent } from "../agents/hyde_agent.js";

const qdrantUrl = (): string => process.env.QDRANT_URL || "http://localhost:6333";
const POOL_MULTIPLIER = 4;
const MIN_POOL = 20;

export interface RetrievedChild {
  id: string;
  text: string;
  score: number;
  sourceFile: string;
  heading: string;
  parentHeading: string;
  parentId: string | undefined;
  page: number | undefined;
}

export interface ExpandedCandidate extends RetrievedChild {
  parentText: string;
}

export interface StandardChunk {
  text: string;
  score: number;
  sourceFile: string;
}

export interface AdvancedChunk {
  text: string;
  childText: string;
  score: number;
  sourceFile: string;
  heading: string;
  parentHeading: string;
  page: number | undefined;
}

const toRetrievedChild = (p: any): RetrievedChild => {
  const md = p.payload?.metadata ?? {};
  return {
    id: p.id,
    text: p.payload?.pageContent ?? "",
    score: p.score,
    sourceFile: (md.sourceFile ?? md.source ?? "") as string,
    heading: (md.heading ?? "") as string,
    parentHeading: (md.parentHeading ?? "") as string,
    parentId: md.parentId as string | undefined,
    page: md.page as number | undefined,
  };
};

/**
 * One hybrid query against a collection: dense embedding + sparse BM25 vectors
 * run in parallel over child chunks and fused with Qdrant's native RRF.
 */
const hybridSearch = async (
  collectionName: string,
  queryText: string,
  filter: Record<string, unknown> | null,
  limit: number
): Promise<RetrievedChild[]> => {
  const embeddings = getEmbeddings();
  const [dense, sparse] = await Promise.all([
    embeddings.embedQuery(queryText),
    Promise.resolve(buildSparseVector(queryText)),
  ]);

  const body: Record<string, unknown> = {
    prefetch: [
      { query: dense, using: "dense", limit },
      { query: { indices: sparse.indices, values: sparse.values }, using: "sparse", limit },
    ],
    query: { rrf: { k: 60 } },
    limit,
    with_payload: true,
  };
  if (filter) body.filter = filter;

  const res = await fetch(`${qdrantUrl()}/collections/${collectionName}/points/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getQdrantHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Qdrant hybrid query failed: ${res.status} ${await res.text()}`);
  }

  const data: any = await res.json();
  return (data.result?.points ?? []).map(toRetrievedChild);
};

/**
 * Parent-context expansion: fetch the parent points of the top children and
 * build context units deduped by parent, so retrieved children are returned
 * with their full heading section.
 */
const expandWithParents = async (
  collectionName: string,
  children: RetrievedChild[],
  topN: number
): Promise<ExpandedCandidate[]> => {
  const top = children.slice(0, topN);
  const parentIds = [...new Set(top.map((c) => c.parentId).filter((id): id is string => Boolean(id)))];

  const parentsById = new Map<string, { heading: string; text: string }>();
  if (parentIds.length > 0) {
    try {
      const res = await fetch(`${qdrantUrl()}/collections/${collectionName}/points`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getQdrantHeaders() },
        body: JSON.stringify({ ids: parentIds, with_payload: true, with_vector: false }),
      });
      if (res.ok) {
        const data: any = await res.json();
        for (const p of data.result ?? []) {
          const md = p.payload?.metadata ?? {};
          parentsById.set(p.id, {
            heading: (md.heading ?? "") as string,
            text: p.payload?.pageContent ?? "",
          });
        }
      }
    } catch (err) {
      console.warn("Parent expansion failed, falling back to child-only chunks:", err);
    }
  }

  const units: ExpandedCandidate[] = [];
  const seen = new Set<string>();
  for (const child of top) {
    const unitKey = child.parentId ?? child.id;
    if (seen.has(unitKey)) continue;
    seen.add(unitKey);
    const parent = child.parentId ? parentsById.get(child.parentId) : undefined;
    units.push({ ...child, parentText: parent?.text ?? "" });
  }
  return units;
};

const rerankTop = async (
  query: string,
  expanded: ExpandedCandidate[],
  topK: number
): Promise<ExpandedCandidate[]> => {
  const candidates = expanded.map((e) => ({ id: e.id, text: e.parentText || e.text }));
  try {
    const reranked = await llmRerank(query, candidates, topK);
    const byId = new Map(expanded.map((e) => [e.id, e]));
    return reranked
      .map((r) => {
        const e = byId.get(r.id);
        return e ? { ...e, score: r.score } : null;
      })
      .filter((x): x is ExpandedCandidate => x !== null);
  } catch (err) {
    console.warn("Rerank failed, using pre-rerank order:", err);
    return expanded.slice(0, topK);
  }
};

/**
 * Standard retrieval (question generation): subject+topic-filtered hybrid search.
 * The topic filter is ALWAYS applied (even when a custom query is supplied) so
 * broad subject-only chunks never bleed into a specific topic's questions.
 */
export const retrieveStandard = async (input: {
  subject: string;
  topic: string;
  subtopic: string;
  topK: number;
  organisationId?: string | null;
  query?: string;
}): Promise<StandardChunk[]> => {
  const { subject, topic, subtopic, topK, organisationId, query } = input;
  try {
    const collectionName = getCollectionForOrg(organisationId);
    const collections = await getDistinctCollections(organisationId);

    const trimmedSub = subject.trim().toLowerCase();
    const matchedObj = collections.find((c) => c.subject.toLowerCase() === trimmedSub);
    const canonicalSubject = matchedObj ? matchedObj.subject : subject.trim();

    const trimmedTop = topic.trim().toLowerCase();
    const matchedTopic = collections.find(
      (c) => c.subject.toLowerCase() === canonicalSubject.toLowerCase() && c.topic.toLowerCase() === trimmedTop
    );
    const canonicalTopic = matchedTopic ? matchedTopic.topic : topic.trim();

    const searchText = query && query.trim() ? query.trim() : [canonicalTopic, subtopic.trim()].filter(Boolean).join(" - ");
    const poolK = Math.max(topK * POOL_MULTIPLIER, MIN_POOL);

    const filter: any = {
      must: [{ key: "metadata.subject", match: { value: canonicalSubject } }],
    };
    if (canonicalTopic) {
      filter.must.push({ key: "metadata.topic", match: { value: canonicalTopic } });
    }

    const children = await hybridSearch(collectionName, searchText, filter, poolK);

    if (children.length === 0) {
      console.warn(`No relevant chunks found for subject: "${subject}", topic: "${topic}"`);
      return [];
    }

    const expanded = await expandWithParents(collectionName, children, Math.max(topK * 3, 9));
    const ranked = await rerankTop(searchText, expanded, topK);

    return ranked.map((e) => ({
      text: e.parentText || e.text,
      score: e.score,
      sourceFile: e.sourceFile,
    }));
  } catch (error) {
    console.warn(`Error querying relevant chunks for "${subject} - ${topic} - ${subtopic}":`, error);
    return [];
  }
};

/**
 * Advanced retrieval (chatbot): decompose the question into sub-questions,
 * generate a step-back question and a HyDE passage, run a whole-collection
 * hybrid search for each variant, fuse with RRF, then parent expand + rerank.
 */
export const retrieveAdvanced = async (input: {
  question: string;
  topK: number;
  organisationId?: string | null;
}): Promise<AdvancedChunk[]> => {
  const { question, topK, organisationId } = input;
  const questionTrim = question.trim();
  if (!questionTrim) return [];

  const collectionName = getCollectionForOrg(organisationId);
  const poolK = Math.max(topK * POOL_MULTIPLIER, MIN_POOL);

  // 1. Build query variants (each step degrades gracefully on failure).
  const variants: string[] = [questionTrim];
  const [subs, stepBack, hyde] = await Promise.allSettled([
    subquestionAgent(questionTrim),
    stepBackAgent(questionTrim),
    hydeAgent(questionTrim),
  ]);
  if (subs.status === "fulfilled") variants.push(...subs.value.subQuestions.slice(0, 3));
  if (stepBack.status === "fulfilled") variants.push(stepBack.value.stepBackQuestion);
  if (hyde.status === "fulfilled") variants.push(hyde.value.passage);

  // 2. Hybrid search per variant across the whole collection (no filter).
  const perVariant: RetrievedChild[][] = [];
  for (const variant of variants) {
    try {
      const result = await hybridSearch(collectionName, variant, null, poolK);
      if (result.length > 0) perVariant.push(result);
    } catch (err) {
      console.warn(`Hybrid search failed for variant "${variant.slice(0, 80)}":`, err);
    }
  }

  if (perVariant.length === 0) return [];

  // 3. Cross-variant RRF → top candidates.
  const fused = reciprocalRankFusion(perVariant, 60, (c) => c.id);
  const topChildren = fused.slice(0, Math.max(topK * 3, 15)).map((f) => f.item);

  // 4. Parent-context expansion.
  const expanded = await expandWithParents(collectionName, topChildren, topChildren.length);

  // 5. Re-rank against the original question.
  const ranked = await rerankTop(questionTrim, expanded, topK);

  return ranked.map((e) => ({
    text: e.parentText || e.text,
    childText: e.text,
    score: e.score,
    sourceFile: e.sourceFile,
    heading: e.parentHeading || e.heading,
    parentHeading: e.parentHeading,
    page: e.page,
  }));
};