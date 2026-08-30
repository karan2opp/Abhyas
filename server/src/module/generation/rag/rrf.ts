// Reciprocal Rank Fusion — merges several relevance-ranked lists into one. Each
// item's fused score is the sum of 1/(k + rank) across every list it appears in.
export const RRF_K = 60;

export interface FusedItem<T> {
  item: T;
  score: number;
}

export const reciprocalRankFusion = <T>(
  lists: T[][],
  k: number = RRF_K,
  key: (item: T) => string
): FusedItem<T>[] => {
  const scores = new Map<string, { item: T; score: number }>();

  for (const list of lists) {
    const seen = new Set<string>();
    list.forEach((item, idx) => {
      const itemKey = key(item);
      if (seen.has(itemKey)) return;
      seen.add(itemKey);
      const entry = scores.get(itemKey) ?? { item, score: 0 };
      entry.score += 1 / (k + idx + 1);
      scores.set(itemKey, entry);
    });
  }

  return [...scores.values()].sort((a, b) => b.score - a.score);
};