// src/module/exam/ai/question/validator.ts

import type { GenerationTask } from "../planner/types.js";
import type { GeneratedQuestion, MCQQuestion } from "./schema.js";
import type { GenerationResult } from "./generator.js";

export interface ValidationIssue {
    task?: GenerationTask;
    question?: GeneratedQuestion;
    attempt?: number;
    code: string;
    message: string;
    expected: any;
    actual: any;
}

export interface ValidationOutput {
    isValid: boolean;
    issues: ValidationIssue[];
}

export function validateQuestion(question: GeneratedQuestion, task: GenerationTask): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (question.subtopicId !== task.subtopicId) {
        issues.push({
            task,
            question,
            code: "SUBTOPIC_MISMATCH",
            message: `Expected subtopicId ${task.subtopicId}, got ${question.subtopicId}`,
            expected: task.subtopicId,
            actual: question.subtopicId,
        });
    }

    if (question.section !== task.section) {
        issues.push({
            task,
            question,
            code: "SECTION_MISMATCH",
            message: `Expected section ${task.section}, got ${question.section}`,
            expected: task.section,
            actual: question.section,
        });
    }

    if (task.questionType === "mcq") {
        if (question.type !== "mcq") {
            issues.push({
                task,
                question,
                code: "TYPE_MISMATCH",
                message: `Expected type mcq, got ${question.type}`,
                expected: "mcq",
                actual: question.type,
            });
        } else {
            const mcq = question as MCQQuestion;
            if (mcq.options.length !== 4) {
                issues.push({
                    task,
                    question,
                    code: "OPTIONS_COUNT",
                    message: `Expected 4 options, got ${mcq.options.length}`,
                    expected: 4,
                    actual: mcq.options.length,
                });
            }
            if (!["A", "B", "C", "D"].includes(mcq.correctOptionId)) {
                issues.push({
                    task,
                    question,
                    code: "INVALID_CORRECT_OPTION",
                    message: `Invalid correct option ${mcq.correctOptionId}`,
                    expected: ["A", "B", "C", "D"],
                    actual: mcq.correctOptionId,
                });
            }
        }
    } else if (task.questionType === "subjective") {
        if (question.type !== "subjective") {
            issues.push({
                task,
                question,
                code: "TYPE_MISMATCH",
                message: `Expected type subjective, got ${question.type}`,
                expected: "subjective",
                actual: question.type,
            });
        }
    }

    return issues;
}

export function validateGenerationResults(results: GenerationResult[]): ValidationOutput {
    const issues: ValidationIssue[] = [];

    for (const result of results) {
        const { task, output } = result;

        if (output.questions.length !== task.questionCount) {
            issues.push({
                task,
                code: "COUNT_MISMATCH",
                message: `Expected ${task.questionCount} questions, got ${output.questions.length}`,
                expected: task.questionCount,
                actual: output.questions.length,
            });
        }

        for (const question of output.questions) {
            const qIssues = validateQuestion(question, task);
            issues.push(...qIssues);
        }
    }

    return {
        isValid: issues.length === 0,
        issues,
    };
}
