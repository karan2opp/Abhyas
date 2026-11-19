import { eq, and, isNull, desc, or, ne, ilike, gte, count, inArray } from "drizzle-orm";
import db from "../../common/db/index.js";
import { submissions, examRegistrations, exams, answers, options, questions, sections, users, classroomStudents, groupStudents, classrooms, classroomTeachers } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { isBlankAnswer, type TextAnswer, type ResponseMode, type EvaluationOutcome } from "../evalutaion/evalutaion.js";
import { gradeAnswers, type GradeSummary } from "../evalutaion/grading.js";
import type { GradeExamSubmissionDto, EvaluateWithAiDto } from "./dto/submission.dto.js";
import { enqueueEvaluation } from "../../common/queue/queues.js";
import { bindUsageContext } from "../../common/agent/usage_context.js";
import { examUsageContext } from "../ai_usage/ai_usage.service.js";
import { assertQuota } from "../billing/usage.service.js";
import { alreadyCheckedGate, organisationGradeGate } from "../billing/grading_gate.js";

type Requester = { id: string; role: string; organisationId: string | null };

// ── Resolve the organisation that owns a submission (submission → exam → classroom) ─
const getOrganisationIdForSubmission = async (submissionId: string): Promise<string | null> => {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId));
    if (!submission) return null;
    const [exam] = await db.select().from(exams).where(eq(exams.id, submission.examId));
    if (!exam?.classroomId) return null;
    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, exam.classroomId));
    return classroom?.organisationId ?? null;
};

// ── Whether a teacher (co-teacher of the exam's classroom, or its creator) or a
// manager (whose org owns the exam's classroom) has staff-level access to an exam ─
const hasStaffAccessToExam = async (requester: Requester, exam: typeof exams.$inferSelect): Promise<boolean> => {
    if (requester.role === "manager") {
        if (!requester.organisationId || !exam.classroomId) return false;
        const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, exam.classroomId));
        return !!classroom && classroom.organisationId === requester.organisationId;
    }
    if (requester.role === "teacher") {
        if (exam.createdBy === requester.id) return true;
        if (!exam.classroomId) return false;
        const [row] = await db.select({ id: classroomTeachers.id }).from(classroomTeachers).where(
            and(eq(classroomTeachers.classroomId, exam.classroomId), eq(classroomTeachers.teacherId, requester.id))
        );
        return !!row;
    }
    return false;
};

// ── Whether a requester may see a submission at all ───────────────────────────
// The student who owns it, or staff with access to its exam. Used by anything
// that exposes a submission indirectly (e.g. its evaluation job's state).
export const canAccessSubmission = async (submissionId: string, requester: Requester): Promise<boolean> => {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId));
    if (!submission) return false;
    if (submission.userId === requester.id) return true;

    const [exam] = await db.select().from(exams).where(eq(exams.id, submission.examId));
    if (!exam) return false;
    return hasStaffAccessToExam(requester, exam);
};

// ── Assert requester (co-teacher, or manager of the org) can grade/manage this exam's submissions ─
const assertCanManageExamSubmissions = async (requester: Requester, examId: string) => {
    const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
    if (!exam) throw ApiError.notFound("Exam not found");
    if (!(await hasStaffAccessToExam(requester, exam))) throw ApiError.forbidden("You are not authorized to manage this exam");
    return exam;
};

// ── Grading descriptive answers ───────────────────────────────────────────────
// Every answer is graded and saved on its own, the moment it finishes. One answer failing never throws away the others, and
// a retry of the job only redoes what is still ungraded (see buildTextAnswersForEvaluation).
// Writes evaluatedBy: "ai" — and never touches an answer a teacher has graded by hand, even one graded while the AI was working.
const saveExamAnswer = async (answer: TextAnswer, result: EvaluationOutcome) => {
    await db.update(answers)
        .set({
            isCorrect: result.marksAwarded === answer.maxMarks,
            marksAwarded: result.marksAwarded,
            feedback: result.feedback,
            evaluatedBy: "ai",
            updatedAt: new Date(),
        })
        .where(and(eq(answers.id, answer.answerId), or(isNull(answers.evaluatedBy), ne(answers.evaluatedBy, "teacher"))));
};

