import { OpenAIEmbeddings } from "@langchain/openai";

// Trigram Jaccard below this is too different to bother with a cosine check.
const TRIGRAM_PREFILTER = 0.4;
// Cosine similarity at/above this is treated as a near-duplicate.
const COSINE_DUP_THRESHOLD = 0.85;

const toTrigrams = (text: string): Set<string> => {
    const normalized = text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const grams = new Set<string>();
    for (let i = 0; i + 3 <= normalized.length; i++) {
        grams.add(normalized.slice(i, i + 3));
    }
    return grams;
};

const trigramJaccard = (a: string, b: string): number => {
    const ga = toTrigrams(a);
    const gb = toTrigrams(b);
    if (ga.size === 0 || gb.size === 0) return 0;
    let intersection = 0;
    for (const g of ga) {
        if (gb.has(g)) intersection++;
    }
    const union = ga.size + gb.size - intersection;
    return intersection / union;
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i]! * b[i]!;
        na += a[i]! * a[i]!;
        nb += b[i]! * b[i]!;
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
};

/**
 * Two-tier near-duplicate detection:
 *   1. Trigram Jaccard pre-filter (free) to find candidate pairs.
 *   2. Cosine similarity (embeddings) to confirm only the candidates.
 * Returns the indices (into `candidates`) that are near-duplicates of an
 * already-accepted question or of an earlier candidate.
 */
export const findNearDuplicateIndices = async (
    candidates: string[],
    existing: string[]
): Promise<Set<number>> => {
    const duplicates = new Set<number>();
    if (candidates.length === 0) return duplicates;

    const pool = [...existing, ...candidates];

    // Step 1: trigram pre-filter → candidate pairs
    const pairs: Array<{ candidatePoolIdx: number; otherPoolIdx: number }> = [];
    for (let i = 0; i < candidates.length; i++) {
        const candidatePoolIdx = existing.length + i;
        for (let j = 0; j < candidatePoolIdx; j++) {
            if (trigramJaccard(pool[candidatePoolIdx]!, pool[j]!) >= TRIGRAM_PREFILTER) {
                pairs.push({ candidatePoolIdx, otherPoolIdx: j });
            }
        }
    }

    if (pairs.length === 0) return duplicates;

    // Step 2: embed only the unique pool texts involved in candidate pairs
    const involvedPoolIdx = new Set<number>();
    for (const p of pairs) {
        involvedPoolIdx.add(p.candidatePoolIdx);
        involvedPoolIdx.add(p.otherPoolIdx);
    }

    const orderedIdx = [...involvedPoolIdx];
    let embeddings: number[][];
    try {
        const embedder = new OpenAIEmbeddings({
            model: "text-embedding-3-small",
            apiKey: process.env.OPENAI_API_KEY || "",
        });
        embeddings = await embedder.embedDocuments(orderedIdx.map((idx) => pool[idx]!));
    } catch (err) {
        console.error("Dedup embedding failed, skipping cosine check:", err);
        return duplicates;
    }

    const embMap = new Map<number, number[]>();
    orderedIdx.forEach((idx, i) => embMap.set(idx, embeddings[i]!));

    // Step 3: cosine confirm
    for (const p of pairs) {
        const candidateEmb = embMap.get(p.candidatePoolIdx);
        const otherEmb = embMap.get(p.otherPoolIdx);
        if (candidateEmb && otherEmb && cosineSimilarity(candidateEmb, otherEmb) >= COSINE_DUP_THRESHOLD) {
            duplicates.add(p.candidatePoolIdx - existing.length);
        }
    }

    return duplicates;
};
