import type { ISection } from "./Types/inputExam.js";
import type { SectionOutput } from "./Types/outputSubtopics.js";

interface Weightable {
    weight: number;
}

type QuestionAllocation<T> = T & {
    allocatedQuestions: number;
};

export function distributeQuestions<T extends Weightable>(
    values: T[],
    totalQuestions: number
): QuestionAllocation<T>[] {

    if (values.length === 0) {
        return [];
    }

    const totalWeight = values.reduce(
        (sum, value) => sum + value.weight,
        0
    );

    if (totalWeight <= 0) {
        throw new Error("Total weight must be greater than zero.");
    }

    const allocations = values.map((value, index) => {

        const exactQuestions =
            (value.weight / totalWeight) * totalQuestions;

        return {

            index,

            value,

            allocatedQuestions: Math.floor(exactQuestions),

            remainder:
                exactQuestions -
                Math.floor(exactQuestions)

        };

    });

    let remainingQuestions =
        totalQuestions -
        allocations.reduce(
            (sum, allocation) =>
                sum + allocation.allocatedQuestions,
            0
        );

    allocations.sort((a, b) => {

        if (b.remainder !== a.remainder) {
            return b.remainder - a.remainder;
        }

        // Tie breaker
        return b.value.weight - a.value.weight;

    });

    for (let i = 0; i < remainingQuestions; i++) {
        allocations[i]!.allocatedQuestions++;
    }

    allocations.sort((a, b) => a.index - b.index);

    return allocations.map(allocation => ({
        ...allocation.value,
        allocatedQuestions:
            allocation.allocatedQuestions
    }));
}

/**
 * Distribute questions across subtopics guaranteeing every subtopic gets at
 * least one question when there are enough questions. When there are more
 * subtopics than questions, keep only the highest-weight subtopics so no
 * planned subtopic is silently dropped to zero.
 */
export function distributeQuestionsAtLeastOne<T extends Weightable>(
    values: T[],
    totalQuestions: number
): QuestionAllocation<T>[] {
    if (values.length === 0 || totalQuestions <= 0) {
        return [];
    }

    if (values.length > totalQuestions) {
        // Not enough questions for every subtopic — keep the top ones by weight.
        return values
            .map((value, index) => ({ value, index }))
            .sort((a, b) => b.value.weight - a.value.weight)
            .slice(0, totalQuestions)
            .map(({ value }) => ({ ...value, allocatedQuestions: 1 }));
    }

    // Give each subtopic 1, then distribute the remainder by weight.
    const counts = values.map(() => 1);
    let remaining = totalQuestions - values.length;
    const totalWeight = values.reduce((sum, v) => sum + v.weight, 0) || values.length;

    const exact = values.map((v) => (v.weight / totalWeight) * remaining);
    const floors = exact.map(Math.floor);
    let used = floors.reduce((s, f) => s + f, 0);
    const order = exact.map((e, i) => ({ i, r: e - (floors[i] ?? 0) })).sort((a, b) => b.r - a.r);
    let k = 0;
    while (used < remaining) {
        counts[order[k % order.length]!.i]!++;
        used++;
        k++;
    }

    return values.map((value, i) => ({ ...value, allocatedQuestions: counts[i]! }));
}

// Distribute a block's question_count across its topics and each topic's
// subtopics. Subject/instructions/question_type come from the block.
export function allocateSectionQuestions(
    inputSections: ISection[],
    agentSectionsOutput: SectionOutput[]
) {
    return agentSectionsOutput.map((secOutput, idx) => {
        // Match by normalized section name, falling back to position.
        const normalizedName = secOutput.name.trim().toLowerCase();
        const inputSec =
            inputSections.find(s => s.name.trim().toLowerCase() === normalizedName)
            ?? inputSections[idx];

        const inputBlocks = inputSec?.blocks || [];

        const blocks = secOutput.blocks.map((blockOutput, bIdx) => {
            const normalizedBlockName = blockOutput.name.trim().toLowerCase();
            const inputBlock =
                inputBlocks.find(b => b.name.trim().toLowerCase() === normalizedBlockName)
                ?? inputBlocks[bIdx];

            const totalQuestions = inputBlock ? inputBlock.question_count : 0;
            const questionType = inputBlock ? inputBlock.question_type : "mcq";
            const totalMarks = inputBlock ? inputBlock.total_marks : 0;

            // Distribute questions to topics in this block
            const topicsWithAllocations = distributeQuestions(blockOutput.topics, totalQuestions);

            // Distribute questions to subtopics for each topic (min 1 per subtopic)
            const topics = topicsWithAllocations.map((topic) => {
                const subtopics = distributeQuestionsAtLeastOne(topic.subtopics, topic.allocatedQuestions);
                return {
                    ...topic,
                    subtopics
                };
            });

            return {
                name: blockOutput.name,
                subject: blockOutput.subject,
                instructions: blockOutput.instructions || [],
                question_type: questionType,
                total_marks: totalMarks,
                topics
            };
        });

        return {
            name: secOutput.name,
            blocks
        };
    });
}