// ── AI-grade answers as far as the organisation's plan allows ────────────────────
// Used when a student submits. Answers beyond what the plan covers are not graded by AI: they are left without marks, with a
// note the student can read, for the teacher to grade by hand.
const NOT_GRADED_NOTE = "This answer was not graded by AI because your organisation's plan has no AI grading left. Your teacher will grade it.";
// Same, when grading kept failing for another reason.
const NOT_GRADED_FAILED_NOTE = "This answer could not be graded automatically. Your teacher will grade it.";

// When the teacher has turned AI evaluation off for the exam.
const TEACHER_GRADES_NOTE = "Your teacher will grade this answer.";

const leaveForTeacher = async (textAnswers: TextAnswer[], note: string) => {
    for (const answer of textAnswers) {
        await db.update(answers).set({ feedback: note, updatedAt: new Date() }).where(eq(answers.id, answer.answerId));
    }
};

const throwFirstFailure = (summary: GradeSummary) => {
    if (summary.failures.length > 0) throw summary.failures[0];
};

const gradeWithinQuota = async (submissionId: string, textAnswers: TextAnswer[], mode: ResponseMode): Promise<void> => {
    // An empty answer is marked 0 without any AI work, so it is neither charged nor held up by the plan.
    const blanks = textAnswers.filter((a) => isBlankAnswer(a.studentAnswer));
    const written = textAnswers.filter((a) => !isBlankAnswer(a.studentAnswer));
    await gradeAnswers(blanks, mode, saveExamAnswer);

    const organisationId = await getOrganisationIdForSubmission(submissionId);
    const summary = await gradeAnswers(written, mode, saveExamAnswer, organisationId ? organisationGradeGate(organisationId) : undefined);
    await leaveForTeacher(summary.outOfQuota, NOT_GRADED_NOTE);
    throwFirstFailure(summary);
};

// ── Build the list of descriptive answers eligible for AI evaluation ───────────
// Skips any answer already graded by a teacher, so AI never overwrites a manual grade. With `skipAiGraded` it also skips
// answers the AI has already marked, which is what lets a retried job carry on where it stopped instead of starting over.
const buildTextAnswersForEvaluation = async (submissionId: string, options: { skipAiGraded?: boolean } = {}): Promise<TextAnswer[]> => {
    const submissionAnswers = await db.select().from(answers).where(eq(answers.submissionId, submissionId));
    const questionIds = [...new Set(submissionAnswers.map((a) => a.questionId))];
    const questionRows = questionIds.length > 0 ? await db.select().from(questions).where(inArray(questions.id, questionIds)) : [];
    const questionById = new Map(questionRows.map((q) => [q.id, q]));

    const textAnswersToEvaluate: TextAnswer[] = [];
    for (const answer of submissionAnswers) {
        if (answer.evaluatedBy === "teacher") continue;
        if (options.skipAiGraded && answer.evaluatedBy === "ai" && answer.marksAwarded !== null) continue;
        const question = questionById.get(answer.questionId);
        if (!question || question.type !== "descriptive") continue;
        textAnswersToEvaluate.push({
            answerId: answer.id,
            questionId: question.id,
            question: question.description,
            modelAnswer: question.modelAnswer || "",
            studentAnswer: answer.textAnswer ?? "",
            maxMarks: question.marks,
            questionImages: question.images as any,
            contentBlocks: question.contentBlocks,
            rubric: question.rubric,
        });
    }
    return textAnswersToEvaluate;
};

// Whether the teacher wants written answers graded by AI for this exam ("Evaluate with AI" on the publish step).
const aiEvaluationIsOn = async (examId: string): Promise<boolean> => {
    const [exam] = await db.select({ aiEvaluation: exams.aiEvaluation }).from(exams).where(eq(exams.id, examId));
    return exam?.aiEvaluation !== false;
};

// With AI evaluation off: an empty written answer gets 0 (no AI involved, as always), every other one waits for the teacher.
const leaveWrittenAnswersForTeacher = async (submissionId: string) => {
    const pending = await buildTextAnswersForEvaluation(submissionId, { skipAiGraded: true });
    await gradeAnswers(pending.filter((a) => isBlankAnswer(a.studentAnswer)), "marks_and_feedback", saveExamAnswer);
    await leaveForTeacher(pending.filter((a) => !isBlankAnswer(a.studentAnswer)), TEACHER_GRADES_NOTE);
};

