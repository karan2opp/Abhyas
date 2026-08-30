import { z } from "zod";

export const SubquestionAgentOutputZodSchema = z.object({
    subQuestions: z.array(z.string()).min(1).max(6).describe("Decomposed sub-questions that together cover the original question"),
});

export type SubquestionAgentOutput = z.infer<typeof SubquestionAgentOutputZodSchema>;