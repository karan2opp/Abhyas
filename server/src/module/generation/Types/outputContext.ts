import { z } from "zod";

export const ContextAgentOutputZodSchema = z.object({
    context: z.string().describe("A concise, accurate study-note style explanation of the subtopic covering key definitions, concepts and examples"),
    key_concepts: z.array(z.string()).describe("The key terms and concepts belonging to this subtopic"),
    sample_facts: z.array(z.string()).describe("3-6 concrete factual points or examples about the subtopic"),
});

export type ContextAgentOutput = z.infer<typeof ContextAgentOutputZodSchema>;