// Whether the exam's grading guides (rubrics) are still being written. Answers are not graded until they are ready.
const rubricsArePending = async (examId: string): Promise<boolean> => {
    const [exam] = await db.select({ rubricStatus: exams.rubricStatus }).from(exams).where(eq(exams.id, examId));
    return exam?.rubricStatus === "pending";
};

// Adds up a submission's marks and marks it as done.
const finishSubmission = async (submissionId: string) => {
    const allAnswers = await db.select().from(answers).where(eq(answers.submissionId, submissionId));
    const totalScore = allAnswers.reduce((sum, a) => sum + (a.marksAwarded ?? 0), 0);

    const [updated] = await db.update(submissions)
        .set({ status: "submitted", score: totalScore, updatedAt: new Date() })
        .where(eq(submissions.id, submissionId))
        .returning();
    return updated;
};

// ── Evaluate a submission's descriptive answers (called by the BullMQ worker) ──
// Re-fetches answers from the DB, grades the ones still ungraded, and marks the submission as submitted with the recomputed
// total score. If some answers fail it throws after saving the rest, so the job retries only what is missing.
export const evaluateDescriptiveAnswers = async (submissionId: string, mode?: string): Promise<void> => {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId));
    if (!submission) throw ApiError.notFound("Submission not found");
    // The AI calls below are logged against the exam, its owner and organisation.
    bindUsageContext(await examUsageContext(submission.examId));

    // The exam's grading guides are still being written: leave the submission "evaluating". It is queued again as soon as
    // they are ready (see releaseWaitingEvaluations), and the recovery sweep would also find it.
    // AI evaluation was turned off after this submission was queued: the teacher grades what is left.
    if (!(await aiEvaluationIsOn(submission.examId))) {
        await leaveWrittenAnswersForTeacher(submissionId);
        await finishSubmission(submissionId);
        return;
    }

    if (await rubricsArePending(submission.examId)) return;

    const textAnswersToEvaluate = await buildTextAnswersForEvaluation(submissionId, { skipAiGraded: true });

    if (textAnswersToEvaluate.length > 0) {
        const evalMode: ResponseMode = mode === "marks_only" ? "marks_only" : "marks_and_feedback";
        await gradeWithinQuota(submissionId, textAnswersToEvaluate, evalMode);
    }

    await finishSubmission(submissionId);
};

// ── Called when a grading job has used up all its tries ─────────────────────────
// Whatever could not be graded is left for the teacher with a note, and the submission is finished, so a student is never
// left waiting on "evaluating" for a result that is not coming.
export const finalizeFailedEvaluation = async (submissionId: string): Promise<void> => {
    const pending = await buildTextAnswersForEvaluation(submissionId, { skipAiGraded: true });
    await leaveForTeacher(pending, NOT_GRADED_FAILED_NOTE);
    await finishSubmission(submissionId);
};

// When an attempt's time runs out: the exam's duration after the student pressed "Proceed to Exam". null until they have
// (no time runs while they read the instructions) and for an exam with no time limit.
const attemptDeadline = (submission: { startedAt: Date | null }, exam: { duration: number | null }): Date | null => {
    if (!submission.startedAt || !exam.duration) return null;
    return new Date(submission.startedAt.getTime() + exam.duration * 60000);
};

// ── Shared: start (or resume) a submission for a resolved exam ─────────────────
const startSubmissionForExam = async (exam: typeof exams.$inferSelect, studentId: string) => {
    // check exam time is valid
    const now = new Date();
    if (exam.startTime && now < exam.startTime) throw ApiError.badRequest("Exam has not started yet");
    if (exam.endTime && now > exam.endTime) throw ApiError.badRequest("Exam has already ended");
    if (exam.publishTime && now < exam.publishTime) throw ApiError.badRequest("This exam is not published yet");

    // Create (or resume) the submission atomically. The partial unique index on
    // (examId, userId) WHERE deletedAt IS NULL guarantees a single active
    // submission even under concurrent requests.
    await db.insert(submissions).values({
        examId: exam.id,
        userId: studentId,
        status: "inprogress",
    }).onConflictDoNothing();

    const [submission] = await db.select().from(submissions).where(
        and(
            eq(submissions.examId, exam.id),
            eq(submissions.userId, studentId),
            isNull(submissions.deletedAt)
        )
    );

    if (!submission) throw ApiError.internal("Failed to join exam");

    if (submission.status !== "inprogress") {
        throw ApiError.conflict("You have already submitted this exam");
    }

    return { submission, exam };
};

