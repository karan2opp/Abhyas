// src/module/exam/ai/question/generator.ts

import { Agent, run } from "@openai/agents";

import { buildPrompt } from "./prompt.js";
import {
    getPromptExample,
    logPromptSource,
} from "./example.js";

import type {
    GenerationOutput,
} from "./schema.js";
import { GenerationOutputSchema } from "./schema.js";

import type {
    GenerationTask,
} from "../planner/types.js";

export interface GeneratorConfig {
    orgId: string;
    examType: string;
}

export interface GenerationResult {
    task: GenerationTask;
    output: GenerationOutput;
    durationMs: number;
}

export async function generateQuestions(
    task: GenerationTask,
    config: GeneratorConfig
): Promise<GenerationResult> {

    const start = Date.now();

    const {
        example,
        source,
    } = await getPromptExample(
        config.orgId,
        config.examType,
        task.subject
    );

    logPromptSource(
        task.subject,
        source
    );

    const instructions = buildPrompt({
        questionType: task.questionType,
        example: JSON.stringify(
            example,
            null,
            2
        ),
    });

    const agent = new Agent({
        name: `${task.questionType.toUpperCase()} Generator`,
        model: "gpt-4o-mini",
        instructions,
        outputType: GenerationOutputSchema,
    });

    const input = [
        {
            role: "user" as const,
            content: [
                {
                    type: "input_text" as const,
                    text: `
Generate exactly ${task.questionCount} ${task.questionType} question(s).

Exam Title:
${task.examTitle}

Subject:
${task.subject}

Section:
${task.section}

Subtopic:
${task.subtopicName}

Subtopic Id:
${task.subtopicId}

Difficulty:
${task.difficulty}

Special Instructions:
${task.specialInstructions ?? "None"}

Requirements:

- Return exactly ${task.questionCount} questions.
- The CONTENT of your questions MUST strictly be about subtopic "${task.subtopicName}" (Id: "${task.subtopicId}").
- If Special Instructions contain examples from other topics, extract ONLY the format, style, or difficulty. Do NOT copy their content or switch topics.
- Every question must belong to section "${task.section}".
- Never generate duplicate questions.
`,
                },
            ],
        },
    ];

    const result = await run(
        agent,
        input
    );

    const end = Date.now();

    return {
        task,
        output: result.finalOutput as GenerationOutput,
        durationMs: end - start,
    };
}