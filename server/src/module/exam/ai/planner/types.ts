// src/module/exam/ai/planner/types.ts

export type Difficulty = "easy" | "medium" | "hard";

export type QuestionType = "mcq" | "subjective";

/**
 * Returned by the Subtopic Planner Agent
 */
export interface PlannedSubtopic {
    id: string;

    subject: string;

    section: string;

    name: string;

    description?: string | null;

    difficulty: Difficulty;

    questionCount: number;
}

/**
 * Frontend configuration
 */
export interface SectionQuestionGroup {
    questionType: QuestionType;

    numberOfQuestions: number;

    marksPerQuestion: number;
}

/**
 * One AI generation task.
 *
 * Example:
 * Generate 3 MCQs for Arrays.
 */
export interface GenerationTask {

    id: string;

    examTitle: string;

    subject: string;

    section: string;

    subtopicId: string;

    subtopicName: string;

    description?: string | null;

    difficulty: Difficulty;

    questionType: QuestionType;

    questionCount: number;

    marksPerQuestion: number;

    specialInstructions?: string;
}

/**
 * Allocation result
 */
export interface AllocationResult {

    tasks: GenerationTask[];

    totalQuestions: number;
}