// ── Join Exam (by code) ────────────────────────────────────────────────────────
const joinExam = async (joinCode: string, studentId: string) => {
    // Students often paste the code with spaces around it.
    joinCode = String(joinCode ?? "").trim();
    // find exam by join code
    const [exam] = await db.select().from(exams).where(eq(exams.joinCode, joinCode));
    if (!exam) throw ApiError.notFound("Invalid join code");

    return startSubmissionForExam(exam, studentId);
};

// ── Start Exam (classroom/group-scoped, no code needed) ───────────────────────
const startScopedExam = async (examId: string, studentId: string) => {
    const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
    if (!exam) throw ApiError.notFound("Exam not found");
    if (!exam.classroomId) throw ApiError.badRequest("This exam is not scoped to a classroom");

    const [classroomMembership] = await db.select().from(classroomStudents).where(
        and(
            eq(classroomStudents.classroomId, exam.classroomId),
            eq(classroomStudents.studentId, studentId),
            eq(classroomStudents.status, "active"),
        )
    );
    if (!classroomMembership) throw ApiError.forbidden("You are not a member of this exam's classroom");

    if (exam.groupId) {
        const [groupMembership] = await db.select().from(groupStudents).where(
            and(eq(groupStudents.groupId, exam.groupId), eq(groupStudents.studentId, studentId))
        );
        if (!groupMembership) throw ApiError.forbidden("You are not a member of this exam's group");
    }

    return startSubmissionForExam(exam, studentId);
};

// ── Begin: the student pressed "Proceed to Exam", so the clock starts now ──────
// Asking again changes nothing (a reload must not give more time).
const beginSubmission = async (submissionId: string, studentId: string) => {
    const [row] = await db.select({ submission: submissions, exam: exams }).from(submissions)
        .innerJoin(exams, eq(submissions.examId, exams.id))
        .where(and(eq(submissions.id, submissionId), eq(submissions.userId, studentId), isNull(submissions.deletedAt)));
    if (!row) throw ApiError.notFound("Submission not found");
    if (row.submission.status !== "inprogress") throw ApiError.badRequest("Exam has already been submitted");
    if (row.submission.startedAt) return row.submission;

    const now = new Date();
    if (row.exam.endTime && now > row.exam.endTime) throw ApiError.badRequest("Exam has already ended");

    // Only the first request sets it, even if two arrive together.
    const [updated] = await db.update(submissions)
        .set({ startedAt: now, updatedAt: now })
        .where(and(eq(submissions.id, submissionId), isNull(submissions.startedAt)))
        .returning();
    if (updated) return updated;

    const [current] = await db.select().from(submissions).where(eq(submissions.id, submissionId));
    return current!;
};

