import type { Requester } from "../../common/permissions/index.js";
import { createQuestion, updateQuestion, deleteQuestion, getQuestionById } from "../questions/question.service.js";
import { generateTopicQuestions } from "./agents/generation_agent.js";
import { assertMcqAnswersAreCorrect, type McqToVerify } from "./question_review_verification.js";
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
//
// Every path that can produce or change an MCQ's options runs them through
// assertMcqAnswersAreCorrect before persisting. That call throws (rather
// than returning a pass/fail) if anything is wrong, so it can just be
// awaited inline — a failure surfaces as this whole apply* function
// throwing, which the agent sees as a tool error and can act on in the
// same turn, exactly like the structural checks below it.

export async function applyAddQuestion(args: AddQuestionArgs, requester: Requester): Promise<QuestionReviewResult> {
    if (args.type === "mcq") {
        if (!args.options || args.options.length !== 4 || !args.correct_option) {
            throw new Error("An MCQ question needs exactly 4 options and a correct_option.");
        }
        await assertMcqAnswersAreCorrect([
            {
                questionText: args.question_text,
                contentBlocks: args.content_blocks,
                options: args.options.map((opt, i) => ({ label: OPTION_LETTERS[i]!, text: opt.text })),
                claimedCorrectOption: args.correct_option,
            },
        ]);
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
            contentBlocks: args.content_blocks,
            options:
                args.type === "mcq"
                    ? args.options!.map((opt, i) => ({ value: opt.text, isCode: opt.isCode, isCorrect: OPTION_LETTERS[i] === args.correct_option }))
                    : undefined,
            rubric: args.type === "descriptive" ? { categories: args.rubric_categories! } : undefined,
        } as any,
        requester
    );

    // Only removed once the new question is confirmed created (and, for
    // MCQ, already passed the check above) — a "replace" can never leave
    // the exam with both the old and new version, or with neither.
    if (args.replaces_question_id) {
        await deleteQuestion(args.replaces_question_id, requester);
        return { changeLog: [`Replaced a question with a new ${args.type} question.`] };
    }

    return { changeLog: [`Added a new ${args.type} question.`] };
}

// Delegates to the real generation agent (same one the initial batch used) —
// count is already capped 1-3 by the zod schema, so this can never turn into
// a bulk regeneration no matter what the teacher asks for.
export async function applyGenerateQuestions(args: GenerateQuestionsArgs, requester: Requester): Promise<QuestionReviewResult> {
    if (args.replaces_question_id && args.count !== 1) {
        throw new Error("replaces_question_id only makes sense with count 1 — replacing one question with several has no single target. Generate the replacement alone first, then handle any extra questions as a separate addition.");
    }

    const output = await generateTopicQuestions({
        subject: args.subject,
        question_type: args.question_type,
        marks: args.marks,
        topic: args.topic,
        subtopics: [{ name: args.subtopic, count: args.count }],
        globalInstructions: args.instructions || [],
        topicInstructions: [],
    });

    // One batched check for every MCQ this call produced, rather than one
    // API call per question — generate_questions alone can return up to 3.
    const mcqChecks: McqToVerify[] = output.questions
        .filter((q) => q.type === "mcq")
        .map((q) => ({
            questionText: q.question_text,
            contentBlocks: q.content_blocks,
            options: q.options.map((opt, i) => ({ label: OPTION_LETTERS[i]!, text: opt.text })),
            claimedCorrectOption: q.correct_option,
        }));
    await assertMcqAnswersAreCorrect(mcqChecks);

    for (const q of output.questions) {
        await createQuestion(
            {
                sectionId: args.section_id,
                blockId: args.block_id ?? undefined,
                type: q.type,
                description: q.question_text,
                marks: args.marks,
                contentBlocks: q.content_blocks,
                options: q.type === "mcq"
                    ? q.options.map((opt, i) => ({ value: opt.text, isCode: opt.isCode, isCorrect: OPTION_LETTERS[i] === q.correct_option }))
                    : undefined,
                rubric: q.type === "descriptive" ? q.rubric : undefined,
            } as any,
            requester
        );
    }

    // Same atomicity guarantee as applyAddQuestion: the old question is only
    // removed after every new one is confirmed created and verified.
    if (args.replaces_question_id) {
        await deleteQuestion(args.replaces_question_id, requester);
        return { changeLog: [`Replaced a question with a new AI-generated question for "${args.topic}" / "${args.subtopic}".`] };
    }

    return { changeLog: [`Generated ${output.questions.length} new question(s) for "${args.topic}" / "${args.subtopic}".`] };
}

