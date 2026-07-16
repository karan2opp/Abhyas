// src/module/exam/ai/question/executor.ts

import pLimit from "p-limit";

import type {
    GenerationTask,
} from "../planner/types.js";

import type {
    GenerationResult,
    GeneratorConfig,
} from "./generator.js";

import {
    generateQuestions,
} from "./generator.js";

/**
 * Executor configuration.
 */
export interface ExecutorConfig extends GeneratorConfig {
    /**
     * Maximum number of concurrent OpenAI requests.
     */
    concurrency?: number;
}

/**
 * Failed generation information.
 */
export interface FailedGeneration {
    task: GenerationTask;
    error: unknown;
}

/**
 * Batch execution result.
 */
export interface ExecutorResult {
    results: GenerationResult[];

    failures: FailedGeneration[];

    totalTasks: number;

    successCount: number;

    failedCount: number;

    totalDurationMs: number;
}

const DEFAULT_CONCURRENCY = 5;

/**
 * Executes all generation tasks.
 *
 * This is the only place responsible for:
 *
 * • Concurrency
 * • Logging
 * • Error collection
 * • Batch statistics
 *
 * Validation & Repair will be added later.
 */
export async function executeGenerationTasks(
    tasks: GenerationTask[],
    config: ExecutorConfig
): Promise<ExecutorResult> {

    const startedAt = Date.now();

    const limit = pLimit(
        config.concurrency ?? DEFAULT_CONCURRENCY
    );

    const settled = await Promise.allSettled(

        tasks.map(task =>

            limit(async () => {

                console.info(
                    `[Generator] ${task.subtopicName} | ${task.questionType} | ${task.questionCount}`
                );

                return generateQuestions(
                    task,
                    config
                );

            })

        )

    );

    const results: GenerationResult[] = [];

    const failures: FailedGeneration[] = [];

    settled.forEach((item, index) => {

        if (item.status === "fulfilled") {

            results.push(item.value);

        } else {

            failures.push({

                task: tasks[index]!,

                error: item.reason,

            });

        }

    });

    return {

        results,

        failures,

        totalTasks: tasks.length,

        successCount: results.length,

        failedCount: failures.length,

        totalDurationMs:
            Date.now() - startedAt,

    };

}