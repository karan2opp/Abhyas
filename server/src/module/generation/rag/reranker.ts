import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";
import { zodResponseFormat } from "openai/helpers/zod";
import { RerankOutputZodSchema } from "../Types/outputRerank.js";

export interface RerankCandidate {
  id: string;
  text: string;
}

export interface RerankResult {
  id: string;
  score: number;
}

const MAX_CANDIDATE_CHARS = 700;

function getSystemPrompt(): string {
  return `You are a relevance re-ranking agent for an exam-knowledge retrieval system.

You are given:
- "query": the question/topic the user is asking about.
- "candidates": a numbered list of text excerpts retrieved from study material.

Your job is to score how relevant each candidate is to the query, on a scale of 0 to 10:
- 10: directly answers the query.
- 7-9: strongly on-topic and useful context.
- 4-6: partially related.
- 0-3: unrelated or marginally relevant.

RULES:
1. Output exactly one score per candidate, in the SAME ORDER they were provided.
2. Be strict — do not give high scores to tangentially related material.
3. Respond with STRICT JSON only — no explanation, no markdown. Use exactly this structure:

{
  "scores": [number, number, ...]
}
`;
}

export async function llmRerank(
  query: string,
  candidates: RerankCandidate[],
  topK: number
): Promise<RerankResult[]> {
  if (candidates.length === 0) return [];

  const numbered = candidates
    .map((c, i) => `${i + 1}. ${c.text.slice(0, MAX_CANDIDATE_CHARS)}`)
    .join("\n\n---\n\n");

  const client = await getClientForModel(env.GENERATION_MODEL);
  const response = await client.chat.completions.create({
    model: env.GENERATION_MODEL,
    messages: [
      { role: "system", content: getSystemPrompt() },
      { role: "user", content: JSON.stringify({ query, candidates: numbered }) },
    ],
    response_format: zodResponseFormat(RerankOutputZodSchema, "rerank_output"),
  });

  const content = response.choices[0]?.message.content || "{}";
  const parsed = RerankOutputZodSchema.parse(JSON.parse(content));

  const scored = candidates.map((c, i) => ({ id: c.id, score: parsed.scores[i] ?? 0 }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}