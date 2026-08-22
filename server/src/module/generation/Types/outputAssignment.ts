import { z } from "zod";

const baseFields = {
    topic: z.string().describe("The topic this question belongs to"),
};

const MCQAssignmentQuestionSchema = z.object({
    ...baseFields,
    type: z.literal("mcq"),
    question_text: z.string().describe("The text of the multiple choice question"),
    options: z.array(z.string()).min(4).max(4).describe("Exactly 4 multiple-choice options"),
    correct_option: z.enum(["A", "B", "C", "D"]).describe("The correct option key (A, B, C, or D)"),
});

const DescriptiveAssignmentQuestionSchema = z.object({
    ...baseFields,
    type: z.literal("descriptive"),
    question_text: z.string().describe("The text of the descriptive question"),
});

export const GeneratedAssignmentQuestionSchema = z.discriminatedUnion("type", [
    MCQAssignmentQuestionSchema,
    DescriptiveAssignmentQuestionSchema
]);

export const BatchAssignmentAgentOutputSchema = z.object({
    questions: z.array(GeneratedAssignmentQuestionSchema).describe("List of generated assignment questions"),
});

export const SingleQuestionAssignmentOutputSchema = z.object({
    question: GeneratedAssignmentQuestionSchema.describe("The generated single assignment question")
});

export type AssignmentQuestion = z.infer<typeof GeneratedAssignmentQuestionSchema>;
export type BatchAssignmentAgentOutput = z.infer<typeof BatchAssignmentAgentOutputSchema>;
export type SingleQuestionAssignmentOutput = z.infer<typeof SingleQuestionAssignmentOutputSchema>;
