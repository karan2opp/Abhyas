// src/module/exam/ai/planner/allocation.ts

import type {
    AllocationResult,
    GenerationTask,
    PlannedSubtopic,
    SectionQuestionGroup,
} from "./types.js";

function proportionalDistribution(
    total: number,
    weights: number[]
): number[] {

    const raw = weights.map(
        weight => (weight / weights.reduce((a, b) => a + b, 0)) * total
    );

    const allocated = raw.map(Math.floor);

    let remaining =
        total -
        allocated.reduce((a, b) => a + b, 0);

    const decimals = raw
        .map((value, index) => ({
            index,
            decimal: value - Math.floor(value),
        }))
        .sort((a, b) => b.decimal - a.decimal);

    let pointer = 0;

    while (remaining > 0) {

        const dec = decimals[pointer % (decimals.length || 1)];
        if (dec !== undefined && allocated[dec.index] !== undefined) {
            allocated[dec.index]!++;
        }

        pointer++;

        remaining--;
    }

    return allocated;
}

export function allocateGenerationTasks(
    examTitle: string,
    subject: string,
    subtopics: PlannedSubtopic[],
    groups: SectionQuestionGroup[],
    specialInstructions?: string
): AllocationResult {

    const tasks: GenerationTask[] = [];

    const weights =
        subtopics.map(
            s => s.questionCount
        );

    for (const group of groups) {

        const distribution =
            proportionalDistribution(
                group.numberOfQuestions,
                weights
            );

        subtopics.forEach((subtopic, index) => {

            const count =
                distribution[index] ?? 0;

            if (count === 0) return;

            tasks.push({

                id:
                    crypto.randomUUID(),

                examTitle,

                subject,

                section:
                    subtopic.section,

                subtopicId:
                    subtopic.id,

                subtopicName:
                    subtopic.name,

                description:
                    subtopic.description ?? null,

                difficulty:
                    subtopic.difficulty,

                questionType:
                    group.questionType,

                questionCount:
                    count,

                marksPerQuestion:
                    group.marksPerQuestion,

                ...(specialInstructions ? { specialInstructions } : {}),
            });

        });
    }

    return {

        tasks,

        totalQuestions:
            tasks.reduce(
                (sum, task) =>
                    sum +
                    task.questionCount,
                0
            ),
    };
}