export async function applyRemoveQuestion(args: RemoveQuestionArgs, requester: Requester): Promise<QuestionReviewResult> {
    await deleteQuestion(args.question_id, requester);
    return { changeLog: ["Removed a question."] };
}

export async function applyUpdateQuestionText(args: UpdateQuestionTextArgs, requester: Requester): Promise<QuestionReviewResult> {
    const changingContent = args.content_blocks !== null;

    if (changingContent) {
        const existing = await getQuestionById(args.question_id, requester);

        // The bug this guards against: content_blocks changes (a new code
        // snippet, a new scenario) while the OLD options or rubric — written
        // for the OLD content — are silently left in place. Require the
        // matching half of the question to be resupplied in the same call
        // rather than trusting a separate, later call to remember to do it.
        if (existing.type === "mcq") {
            if (!args.options || args.options.length !== 4 || !args.correct_option) {
                throw new Error(
                    "Changing this question's content_blocks requires also providing the matching 4 options and correct_option in the same call — the old options were written for the old content and almost certainly don't apply to the new one."
                );
            }
            await assertMcqAnswersAreCorrect([
                {
                    questionText: args.question_text,
                    contentBlocks: args.content_blocks!,
                    options: args.options.map((opt, i) => ({ label: OPTION_LETTERS[i]!, text: opt.text })),
                    claimedCorrectOption: args.correct_option,
                },
            ]);
        } else if (existing.type === "descriptive") {
            if (!args.rubric_categories || args.rubric_categories.length === 0) {
                throw new Error(
                    "Changing this question's content_blocks requires also providing a matching rubric_categories in the same call — the old rubric was written for the old content and may no longer fit."
                );
            }
        }
    }

    await updateQuestion(
        args.question_id,
        {
            description: args.question_text,
            ...(changingContent && { contentBlocks: args.content_blocks }),
            ...(args.options && {
                options: args.options.map((opt, i) => ({ value: opt.text, isCode: opt.isCode, isCorrect: OPTION_LETTERS[i] === args.correct_option })),
            }),
            ...(args.rubric_categories && { rubric: { categories: args.rubric_categories } }),
        } as any,
        requester
    );

    const changed = changingContent ? "wording and content" : "wording";
    return { changeLog: [`Updated the ${changed} of a question.`] };
}

export async function applyUpdateQuestionOptions(args: UpdateQuestionOptionsArgs, requester: Requester): Promise<QuestionReviewResult> {
    const existing = await getQuestionById(args.question_id, requester);
    if (existing.type !== "mcq") throw new Error("Only MCQ questions have options — this question is descriptive.");

    await assertMcqAnswersAreCorrect([
        {
            questionText: existing.description,
            contentBlocks: existing.contentBlocks,
            options: args.options.map((opt, i) => ({ label: OPTION_LETTERS[i]!, text: opt.text })),
            claimedCorrectOption: args.correct_option,
        },
    ]);

    await updateQuestion(
        args.question_id,
        { options: args.options.map((opt, i) => ({ value: opt.text, isCode: opt.isCode, isCorrect: OPTION_LETTERS[i] === args.correct_option })) as any },
        requester
    );
    return { changeLog: ["Updated the options for a question."] };
}
