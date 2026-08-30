import { z } from "zod";

export const RerankOutputZodSchema = z.object({
    scores: z.array(z.number().min(0).max(10)).describe("A relevance score (0-10) for each candidate, in the same order they were provided"),
});

export type RerankOutput = z.infer<typeof RerankOutputZodSchema>;