// Token/size heuristics and generic text splitting shared by the markdown and
// PDF parent-child chunkers. Chunk sizes are expressed in "tokens" using a
// cheap proxy (chars / 4) so we avoid adding a tokenizer dependency.
export const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

export const CHILD_CHUNK_MAX_TOKENS = 500;
export const CHILD_CHUNK_OVERLAP_TOKENS = 100; // ~80 words

/**
 * Hard-splits a single long block (no blank lines) into overlapping windows of
 * roughly `maxTokens` tokens. Windows advance by `maxTokens - overlapTokens`,
 * so consecutive chunks share ~`overlapTokens` tokens (~80-100 words).
 */
export const splitLongBlock = (
  text: string,
  maxTokens: number = CHILD_CHUNK_MAX_TOKENS,
  overlapTokens: number = CHILD_CHUNK_OVERLAP_TOKENS
): string[] => {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [];

  const maxWords = Math.max(1, Math.floor(maxTokens * 0.8));
  const overlapWords = Math.max(1, Math.floor(overlapTokens * 0.8));

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end >= words.length) break;
    start = Math.max(start + (maxWords - overlapWords), end - overlapWords);
  }
  return chunks;
};

/**
 * Splits arbitrary text into chunks of <= `maxTokens` tokens, carrying a
 * ~`overlapTokens` tail from the previous chunk into the next one so context is
 * not lost across boundaries. Paragraphs are preserved; only paragraphs longer
 * than `maxTokens` are hard-split.
 */
export const splitTextIntoChunks = (
  text: string,
  maxTokens: number = CHILD_CHUNK_MAX_TOKENS,
  overlapTokens: number = CHILD_CHUNK_OVERLAP_TOKENS
): string[] => {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (paragraphs.length === 0) return [];

  const blocks: string[] = [];
  for (const para of paragraphs) {
    if (estimateTokens(para) > maxTokens) {
      blocks.push(...splitLongBlock(para, maxTokens, overlapTokens));
    } else {
      blocks.push(para);
    }
  }

  const takeOverlapTail = (from: string[]): string[] => {
    const tail: string[] = [];
    let tailTokens = 0;
    for (let i = from.length - 1; i >= 0; i--) {
      const t = estimateTokens(from[i]!);
      if (tail.length > 0 && tailTokens + t > overlapTokens) break;
      tail.unshift(from[i]!);
      tailTokens += t;
    }
    return tail;
  };

  const chunks: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const block of blocks) {
    const blockTokens = estimateTokens(block);
    if (current.length > 0 && currentTokens + blockTokens > maxTokens) {
      // Flush the filled chunk, then seed the next one with its overlap tail so
      // context is carried across boundaries without losing any content.
      chunks.push(current.join("\n\n"));
      current = takeOverlapTail(current);
      currentTokens = current.reduce((sum, b) => sum + estimateTokens(b), 0);
    }
    current.push(block);
    currentTokens += blockTokens;
  }
  if (current.length > 0) chunks.push(current.join("\n\n"));

  return chunks.filter((c) => c.trim().length > 0);
};