import { z } from "zod";

export const QueryRouterOutputZodSchema = z.object({
    useRag: z.boolean().describe("Whether answering this question needs retrieval from the organisation's knowledge base"),
    reason: z.string().describe("Short explanation for the routing decision"),
});

export type QueryRouterOutput = z.infer<typeof QueryRouterOutputZodSchema>;