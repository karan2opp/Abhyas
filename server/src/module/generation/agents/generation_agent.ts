import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";
import { BatchGenerationAgentOutputSchema } from "../Types/outputGenAgent.js";
import type { BatchGenerationAgentOutput } from "../Types/outputGenAgent.js";
import { zodResponseFormat } from "openai/helpers/zod";
import { getSystemPrompt } from "../prompt.js";

async function generationAgent(input: any): Promise<BatchGenerationAgentOutput> {
    const client = await getClientForModel(env.GENERATION_MODEL);

    // Reference examples are few-shot format guidance — load them into the
    // system prompt so the model treats them as behaviour/format rules, and keep
    // the actual task (batch + rag_context + instructions) in the user message.
    const referenceExamples = Array.isArray(input?.reference_examples) ? input.reference_examples : [];
    const taskInput = { ...(input || {}) };
    delete taskInput.reference_examples;

    const response = await client.chat.completions.create({
        model: env.GENERATION_MODEL,
        messages: [
            {
                role: "system",
                content: getSystemPrompt(referenceExamples)
            },
            {
                role: "user",
                content: JSON.stringify(taskInput)
            }
        ],
        response_format: zodResponseFormat(
            BatchGenerationAgentOutputSchema,
            "batch_generation_agent_output"
        )
    });

    const content = response.choices[0]?.message.content || "{}";
    const parsed = JSON.parse(content);
    return BatchGenerationAgentOutputSchema.parse(parsed);
}

export { generationAgent };