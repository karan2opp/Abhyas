import { eq, and, isNull, desc, or, ilike, gte, count } from "drizzle-orm";
import db from "../../common/db/index.js";
import { submissions, exams, answers, options, questions, sections, users } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { evaluateSingleAnswer, type TextAnswer, type ResponseMode } from "../evalutaion/evalutaion.js";
// ── Join Exam ──────────────────────────────────────────────────────────────────
const joinExam = async (joinCode: string, studentId: string) => {
    // find exam by join code
    const [exam] = await db.select().from(exams).where(eq(exams.joinCode, joinCode));
    if (!exam) throw ApiError.notFound("Invalid join code");

    // check exam time is valid
    const now = new Date();
    if (exam.startTime && now < exam.startTime) throw ApiError.badRequest("Exam has not started yet");
    if (exam.endTime && now > exam.endTime) throw ApiError.badRequest("Exam has already ended");

    // check student hasn't already joined
    const [existing] = await db.select().from(submissions).where(
        and(
            eq(submissions.examId, exam.id),
            eq(submissions.userId, studentId),
            isNull(submissions.deletedAt)
        )
    );
    if (existing) {
        if (existing.status === "inprogress") {
            return { submission: existing, exam };
        } else {
            throw ApiError.conflict("You have already submitted this exam");
        }
    }

    // create submission
    const [submission] = await db.insert(submissions).values({
        examId: exam.id,
        userId: studentId,
        status: "inprogress",
    }).returning();

    if (!submission) throw ApiError.internal("Failed to join exam");

    return { submission, exam };
};

