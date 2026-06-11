import { eq, and, isNull, desc } from "drizzle-orm";
import db from "../../common/db/index.js";
import { submissions, exams, answers, options, questions, sections, users } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";

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
const submitExam = async (submissionId: string, studentId: string) => {
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

    // calculate MCQ score
    let score = 0;

    for (const answer of submissionAnswers) {
        // get question to check type and marks
        const [question] = await db.select().from(questions).where(eq(questions.id, answer.questionId));
        if (!question || question.type !== "mcq") continue;

        // get correct options for this question
        const correctOptions = await db.select().from(options).where(
            and(eq(options.questionId, answer.questionId), eq(options.isCorrect, true))
        );

        const correctOptionIds = correctOptions.map(opt => opt.id);
        const selectedOptionIds = answer.options ?? [];

        // check if selected options match correct options exactly
        const isCorrect =
            correctOptionIds.length === selectedOptionIds.length &&
            correctOptionIds.every(id => selectedOptionIds.includes(id));

        if (isCorrect) {
            score += question.marks;

            // update answer isCorrect and marksAwarded
            await db.update(answers)
                .set({ isCorrect: true, marksAwarded: question.marks })
                .where(eq(answers.id, answer.id));
        } else {
            await db.update(answers)
                .set({ isCorrect: false, marksAwarded: 0 })
                .where(eq(answers.id, answer.id));
        }
    }

    // update submission status and score
    const [updated] = await db.update(submissions)
        .set({
            status: "submitted",
            score,
            submittedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(submissions.id, submissionId))
        .returning();

    return updated;
};

// ── Get Submission by ID (student sees own) ────────────────────────────────────
const getSubmissionById = async (submissionId: string, studentId: string) => {
    let [submission] = await db.select().from(submissions).where(
        and(
            eq(submissions.id, submissionId),
            eq(submissions.userId, studentId),
            isNull(submissions.deletedAt)
        )
    );
    if (!submission) throw ApiError.notFound("Submission not found");

    if (submission.status === "inprogress") {
        const [exam] = await db.select().from(exams).where(eq(exams.id, submission.examId));
        if (exam && exam.duration) {
            const endTime = new Date(submission.createdAt.getTime() + exam.duration * 60000);
            if (new Date() >= endTime) {
                try {
                    const updated = await submitExam(submissionId, studentId);
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
const getSubmissionsByExam = async (examId: string, teacherId: string) => {
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
                    const updated = await submitExam(sub.id, sub.userId);
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
const getMySubmissions = async (studentId: string) => {
    const result = await db.select({
        submission: submissions,
        exam: exams
    })
    .from(submissions)
    .innerJoin(exams, eq(submissions.examId, exams.id))
    .where(
        and(
            eq(submissions.userId, studentId),
            isNull(submissions.deletedAt)
        )
    )
    .orderBy(desc(submissions.createdAt));
    
    const now = new Date();
    for (const row of result) {
        if (row.submission.status === "inprogress" && row.exam.duration) {
            const endTime = new Date(row.submission.createdAt.getTime() + row.exam.duration * 60000);
            if (now >= endTime) {
                try {
                    const updated = await submitExam(row.submission.id, studentId);
                    if (updated) row.submission = updated;
                } catch (e) {
                    console.error("Auto-submit failed for", row.submission.id, e);
                }
            }
        }
    }

    return result;
};

// ── Get Exam For Submission ────────────────────────────────────────────────────
const getExamForSubmission = async (submissionId: string, studentId: string) => {
    const [submission] = await db.select().from(submissions).where(
        and(
            eq(submissions.id, submissionId),
            eq(submissions.userId, studentId),
            isNull(submissions.deletedAt)
        )
    );
    if (!submission) throw ApiError.notFound("Submission not found");

    const [exam] = await db.select().from(exams).where(eq(exams.id, submission.examId));
    if (!exam) throw ApiError.notFound("Exam not found");

    const examSections = await db.select().from(sections).where(eq(sections.examId, exam.id));

    const sectionsWithQuestions = await Promise.all(examSections.map(async (section) => {
        const sectionQuestions = await db.select().from(questions).where(eq(questions.sectionId, section.id));
        
        const questionsWithOptions = await Promise.all(sectionQuestions.map(async (question) => {
            const questionOptions = await db.select({
                id: options.id,
                questionId: options.questionId,
                value: options.value
            }).from(options).where(eq(options.questionId, question.id));
            
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

export { joinExam, submitExam, getSubmissionById, getSubmissionsByExam, deleteSubmission, getMySubmissions, getExamForSubmission, verifyJoinCode };