// ── Submit Exam ────────────────────────────────────────────────────────────────
const submitExam =async (submissionId: string, studentId: string, mode: string) => {
    // verify submission exists and belongs to student
    const [submission] = await db.select().from(submissions).where(
        and(
            eq(submissions.id, submissionId),
            eq(submissions.userId, studentId),
            isNull(submissions.deletedAt)
        )
    );
    if (!submission) throw ApiError.notFound("Submission not found");
    if (submission.status !== "inprogress") throw ApiError.badRequest("Exam has already been submitted");

    // fetch all answers for this submission
    const submissionAnswers = await db.select().from(answers).where(
        eq(answers.submissionId, submissionId)
    );

    let totalScore = 0;
    let hasDescriptive = false;

    // --- MCQ evaluation (sync, no AI) ---
    for (const answer of submissionAnswers) {
        const [question] = await db.select().from(questions).where(eq(questions.id, answer.questionId));
        if (!question) continue;

        if (question.type === "mcq") {
            const correctOptions = await db.select().from(options).where(
                and(eq(options.questionId, answer.questionId), eq(options.isCorrect, true))
            );

            const correctOptionIds = correctOptions.map(opt => opt.id);
            const selectedOptionIds = answer.options ?? [];

            const isCorrect =
                correctOptionIds.length === selectedOptionIds.length &&
                correctOptionIds.every(id => selectedOptionIds.includes(id));

            const marksAwarded = isCorrect ? question.marks : 0;
            totalScore += marksAwarded;

            await db.update(answers)
                .set({ isCorrect, marksAwarded, evaluatedBy: "ai" })
                .where(eq(answers.id, answer.id));

        } else if (question.type === "descriptive") {
            hasDescriptive = true;
        }
    }

    // Written answers go to the AI only when the teacher left AI evaluation on. Otherwise they wait for the teacher and the
    // submission is done now.
    const queueEvaluation = hasDescriptive && (await aiEvaluationIsOn(submission.examId));
    if (hasDescriptive && !queueEvaluation) await leaveWrittenAnswersForTeacher(submissionId);

    // --- Set evaluating (AI grading queued) or submitted (nothing to grade) ---
    const [updated] = await db.update(submissions)
        .set({
            status: queueEvaluation ? "evaluating" : "submitted",
            score: totalScore,
            submittedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(submissions.id, submissionId))
        .returning();

    // Checked after the status was saved: if the guides are still being written, the job that finishes them queues this
    // submission (it looks for "evaluating" ones after marking the guides ready), so nothing is lost either way.
    if (queueEvaluation && !(await rubricsArePending(submission.examId))) {
        // The submission is already saved as "evaluating". If the queue cannot be reached right now, the student's submit
        // still succeeded: the recovery sweep (workers.ts) queues it again within minutes.
        try {
            await enqueueEvaluation("evaluate-submission", { submissionId, mode: mode ?? "marks_and_feedback" });
        } catch (err) {
            console.error(`[Evaluation] Could not queue submission ${submissionId}; the recovery sweep will pick it up:`, err);
        }
    }

    return updated;
};

// ── Manually Grade a Submission (creator, co-teacher, or manager of the org) ────
// A teacher can always override an AI grade; AI (re-)evaluation must never
// overwrite a manual grade — see evaluateSubmissionWithAI below.
const gradeExamSubmission = async (submissionId: string, data: GradeExamSubmissionDto, requester: Requester) => {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId));
    if (!submission) throw ApiError.notFound("Submission not found");
    if (submission.status === "inprogress") throw ApiError.badRequest("Student has not submitted this exam yet");

    await assertCanManageExamSubmissions(requester, submission.examId);

    return await db.transaction(async (tx) => {
        for (const graded of data.answers) {
            const [answerRow] = await tx.select().from(answers).where(
                and(eq(answers.id, graded.answerId), eq(answers.submissionId, submissionId))
            );
            if (!answerRow) throw ApiError.notFound(`Answer ${graded.answerId} not found for this submission`);

            const [question] = await tx.select().from(questions).where(eq(questions.id, answerRow.questionId));
            if (!question) throw ApiError.notFound("Question not found");
            if (graded.marksAwarded > question.marks) {
                throw ApiError.badRequest(`Marks awarded (${graded.marksAwarded}) cannot exceed this question's max marks (${question.marks})`);
            }

            await tx.update(answers)
                .set({
                    marksAwarded: graded.marksAwarded,
                    feedback: graded.feedback ?? null,
                    isCorrect: graded.marksAwarded === question.marks,
                    evaluatedBy: "teacher",
                    updatedAt: new Date(),
                })
                .where(eq(answers.id, graded.answerId));
        }

        const allAnswers = await tx.select().from(answers).where(eq(answers.submissionId, submissionId));
        const totalScore = allAnswers.reduce((sum, a) => sum + (a.marksAwarded ?? 0), 0);

        const [updated] = await tx.update(submissions)
            .set({
                status: "submitted",
                score: totalScore,
                gradedBy: requester.id,
                gradedAt: new Date(),
                overallFeedback: data.overallFeedback ?? null,
                updatedAt: new Date(),
            })
            .where(eq(submissions.id, submissionId))
            .returning();

        return updated;
    });
};

