import { z } from "zod";

export const HydeAgentOutputZodSchema = z.object({
    passage: z.string().describe("A short hypothetical factual passage that would answer the question"),
});

export type HydeAgentOutput = z.infer<typeof HydeAgentOutputZodSchema>;