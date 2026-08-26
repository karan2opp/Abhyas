import { z } from "zod";

export const SubjectMatchAgentOutputZodSchema = z.object({
    matchedSubject: z.string().nullable().describe("The single most related available subject, or null if none of the available subjects are meaningfully related to the user's subject"),
    reason: z.string().describe("Short explanation for the match decision"),
});

export type SubjectMatchAgentOutput = z.infer<typeof SubjectMatchAgentOutputZodSchema>;