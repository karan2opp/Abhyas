import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";
import { BatchGenerationAgentOutputSchema } from "../Types/outputGenAgent.js";
import type { BatchGenerationAgentOutput } from "../Types/outputGenAgent.js";
import { zodResponseFormat } from "openai/helpers/zod";
import { getSystemPrompt } from "../prompt.js";

async function generationAgent(input: any): Promise<BatchGenerationAgentOutput> {
    const client = await getClientForModel(env.GENERATION_MODEL);
    const response = await client.chat.completions.create({
        model: env.GENERATION_MODEL,
        messages: [
            {
                role: "system",
                content: getSystemPrompt()
            },
            {
                role: "user",
                content: JSON.stringify(input)
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