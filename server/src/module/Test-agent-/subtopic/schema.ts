import { z } from "zod";

const SubtopicSchema = z.object({
    id: z.string().describe("stable unique id, e.g. 'subtopic_001'"),

    name: z.string().describe("e.g. 'Newton's second law'"),

    section: z.string().describe("parent section/chapter this belongs to"),

    description: z
        .string()
        .nullable()
        .describe("brief scope note for the generation agent"),

    questionCount: z
        .number()
        .int()
        .positive()
        .describe("how many questions to generate for this subtopic"),

    difficulty: z
        .enum(["easy", "medium", "hard"])
        .describe("inherited or overridden from session config"),
});

export const SubtopicOutputSchema = z.object({
    subject: z.string(),

    subtopics: z.array(SubtopicSchema).min(1),
});

/**
 * ---------------------------------------------------------
 * Types
 * ---------------------------------------------------------
 */

export type PlannedSubtopic = z.infer<typeof SubtopicSchema>;

export type SubtopicOutput = z.infer<typeof SubtopicOutputSchema>;