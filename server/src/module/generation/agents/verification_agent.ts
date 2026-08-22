import { getClientForModel } from "../../../common/agent/openai.client.js";
import { env } from "../../../env.js";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

export const BlueprintVerificationWarningSchema = z.object({
    topic: z.string(),
    subtopic: z.string(),
    reason: z.string(),
    suggestedTopic: z.string().default(""),
});

export const BlueprintVerificationOutputSchema = z.object({
    isValid: z.boolean(),
    overallFeedback: z.string().default(""),
    warnings: z.array(BlueprintVerificationWarningSchema).default([]),
});

export type BlueprintVerificationOutput = z.infer<typeof BlueprintVerificationOutputSchema>;

export const getVerificationSystemPrompt = (): string => {
    return `You are an expert academic curriculum & assessment verification agent.

YOUR TASK:
1. Analyze the provided exam section structure. Each section contains BLOCKS, and each BLOCK has its own "subject", optional "instructions", "question_type", and allocated question counts across topics/subtopics.
2. Check SEMANTIC RELEVANCE: Ensure every subtopic logically and conceptually belongs under its assigned parent topic AND within its block's SUBJECT.
   - Example 1: Subtopic "async/await" placed under topic "Variables & Data Types" is SEMANTICALLY MISMATCHED. Suggested parent topic: "Asynchronous JavaScript".
   - Example 2: Subtopic "SQL JOINs" placed under a block whose subject is "Accounting" is OFF-TOPIC. Suggested action: Remove or replace with accounting concepts.
3. Check ALLOCATION SANITY: Ensure allocated question counts make sense for each block and its topics.
4. Output structured JSON:
   - "isValid": true if all subtopics are semantically correct and properly categorized. Set to false if any subtopic is severely misclassified or off-topic.
   - "overallFeedback": Brief summary of the blueprint evaluation.
   - "warnings": Array of specific subtopic issues with fields: "topic", "subtopic", "reason", and optional "suggestedTopic".
`;
};

export async function verificationAgent(input: any): Promise<BlueprintVerificationOutput> {
    const client = await getClientForModel(env.GENERATION_MODEL);

    const response = await client.chat.completions.create({
        model: env.GENERATION_MODEL,
        messages: [
            {
                role: "system",
                content: getVerificationSystemPrompt()
            },
            {
                role: "user",
                content: JSON.stringify(input, null, 2)
            }
        ],
        response_format: zodResponseFormat(
            BlueprintVerificationOutputSchema,
            "blueprint_verification_output"
        )
    });

    const content = response.choices[0]?.message.content || "{}";
    const parsed = JSON.parse(content);
    return BlueprintVerificationOutputSchema.parse(parsed);
}
