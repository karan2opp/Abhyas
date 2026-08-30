import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";
import { zodResponseFormat } from "openai/helpers/zod";
import { HydeAgentOutputZodSchema, type HydeAgentOutput } from "../Types/outputHyde.js";

function getSystemPrompt(): string {
  return `You are a hypothetical-document (HyDE) agent for an exam-knowledge chatbot.

You are given a user's question. Your job is to write a short hypothetical passage that
WOULD answer the question — written as if it were a section from a study note. This passage
is only used as a search query, so it should be rich in the factual terms and concepts a real
study note on the topic would contain.

RULES:
1. Keep the passage 80-200 words.
2. Cover the key definitions, terms, and concepts the question is about.
3. Do NOT invent a final answer to the question; write a neutral, informative passage.
4. Respond with STRICT JSON only — no explanation, no markdown. Use exactly this structure:

{
  "passage": "string"
}
`;
}

export async function hydeAgent(question: string): Promise<HydeAgentOutput> {
    const client = await getClientForModel(env.GENERATION_MODEL);
    const response = await client.chat.completions.create({
        model: env.GENERATION_MODEL,
        messages: [
            { role: "system", content: getSystemPrompt() },
            { role: "user", content: JSON.stringify({ question }) },
        ],
        response_format: zodResponseFormat(
            HydeAgentOutputZodSchema,
            "hyde_agent_output"
        ),
    });
    const content = response.choices[0]?.message.content || "{}";
    return HydeAgentOutputZodSchema.parse(JSON.parse(content));
}