// ── Submit Exam ────────────────────────────────────────────────────────────────
const submitExam = async (submissionId: string, studentId: string, mode: string) => {
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
    const textAnswersToEvaluate: TextAnswer[] = [];

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
                .set({ isCorrect, marksAwarded })
                .where(eq(answers.id, answer.id));

        } else if (question.type === "descriptive") {
            textAnswersToEvaluate.push({
                answerId: answer.id,
                questionId: question.id,
                question: question.description,
                modelAnswer: question.modelAnswer || "",
                studentAnswer: answer.textAnswer ?? "",
                maxMarks: question.marks,
                questionImages: question.images as any
            });
        }
    }

    // --- Text/Code evaluation (AI, batched) ---
    if (textAnswersToEvaluate.length > 0) {
        // --- Update submission to evaluating first ---
        const [updated] = await db.update(submissions)
            .set({
                status: "evaluating",
                score: totalScore,
                submittedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(submissions.id, submissionId))
            .returning();

        // --- Run AI Evaluation in Background ---
        (async () => {
            try {
                const evalMode: ResponseMode = (mode === "detailed" || mode === "marks_and_feedback") ? "marks_and_feedback" : "marks_only";

                const textScores = await Promise.all(textAnswersToEvaluate.map(async (answer) => {
                    try {
                        // Round 1
                        const r1 = await evaluateSingleAnswer(answer, {
                            evaluationMode: "initial_evaluation",
                            mode: evalMode
                        });

                        // Round 2
                        const r2 = await evaluateSingleAnswer(answer, {
                            evaluationMode: "comparison_evaluation",
                            mode: evalMode,
                            idealAnswer: r1.idealAnswer,
                            keyPoints: r1.keyPoints
                        });

                        let finalMarks = r2.marksAwarded;
                        let finalFeedback = r2.feedback;
                        
                        let needsTiebreaker = false;
                        if (r1.confidence === "low" || r2.confidence === "low") {
                            needsTiebreaker = true;
                        } else if ((r1.confidence === "medium" || r2.confidence === "medium") && Math.abs(r1.marksAwarded - r2.marksAwarded) > 1) {
                            needsTiebreaker = true;
                        }
                        
                        if (!needsTiebreaker) {
                            // Average the scores if high/medium and close, round to nearest 0.5
                            finalMarks = Math.round(((r1.marksAwarded + r2.marksAwarded) / 2) * 2) / 2;
                        } else {
                            // Round 3
                            const r3 = await evaluateSingleAnswer(answer, {
                                evaluationMode: "tiebreaker_evaluation",
                                mode: evalMode,
                                idealAnswer: r1.idealAnswer,
                                round1Score: r1.marksAwarded,
                                round2Score: r2.marksAwarded
                            });
                            
                            finalMarks = r3.marksAwarded;
                            finalFeedback = r3.feedback;
                        }

                        let feedbackString = null;
                        if (finalFeedback && typeof finalFeedback === 'object') {
                           feedbackString = `Strengths: ${finalFeedback.strengths || ''}\nImprovements: ${finalFeedback.improvements || ''}\nSuggestion: ${finalFeedback.suggestion || ''}`;
                        } else if (typeof finalFeedback === 'string') {
                            feedbackString = finalFeedback;
                        }

                        await db.update(answers)
                            .set({
                                isCorrect: finalMarks === answer.maxMarks,
                                marksAwarded: finalMarks,
                                feedback: feedbackString
                            })
                            .where(eq(answers.id, answer.answerId));

                        return finalMarks;
                    } catch (err) {
                        console.error(`Failed to evaluate answer ${answer.answerId}`, err);
                        return 0; // fallback score on error
                    }
                }));

                const additionalScore = textScores.reduce((sum, score) => sum + (score || 0), 0);

                await db.update(submissions)
                    .set({
                        status: "submitted",
                        score: totalScore + additionalScore,
                        updatedAt: new Date(),
                    })
                    .where(eq(submissions.id, submissionId));
            } catch (error) {
                console.error("Background evaluation failed", error);
                // Even on failure, mark as submitted so student isn't stuck
                await db.update(submissions)
                    .set({ status: "submitted" })
                    .where(eq(submissions.id, submissionId));
            }
        })();

        return updated;
    }

    // --- Update submission ---
    const [updated] = await db.update(submissions)
        .set({
            status: "submitted",
            score: totalScore,
            submittedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(submissions.id, submissionId))
        .returning();

    return updated;
};

// ── Get Submission by ID (student sees own) ────────────────────────────────────
const getSubmissionById = async (submissionId: string, userId: string, mode: string = "detailed") => {
    let [result] = await db.select({
        submission: submissions,
        exam: exams
    }).from(submissions)
    .innerJoin(exams, eq(submissions.examId, exams.id))
    .where(
        and(
            eq(submissions.id, submissionId),
            isNull(submissions.deletedAt),
            or(
                eq(submissions.userId, userId),
                eq(exams.createdBy, userId)
            )
        )
    );
    if (!result) throw ApiError.notFound("Submission not found");
    let submission = result.submission;

    if (submission.status === "inprogress") {
        const [exam] = await db.select().from(exams).where(eq(exams.id, submission.examId));
        if (exam && exam.duration) {
            const endTime = new Date(submission.createdAt.getTime() + exam.duration * 60000);
            if (new Date() >= endTime) {
                try {
                    const updated = await submitExam(submissionId, userId, mode);
                    if (updated) submission = updated;
                } catch (e) {
                    console.error("Auto-submit failed", e);
                }
            }
        }
    }

    // fetch answers with question and options details
    const submissionAnswers = await db.select().from(answers).where(
        eq(answers.submissionId, submissionId)
    );

    return { ...submission, answers: submissionAnswers };
};

// ── Get All Submissions for an Exam (teacher only) ─────────────────────────────
const getSubmissionsByExam = async (examId: string, teacherId: string, mode: string = "simple") => {
    // verify exam belongs to teacher
    const [exam] = await db.select().from(exams).where(
        and(eq(exams.id, examId), eq(exams.createdBy, teacherId))
    );
    if (!exam) throw ApiError.notFound("Exam not found");

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
        if (sub && sub.status === "inprogress" && exam.duration) {
            const endTime = new Date(sub.createdAt.getTime() + exam.duration * 60000);
            if (now >= endTime) {
                try {
                    const updated = await submitExam(sub.id, sub.userId, mode);
                    if (updated) row.submission = updated;
                } catch (e) {
                    console.error("Auto-submit failed", e);
                }
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
        if (row.submission.status === "inprogress" && row.exam.duration) {
            const endTime = new Date(row.submission.createdAt.getTime() + row.exam.duration * 60000);
            if (now >= endTime) {
                try {
                    const updated = await submitExam(row.submission.id, studentId, mode);
                    if (updated) row.submission = updated;
                } catch (e) {
                    console.error("Auto-submit failed for", row.submission.id, e);
                }
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
const getExamForSubmission = async (submissionId: string, userId: string) => {
    let [result] = await db.select({
        submission: submissions,
        exam: exams
    }).from(submissions)
    .innerJoin(exams, eq(submissions.examId, exams.id))
    .where(
        and(
            eq(submissions.id, submissionId),
            isNull(submissions.deletedAt),
            or(
                eq(submissions.userId, userId),
                eq(exams.createdBy, userId)
            )
        )
    );
    if (!result) throw ApiError.notFound("Submission not found");
    const { submission, exam } = result;

    const examSections = await db.select().from(sections).where(eq(sections.examId, exam.id));

    const sectionsWithQuestions = await Promise.all(examSections.map(async (section) => {
        const sectionQuestions = await db.select().from(questions).where(eq(questions.sectionId, section.id));

        const questionsWithOptions = await Promise.all(sectionQuestions.map(async (question) => {
            const questionOptions = await (submission.status === "inprogress" 
                ? db.select({
                    id: options.id,
                    questionId: options.questionId,
                    value: options.value
                }).from(options).where(eq(options.questionId, question.id))
                : db.select().from(options).where(eq(options.questionId, question.id))
            );

            return { ...question, options: questionOptions };
        }));

        return { ...section, questions: questionsWithOptions };
    }));

    return { ...exam, sections: sectionsWithQuestions };
};
// ── Verify Join Code ─────────────────────────────────────────────────────────────
const verifyJoinCode = async (joinCode: string, studentId: string) => {
    const [exam] = await db.select({
        id: exams.id,
        title: exams.title,
        startTime: exams.startTime,
        endTime: exams.endTime,
        duration: exams.duration,
    }).from(exams).where(eq(exams.joinCode, joinCode));

    if (!exam) throw ApiError.notFound("Invalid join code");

    // We can also check if the exam has already ended
    const now = new Date();
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

    return exam;
};

// ── Get Exam Leaderboard ─────────────────────────────────────────────────────────
const getExamLeaderboard = async (examId: string, userId: string, role: string) => {
    const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
    if (!exam) throw ApiError.notFound("Exam not found");

    if (role === "student") {
        const [sub] = await db.select().from(submissions).where(
            and(eq(submissions.examId, examId), eq(submissions.userId, userId), isNull(submissions.deletedAt))
        );
        if (!sub) throw ApiError.forbidden("You must participate in the exam to view the leaderboard.");
    } else if (role === "teacher") {
        if (exam.createdBy !== userId) throw ApiError.forbidden("You do not have permission to view this leaderboard.");
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

export { joinExam, submitExam, getSubmissionById, getSubmissionsByExam, deleteSubmission, getMySubmissions, getExamForSubmission, verifyJoinCode, getExamLeaderboard };