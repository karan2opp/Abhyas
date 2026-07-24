// src/module/exam/ai/question/repair.ts

import { Agent, run } from "@openai/agents";
import { z } from "zod";

import { buildPrompt } from "./prompt.js";

import {
    getPromptExample,
    logPromptSource,
} from "./example.js";

import type {
    GeneratedQuestion,
} from "./schema.js";
import { GeneratedQuestionSchema } from "./schema.js";

import type {
    ValidationIssue,
} from "./validator.js";

/* ==========================================================
 * Types
 * ========================================================== */

export interface RepairConfig {
    orgId: string;
    examType: string;
}

export interface RepairResult {

    repairedQuestion: GeneratedQuestion;

    durationMs: number;

}

/* ==========================================================
 * Public API
 * ========================================================== */

export async function repairQuestion(
    issue: ValidationIssue,
    config: RepairConfig
): Promise<RepairResult> {

    if (!issue.task) {
        throw new Error(
            "ValidationIssue.task is required for repair."
        );
    }

    if (!issue.question) {
        throw new Error(
            "ValidationIssue.question is required for repair."
        );
    }

    const startedAt = Date.now();

    const {
        example,
        source,
    } = await getPromptExample(
        config.orgId,
        config.examType,
        issue.task.subject
    );

    logPromptSource(
        issue.task.subject,
        source
    );

    const prompt = buildPrompt({

        questionType:
            issue.task.questionType,

        example: JSON.stringify(
            example,
            null,
            2
        ),

    });

    const agent = new Agent({

        name: `Question Repair Agent - ${issue.task.id}`,

        model: "gpt-4o-mini",

        instructions: `${prompt}

------------------------------------------------------

REPAIR MODE

You are repairing ONE generated question.

Do NOT generate a different topic.

Do NOT change:

- Section
- Subtopic
- Difficulty
- Question Type

Only repair the validation issue.

Return ONLY ONE repaired question.

`,

        outputType: z.object({ repairedQuestion: GeneratedQuestionSchema }) as any,

    });

    const input = [

        {

            role: "user" as const,

            content: [

                {

                    type: "input_text" as const,

                    text: `
Repair Attempt:
${issue.attempt ?? 0}

Validation Code:
${issue.code}

Validation Message:
${issue.message}

Expected:
${JSON.stringify(issue.expected)}

Actual:
${JSON.stringify(issue.actual)}

Generation Task:
${JSON.stringify(issue.task, null, 2)}

Invalid Question:
${JSON.stringify(issue.question, null, 2)}
`,

                },

            ],

        },

    ];

    const result = await run(
        agent,
        input
    );

    return {

        repairedQuestion:
            (result.finalOutput as any).repairedQuestion as GeneratedQuestion,

        durationMs:
            Date.now() - startedAt,

    };

}