// ── Trigger (or re-trigger) AI evaluation for a submission's descriptive answers ─
// Skips any answer already graded by a teacher — AI can never overwrite a manual grade.
const evaluateSubmissionWithAI = async (submissionId: string, data: EvaluateWithAiDto, requester: Requester) => {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId));
    if (!submission) throw ApiError.notFound("Submission not found");
    if (submission.status === "inprogress") throw ApiError.badRequest("Student has not submitted this exam yet");

    await assertCanManageExamSubmissions(requester, submission.examId);
    bindUsageContext(await examUsageContext(submission.examId));

    if (!(await aiEvaluationIsOn(submission.examId))) {
        throw ApiError.badRequest("AI evaluation is turned off for this exam. Turn it on in the exam's publish settings to use it.");
    }

    if (await rubricsArePending(submission.examId)) {
        throw new ApiError(409, "The grading guides for this exam are still being written. Try AI grading again in a minute.");
    }

    const textAnswersToEvaluate = await buildTextAnswersForEvaluation(submissionId);

    if (textAnswersToEvaluate.length === 0) {
        throw ApiError.badRequest("No descriptive answers are eligible for AI evaluation (they may already be manually graded)");
    }

    // A teacher asking for AI grading is told plainly when the plan can't cover it, instead of grading part of it.
    // Empty answers are marked 0 without AI, so they don't count.
    const organisationId = await getOrganisationIdForSubmission(submissionId);
    const writtenCount = textAnswersToEvaluate.filter((a) => !isBlankAnswer(a.studentAnswer)).length;
    if (organisationId && writtenCount > 0) {
        await assertQuota(organisationId, "question_evaluation", writtenCount);
    }

    const summary = await gradeAnswers(textAnswersToEvaluate, data.mode, saveExamAnswer, alreadyCheckedGate(organisationId));

    // Whatever was graded is kept and counted even when something failed, then the problem is reported.
    const updated = await finishSubmission(submissionId);
    throwFirstFailure(summary);

    return updated;
};

// ── Get Submission by ID (student sees own; co-teacher/manager sees any in-scope) ─
const getSubmissionById = async (submissionId: string, requester: Requester, mode: string = "detailed") => {
    let [result] = await db.select({
        submission: submissions,
        exam: exams
    }).from(submissions)
    .innerJoin(exams, eq(submissions.examId, exams.id))
    .where(and(eq(submissions.id, submissionId), isNull(submissions.deletedAt)));
    if (!result) throw ApiError.notFound("Submission not found");
    let submission = result.submission;

    const isOwner = submission.userId === requester.id;
    if (!isOwner && !(await hasStaffAccessToExam(requester, result.exam))) {
        throw ApiError.notFound("Submission not found");
    }

    if (submission.status === "inprogress") {
        const endTime = attemptDeadline(submission, result.exam);
        if (endTime && new Date() >= endTime) {
            try {
                const updated = await submitExam(submissionId, submission.userId, mode);
                if (updated) submission = updated;
            } catch (e) {
                console.error("Auto-submit failed", e);
            }
        }
    }

    // fetch answers with question and options details
    const submissionAnswers = await db.select().from(answers).where(
        eq(answers.submissionId, submissionId)
    );

    return { ...submission, answers: submissionAnswers };
};

// ── Get All Submissions for an Exam (creator, co-teacher, or manager of the org) ─
const getSubmissionsByExam = async (examId: string, requester: Requester, mode: string = "simple") => {
    const exam = await assertCanManageExamSubmissions(requester, examId);

    const result = await db.select({
        submission: submissions,
        user: {
            id: users.id,
            name: users.name,
            email: users.email
        }
    }).from(submissions)
        .innerJoin(users, eq(submissions.userId, users.id))
        .where(
            and(eq(submissions.examId, examId), isNull(submissions.deletedAt))
        );

    const now = new Date();
    for (const row of result) {
        const sub = row.submission;
        const endTime = sub && sub.status === "inprogress" ? attemptDeadline(sub, exam) : null;
        if (sub && endTime && now >= endTime) {
            try {
                const updated = await submitExam(sub.id, sub.userId, mode);
                if (updated) row.submission = updated;
            } catch (e) {
                console.error("Auto-submit failed", e);
            }
        }
    }

    return result;
};

