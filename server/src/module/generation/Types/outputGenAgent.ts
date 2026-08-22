import { z } from "zod";

// Base fields that every question must have
const baseQuestionFields = {
    topic: z.string().describe("The topic this question belongs to (e.g. 'Variables')"),
    subtopic: z.string().describe("The subtopic this question belongs to (e.g. 'Variable Scope')"),
};

// MCQ Structure (requires 4 options and correct answer)
const MCQQuestionSchema = z.object({
    ...baseQuestionFields,
    type: z.literal("mcq"),
    question_text: z.string().describe("The text of the multiple choice question"),
    options: z.array(z.string()).min(4).max(4).describe("Exactly 4 multiple-choice options"),
    correct_option: z.enum(["A", "B", "C", "D"]).describe("The correct option key (A, B, C, or D)"),
});

const RubricCategorySchema = z.object({
    name: z.string().describe("The name of the category (e.g. Definition, Concept Knowledge, Example, Correct Application, Depth of Reasoning, etc.)"),
    weight: z.number().describe("The weight of this category (float between 0 and 1)"),
    key_points: z.array(z.string()).describe("List of key points expected for this category"),
});

const RubricSchema = z.object({
    categories: z.array(RubricCategorySchema).describe("List of grading categories for this question"),
});

// Descriptive Structure (requires question text, marks, and rubric)
const DescriptiveQuestionSchema = z.object({
    ...baseQuestionFields,
    type: z.literal("descriptive"),
    question_text: z.string().describe("The text of the descriptive question"),
    marks: z.number().describe("The marks assigned to this question"),
    rubric: RubricSchema.describe("The grading rubric for this question"),
});

// Discriminated Union
const GeneratedQuestionSchema = z.discriminatedUnion("type", [
    MCQQuestionSchema,
    DescriptiveQuestionSchema
]);

// Final output of the batch generation agent
export const BatchGenerationAgentOutputSchema = z.object({
    questions: z.array(GeneratedQuestionSchema).describe("List of all questions generated for this batch")
});

export type BatchGenerationAgentOutput = z.infer<typeof BatchGenerationAgentOutputSchema>;
