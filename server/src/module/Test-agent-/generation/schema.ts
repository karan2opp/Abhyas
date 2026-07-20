import { z } from "zod";

const QuestionOptionSchema = z.object({
    id: z.string().describe("e.g. 'A', 'B', 'C', 'D'"),
    text: z.string(),
});

const GeneratedQuestionSchema = z.object({
    id: z.string().describe("stable unique id, e.g. 'q_001'"),
    subtopicId: z.string().describe("which subtopic this question belongs to"),
    section: z.string().describe("exam section this question belongs to"),
    questionText: z.string(),
    options: z.array(QuestionOptionSchema).min(2),
    correctOptionId: z.string().describe("must match one of the option ids above"),
    marks: z.number().positive(),
});

export const GenerationOutputSchema = z.object({
    examTitle: z.string(),
    subject: z.string(),
    questions: z.array(GeneratedQuestionSchema).min(1),
});

export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export type GenerationOutput = z.infer<typeof GenerationOutputSchema>;
