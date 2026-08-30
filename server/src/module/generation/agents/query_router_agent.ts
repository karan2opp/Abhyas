import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";
import { zodResponseFormat } from "openai/helpers/zod";
import { QueryRouterOutputZodSchema, type QueryRouterOutput } from "../Types/outputQueryRouter.js";

function getSystemPrompt(): string {
  return `You are a query-router for an exam-study chatbot that answers using an organisation's knowledge base (study notes/course material).

You are given a user's question. Decide whether answering it benefits from retrieving relevant passages from the knowledge base.

Return "useRag": true when the question is about a subject the knowledge base likely covers — concepts, definitions, differences, explanations, mechanics, course material, or anything where grounding in study notes would improve accuracy.

Return "useRag": false ONLY for well-known general facts the model can answer confidently with no sources at all — e.g. historical dates, famous people/places, capital cities, common world trivia, one-line everyday facts that have nothing to do with the org's study material.

Be conservative: if you are unsure whether the knowledge base could help, return "useRag": true (the pipeline will fall back gracefully if nothing is found).

Respond with STRICT JSON only — no explanation, no markdown. Use exactly this structure:

{
  "useRag": true,
  "reason": "short explanation"
}
`;
}

export async function queryRouter(question: string): Promise<QueryRouterOutput> {
    const client = await getClientForModel(env.GENERATION_MODEL);
    const response = await client.chat.completions.create({
        model: env.GENERATION_MODEL,
        messages: [
            { role: "system", content: getSystemPrompt() },
            { role: "user", content: JSON.stringify({ question }) },
        ],
        response_format: zodResponseFormat(
            QueryRouterOutputZodSchema,
            "query_router_output"
        ),
    });
    const content = response.choices[0]?.message.content || "{}";
    return QueryRouterOutputZodSchema.parse(JSON.parse(content));
}