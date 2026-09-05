import type { Requester } from "../../common/permissions/index.js";
import { createQuestion, updateQuestion, deleteQuestion, getQuestionById } from "../questions/question.service.js";
import { generateTopicQuestions } from "./agents/generation_agent.js";
import type {
    AddQuestionArgs,
    GenerateQuestionsArgs,
    RemoveQuestionArgs,
    UpdateQuestionTextArgs,
    UpdateQuestionOptionsArgs,
} from "./Types/outputQuestionReview.js";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export interface QuestionReviewResult {
    changeLog: string[];
}

// Operates directly on the real, already-saved exam — questions/options
// tables via the same service functions the manual question editor uses.
// There's no separate "generation session" state to keep in sync: every
// mutation here IS the final saved state, immediately.

export async function applyAddQuestion(args: AddQuestionArgs, requester: Requester): Promise<QuestionReviewResult> {
    if (args.type === "mcq") {
        if (!args.options || args.options.length !== 4 || !args.correct_option) {
            throw new Error("An MCQ question needs exactly 4 options and a correct_option.");
        }
    } else if (!args.rubric_categories || args.rubric_categories.length === 0) {
        throw new Error("A descriptive question needs rubric_categories.");
    }

    await createQuestion(
        {
            sectionId: args.section_id,
            blockId: args.block_id ?? undefined,
            type: args.type,
            description: args.question_text,
            marks: args.marks,
            options:
                args.type === "mcq"
                    ? args.options!.map((value, i) => ({ value, isCorrect: OPTION_LETTERS[i] === args.correct_option }))
                    : undefined,
            rubric: args.type === "descriptive" ? { categories: args.rubric_categories! } : undefined,
        } as any,
        requester
    );

    return { changeLog: [`Added a new ${args.type} question.`] };
}

// Delegates to the real generation agent (same one the initial batch used) —
// count is already capped 1-3 by the zod schema, so this can never turn into
// a bulk regeneration no matter what the teacher asks for.
export async function applyGenerateQuestions(args: GenerateQuestionsArgs, requester: Requester): Promise<QuestionReviewResult> {
    const output = await generateTopicQuestions({
        subject: args.subject,
        question_type: args.question_type,
        marks: args.marks,
        topic: args.topic,
        subtopics: [{ name: args.subtopic, count: args.count }],
        globalInstructions: args.instructions || [],
        topicInstructions: [],
    });

    for (const q of output.questions) {
        await createQuestion(
            {
                sectionId: args.section_id,
                blockId: args.block_id ?? undefined,
                type: q.type,
                description: q.question_text,
                marks: args.marks,
                options: q.type === "mcq" ? q.options.map((value, i) => ({ value, isCorrect: OPTION_LETTERS[i] === q.correct_option })) : undefined,
                rubric: q.type === "descriptive" ? q.rubric : undefined,
            } as any,
            requester
        );
    }

    return { changeLog: [`Generated ${output.questions.length} new question(s) for "${args.topic}" / "${args.subtopic}".`] };
}

export async function applyRemoveQuestion(args: RemoveQuestionArgs, requester: Requester): Promise<QuestionReviewResult> {
    await deleteQuestion(args.question_id, requester);
    return { changeLog: ["Removed a question."] };
}

export async function applyUpdateQuestionText(args: UpdateQuestionTextArgs, requester: Requester): Promise<QuestionReviewResult> {
    await updateQuestion(args.question_id, { description: args.question_text }, requester);
    return { changeLog: ["Updated the wording of a question."] };
}

export async function applyUpdateQuestionOptions(args: UpdateQuestionOptionsArgs, requester: Requester): Promise<QuestionReviewResult> {
    const existing = await getQuestionById(args.question_id, requester);
    if (existing.type !== "mcq") throw new Error("Only MCQ questions have options — this question is descriptive.");

    await updateQuestion(
        args.question_id,
        { options: args.options.map((value, i) => ({ value, isCorrect: OPTION_LETTERS[i] === args.correct_option })) },
        requester
    );
    return { changeLog: ["Updated the options for a question."] };
}
