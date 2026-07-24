import type { GenerationResult } from "./generator.js";
import type { QuestionType } from "../planner/types.js";

/**
 * ==========================================================
 * Final Exam Interfaces
 * ==========================================================
 */

export interface FormattedOption {
    value: string;
    isCorrect: boolean;
}

export interface FormattedQuestion {
    type: QuestionType;
    description: string;
    marks: number;
    options?: FormattedOption[];
}

export interface FormattedSection {
    title: string;
    questions: FormattedQuestion[];
}

export interface FormattedExam {
    title: string;
    description: string;
    duration: number;
    examType: string;
    totalMarks: number;
    sections: FormattedSection[];
}

export interface ExamMetadata {
    title: string;
    subject: string;
    description: string;
    duration: number;
    examType: string;
}

/**
 * ==========================================================
 * Format Single Question
 * ==========================================================
 */

function formatQuestion(
    result: GenerationResult,
    question: GenerationResult["output"]["questions"][number]
): FormattedQuestion {

    if (question.type === "mcq") {

        const options = question.options.map((option: any) => ({
            value: option.text,
            isCorrect: option.id === question.correctOptionId,
        }));

        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = options[i];
            options[i] = options[j] as any;
            options[j] = temp as any;
        }

        return {

            type: result.task.questionType,

            description: question.questionText,

            marks: result.task.marksPerQuestion,

            options,

        };

    }

    return {

        type: result.task.questionType,

        description: question.questionText,

        marks: result.task.marksPerQuestion,

    };

}

/**
 * ==========================================================
 * Format Complete Exam
 * ==========================================================
 */

export function formatExam(
    metadata: ExamMetadata,
    generationResults: GenerationResult[]
): FormattedExam {

    const sectionMap = new Map<string, FormattedSection>();

    let totalMarks = 0;

    for (const result of generationResults) {

        const sectionName = result.task.section;

        if (!sectionMap.has(sectionName)) {

            sectionMap.set(sectionName, {

                title: sectionName,

                questions: [],

            });

        }

        const section = sectionMap.get(sectionName)!;

        for (const question of result.output.questions) {

            section.questions.push(

                formatQuestion(
                    result,
                    question
                )

            );

            totalMarks += result.task.marksPerQuestion;

        }

    }

    return {

        title: metadata.title,

        description: metadata.description,

        duration: metadata.duration,

        examType: metadata.examType,

        totalMarks,

        sections: Array.from(sectionMap.values()),

    };

}