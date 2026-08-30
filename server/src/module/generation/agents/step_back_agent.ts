import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";
import { zodResponseFormat } from "openai/helpers/zod";
import { StepBackAgentOutputZodSchema, type StepBackAgentOutput } from "../Types/outputStepBack.js";

function getSystemPrompt(): string {
  return `You are a step-back prompting agent for an exam-knowledge chatbot.

You are given a user's question. Your job is to derive a SINGLE broader, more general
question whose answer would also answer the original question. Retrieving material for the
step-back question surfaces the underlying concepts the original question depends on.

RULES:
1. The step-back question must be MORE general/high-level than the original.
2. It must stay in the same domain (do not drift to an unrelated topic).
3. It must be self-contained and answerable from study material.
4. Do NOT generate multiple questions — exactly one.
5. Respond with STRICT JSON only — no explanation, no markdown. Use exactly this structure:

{
  "stepBackQuestion": "string"
}
`;
}

export async function stepBackAgent(question: string): Promise<StepBackAgentOutput> {
    const client = await getClientForModel(env.GENERATION_MODEL);
    const response = await client.chat.completions.create({
        model: env.GENERATION_MODEL,
        messages: [
            { role: "system", content: getSystemPrompt() },
            { role: "user", content: JSON.stringify({ question }) },
        ],
        response_format: zodResponseFormat(
            StepBackAgentOutputZodSchema,
            "step_back_agent_output"
        ),
    });
    const content = response.choices[0]?.message.content || "{}";
    return StepBackAgentOutputZodSchema.parse(JSON.parse(content));
}