// ── Soft Delete Submission ─────────────────────────────────────────────────────
const deleteSubmission = async (submissionId: string, studentId: string) => {
    const [submission] = await db.select().from(submissions).where(
        and(
            eq(submissions.id, submissionId),
            eq(submissions.userId, studentId),
            isNull(submissions.deletedAt)
        )
    );
    if (!submission) throw ApiError.notFound("Submission not found");

    await db.update(submissions)
        .set({ deletedAt: new Date() })
        .where(eq(submissions.id, submissionId));
};

// ── Get My Submissions ─────────────────────────────────────────────────────────
const getMySubmissions = async (studentId: string, mode: string = "simple", search?: string, days?: string, page: number = 1, limit: number = 10) => {
    const conditions = [
        eq(submissions.userId, studentId),
        isNull(submissions.deletedAt)
    ];

    if (search) {
        conditions.push(ilike(exams.title, `%${search}%`));
    }

    if (days && days !== "all") {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        conditions.push(gte(submissions.createdAt, cutoffDate));
    }

    const offset = (page - 1) * limit;

    const data = await db.select({
        submission: submissions,
        exam: exams
    })
        .from(submissions)
        .innerJoin(exams, eq(submissions.examId, exams.id))
        .where(and(...conditions))
        .orderBy(desc(submissions.createdAt))
        .limit(limit)
        .offset(offset);

    const [totalCount] = await db.select({ value: count() })
        .from(submissions)
        .innerJoin(exams, eq(submissions.examId, exams.id))
        .where(and(...conditions));

    const total = Number(totalCount?.value) || 0;

    const now = new Date();
    for (const row of data) {
        const endTime = row.submission.status === "inprogress" ? attemptDeadline(row.submission, row.exam) : null;
        if (endTime && now >= endTime) {
            try {
                const updated = await submitExam(row.submission.id, studentId, mode);
                if (updated) row.submission = updated;
            } catch (e) {
                console.error("Auto-submit failed for", row.submission.id, e);
            }
        }
    }

    return {
        data,
        total,
        page,
        limit,
        hasMore: offset + data.length < total
    };
};

// ── Get Exam For Submission ────────────────────────────────────────────────────
const getExamForSubmission = async (submissionId: string, requester: Requester) => {
    let [result] = await db.select({
        submission: submissions,
        exam: exams
    }).from(submissions)
    .innerJoin(exams, eq(submissions.examId, exams.id))
    .where(and(eq(submissions.id, submissionId), isNull(submissions.deletedAt)));
    if (!result) throw ApiError.notFound("Submission not found");
    const { submission, exam } = result;

    const isOwner = submission.userId === requester.id;
    if (!isOwner && !(await hasStaffAccessToExam(requester, exam))) {
        throw ApiError.notFound("Submission not found");
    }

    const examSections = await db.select().from(sections).where(eq(sections.examId, exam.id));

    // Hide the answer key only from the student actually sitting the exam.
    // Staff (checked above) always see the full question, and the student
    // themselves sees it once they've submitted and are reviewing results.
    const hideAnswerKey = isOwner && submission.status === "inprogress";

    const sectionsWithQuestions = await Promise.all(examSections.map(async (section) => {
        const sectionQuestions = await db.select().from(questions).where(eq(questions.sectionId, section.id)).orderBy(questions.position);

        const questionsWithOptions = await Promise.all(sectionQuestions.map(async (question) => {
            const questionOptions = await (hideAnswerKey
                ? db.select({
                    id: options.id,
                    questionId: options.questionId,
                    value: options.value
                }).from(options).where(eq(options.questionId, question.id))
                : db.select().from(options).where(eq(options.questionId, question.id))
            );

            // options.isCorrect is stripped for MCQs above; rubric and
            // modelAnswer are the descriptive-question equivalent — rubric
            // key_points spell out exactly what the grader looks for — so
            // they have to come off the question for the same reason.
            if (hideAnswerKey) {
                const { rubric, modelAnswer, ...questionWithoutAnswerKey } = question;
                return { ...questionWithoutAnswerKey, options: questionOptions };
            }

            return { ...question, options: questionOptions };
        }));

        return { ...section, questions: questionsWithOptions };
    }));

    return { ...exam, sections: sectionsWithQuestions };
};
const verifyJoinCode = async (joinCode: string, studentId: string) => {
    joinCode = String(joinCode ?? "").trim();
    const [exam] = await db.select({
        id: exams.id,
        title: exams.title,
        startTime: exams.startTime,
        endTime: exams.endTime,
        duration: exams.duration,
        publishTime: exams.publishTime,
    }).from(exams).where(eq(exams.joinCode, joinCode));

    if (!exam) throw ApiError.notFound("Invalid join code");

    // We can also check if the exam has already ended or not published yet
    const now = new Date();
    if (exam.publishTime && now < exam.publishTime) throw ApiError.badRequest("This exam is not published yet");
    if (exam.endTime && now > exam.endTime) throw ApiError.badRequest("Exam has already ended");

    // Check if user already submitted
    const [existing] = await db.select().from(submissions).where(
        and(
            eq(submissions.examId, exam.id),
            eq(submissions.userId, studentId),
            isNull(submissions.deletedAt)
        )
    );

    if (existing && existing.status !== "inprogress") {
        throw ApiError.conflict("You have already submitted this exam");
    }

    // An exam that hasn't started yet is remembered for this student, so it appears on their dashboard with its
    // countdown and they don't have to enter the code again.
    if (!existing && exam.startTime && now < exam.startTime) {
        await db.insert(examRegistrations).values({ examId: exam.id, userId: studentId }).onConflictDoNothing();
    }

    return exam;
};

