import { z } from "zod";

export const StepBackAgentOutputZodSchema = z.object({
    stepBackQuestion: z.string().describe("A broader, more general question whose answer would also answer the original question"),
});

export type StepBackAgentOutput = z.infer<typeof StepBackAgentOutputZodSchema>;