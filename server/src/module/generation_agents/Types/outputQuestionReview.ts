import { z } from "zod";

const RubricCategoryInputZodSchema = z.object({
    name: z.string(),
    weight: z.number(),
    key_points: z.array(z.string()),
});

// Operates on the REAL saved exam (questions/options tables), addressed by
// real section/block/question ids — not the generation pipeline's session
// JSON. section_id/block_id come from the current exam structure given to
// the agent as context; question_id comes from the current question list.

// Manual: the teacher dictates the exact question — no LLM call, just record
// it. Exactly one of (options + correct_option) or (rubric_categories) must
// be provided depending on `type`; the other pair is null.
export const AddQuestionArgsZodSchema = z.object({
    section_id: z.string().describe("The id of the exam section this question belongs to"),
    block_id: z.string().nullable().describe("The id of the block this question belongs to, if the section has blocks — null otherwise"),
    type: z.enum(["mcq", "descriptive"]),
    question_text: z.string().describe("The exact question text, as dictated by the teacher"),
    marks: z.number().min(0.5).describe("Marks for this question"),
    options: z.array(z.string()).nullable().describe("Exactly 4 options — required (non-null) when type is mcq, null when descriptive"),
    correct_option: z.enum(["A", "B", "C", "D"]).nullable().describe("Required (non-null) when type is mcq, null when descriptive"),
    rubric_categories: z
        .array(RubricCategoryInputZodSchema)
        .nullable()
        .describe("Required (non-null) when type is descriptive, null when mcq"),
});

// AI-generated: hard-capped at 3 per call so one request never turns into a
// bulk regeneration — the teacher can always ask again for more.
export const GenerateQuestionsArgsZodSchema = z.object({
    section_id: z.string().describe("The id of the exam section to generate into"),
    block_id: z.string().nullable().describe("The id of the block to generate into, if the section has blocks — null otherwise"),
    subject: z.string().describe("The subject to write the question(s) in (e.g. JavaScript)"),
    question_type: z.enum(["mcq", "descriptive"]),
    topic: z.string().describe("The topic these questions are about"),
    subtopic: z.string().describe("The specific subtopic to generate new question(s) for"),
    marks: z.number().min(0.5).describe("Marks for each generated question"),
    count: z.number().int().min(1).max(3).describe("How many new questions to generate — 1 to 3 at a time, never more"),
    instructions: z.array(z.string()).nullable().describe("Extra guidance for these specific questions (e.g. \"make them harder\"), or null"),
});

export const RemoveQuestionArgsZodSchema = z.object({
    question_id: z.string().describe("The id of the question to remove, from the current question list"),
});

export const UpdateQuestionTextArgsZodSchema = z.object({
    question_id: z.string().describe("The id of the question to reword"),
    question_text: z.string().describe("The new question text"),
});

export const UpdateQuestionOptionsArgsZodSchema = z.object({
    question_id: z.string().describe("The id of the MCQ question to change — must already be type mcq"),
    options: z.array(z.string()).min(4).max(4).describe("The new set of exactly 4 options"),
    correct_option: z.enum(["A", "B", "C", "D"]).describe("The correct option key among the new options"),
});

export type AddQuestionArgs = z.infer<typeof AddQuestionArgsZodSchema>;
export type GenerateQuestionsArgs = z.infer<typeof GenerateQuestionsArgsZodSchema>;
export type RemoveQuestionArgs = z.infer<typeof RemoveQuestionArgsZodSchema>;
export type UpdateQuestionTextArgs = z.infer<typeof UpdateQuestionTextArgsZodSchema>;
export type UpdateQuestionOptionsArgs = z.infer<typeof UpdateQuestionOptionsArgsZodSchema>;