// ── Upcoming exams the student has entered the code for ───────────────────────
// Exams that haven't ended and that the student hasn't started yet. Once they start (a submission exists) the exam
// moves to "My Exams" and drops out of this list.
const getUpcomingExams = async (studentId: string) => {
    const now = new Date();
    const rows = await db.select({
        id: exams.id,
        title: exams.title,
        startTime: exams.startTime,
        endTime: exams.endTime,
        duration: exams.duration,
        publishTime: exams.publishTime,
        joinCode: exams.joinCode,
        registeredAt: examRegistrations.createdAt,
    })
        .from(examRegistrations)
        .innerJoin(exams, eq(examRegistrations.examId, exams.id))
        .where(eq(examRegistrations.userId, studentId))
        .orderBy(exams.startTime);
    if (rows.length === 0) return [];

    const started = await db.select({ examId: submissions.examId }).from(submissions).where(
        and(
            eq(submissions.userId, studentId),
            inArray(submissions.examId, rows.map((r) => r.id)),
            isNull(submissions.deletedAt)
        )
    );
    const startedIds = new Set(started.map((s) => s.examId));

    return rows.filter((r) => !startedIds.has(r.id) && (!r.endTime || now <= r.endTime) && (!r.publishTime || now >= r.publishTime));
};

// ── Get Exam Leaderboard ─────────────────────────────────────────────────────────
const getExamLeaderboard = async (examId: string, requester: Requester) => {
    const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
    if (!exam) throw ApiError.notFound("Exam not found");

    if (requester.role === "student") {
        const [sub] = await db.select().from(submissions).where(
            and(eq(submissions.examId, examId), eq(submissions.userId, requester.id), isNull(submissions.deletedAt))
        );
        if (!sub) throw ApiError.forbidden("You must participate in the exam to view the leaderboard.");
    } else if (!(await hasStaffAccessToExam(requester, exam))) {
        throw ApiError.forbidden("You do not have permission to view this leaderboard.");
    }

    const result = await db.select({
        id: submissions.id,
        score: submissions.score,
        submittedAt: submissions.submittedAt,
        user: {
            id: users.id,
            name: users.name,
            email: users.email
        }
    })
    .from(submissions)
    .innerJoin(users, eq(submissions.userId, users.id))
    .where(
        and(
            eq(submissions.examId, examId),
            eq(submissions.status, "submitted"),
            isNull(submissions.deletedAt)
        )
    )
    .orderBy(desc(submissions.score), submissions.submittedAt);

    return result;
};

export { joinExam, startScopedExam, beginSubmission, submitExam, gradeExamSubmission, evaluateSubmissionWithAI, getSubmissionById, getSubmissionsByExam, deleteSubmission, getMySubmissions, getUpcomingExams, getExamForSubmission, verifyJoinCode, getExamLeaderboard };