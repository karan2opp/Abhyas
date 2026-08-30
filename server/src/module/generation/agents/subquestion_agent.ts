import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";
import { zodResponseFormat } from "openai/helpers/zod";
import { SubquestionAgentOutputZodSchema, type SubquestionAgentOutput } from "../Types/outputSubquestions.js";

function getSystemPrompt(): string {
  return `You are a query-decomposition agent for an exam-knowledge chatbot.

You are given a user's question. Your job is to break it into 3 focused sub-questions that,
taken together, cover the information needed to fully answer the original question.

RULES:
1. Generate exactly 3 sub-questions.
2. Each sub-question must be self-contained and answerable from study material on its own.
3. Cover different aspects of the original question (definitions, mechanics, differences, edge cases).
4. Do NOT repeat the original question verbatim.
5. Respond with STRICT JSON only — no explanation, no markdown. Use exactly this structure:

{
  "subQuestions": ["string", "string", "string"]
}
`;
}

export async function subquestionAgent(question: string): Promise<SubquestionAgentOutput> {
    const client = await getClientForModel(env.GENERATION_MODEL);
    const response = await client.chat.completions.create({
        model: env.GENERATION_MODEL,
        messages: [
            { role: "system", content: getSystemPrompt() },
            { role: "user", content: JSON.stringify({ question }) },
        ],
        response_format: zodResponseFormat(
            SubquestionAgentOutputZodSchema,
            "subquestion_agent_output"
        ),
    });
    const content = response.choices[0]?.message.content || "{}";
    return SubquestionAgentOutputZodSchema.parse(JSON.parse(content));
}