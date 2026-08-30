// Sparse (BM25-style) vector construction for Qdrant's native sparse vectors.
// Qdrant applies the IDF modifier at the collection level, so we only need to
// supply per-document term frequencies keyed by a stable token hash.
const SPARSE_INDEX_SPACE = 1 << 20; // 2^20 — stable index space across documents
const MAX_TERMS = 100;

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "else", "when", "while",
  "for", "of", "to", "in", "on", "at", "by", "with", "from", "into", "about",
  "as", "is", "are", "was", "were", "be", "been", "being", "do", "does", "did",
  "have", "has", "had", "will", "would", "can", "could", "should", "may", "might",
  "shall", "must", "it", "its", "this", "that", "these", "those", "there", "here",
  "which", "who", "whom", "whose", "what", "where", "why", "how", "all", "each",
  "every", "both", "some", "any", "no", "not", "only", "just", "also", "too",
  "very", "more", "most", "than", "such", "so", "per", "via", "e.g.", "etc",
]);

const fnv1a = (str: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const tokenize = (text: string): string[] => {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.filter((w) => w.length > 1 && !STOPWORDS.has(w));
};

export const buildSparseVector = (
  text: string,
  maxTerms: number = MAX_TERMS
): { indices: number[]; values: number[] } => {
  const freq = new Map<string, number>();
  for (const w of tokenize(text)) {
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxTerms);

  const indexMap = new Map<number, number>();
  for (const [word, count] of ranked) {
    const idx = fnv1a(word) % SPARSE_INDEX_SPACE;
    indexMap.set(idx, (indexMap.get(idx) ?? 0) + count);
  }

  const entries = [...indexMap.entries()].sort((a, b) => a[0] - b[0]);
  return {
    indices: entries.map((e) => e[0]),
    values: entries.map((e) => e[1]),
  };
};