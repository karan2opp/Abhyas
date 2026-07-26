import { eq, and, inArray, isNull } from "drizzle-orm";
import db from "../../common/db/index.js";
import {
    assignments,
    assignmentQuestions,
    assignmentOptions,
    assignmentSubmissions,
    assignmentAnswers,
    classroomStudents,
    groupStudents,
    groups,
    users,
} from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { PermissionService } from "../../common/permissions/index.js";
import type {
    CreateAssignmentDto,
    UpdateAssignmentDto,
    CreateAssignmentQuestionDto,
    UpdateAssignmentQuestionDto,
    SaveAssignmentAnswerDto,
    GradeAssignmentSubmissionDto,
} from "./dto/assignment.dto.js";

// ── Validate Classroom/Group Scope ─────────────────────────────────────────────
const validateAssignmentScope = async (classroomId: string, groupId: string | null | undefined, teacherId: string) => {
    const canManageClassroom = await PermissionService.teacher.canManageClassroom(teacherId, classroomId);
    if (!canManageClassroom) throw ApiError.forbidden("You are not authorized to create assignments in this classroom");

    if (groupId) {
        const canManageGroup = await PermissionService.teacher.canManageGroup(teacherId, groupId);
        if (!canManageGroup) throw ApiError.forbidden("You are not authorized to use this group");

        const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
        if (!group || group.classroomId !== classroomId) {
            throw ApiError.badRequest("Group does not belong to the given classroom");
        }
    }
};

// ── Create Assignment ────────────────────────────────────────────────────────
const createAssignment = async (data: CreateAssignmentDto, teacherId: string) => {
    await validateAssignmentScope(data.classroomId, data.groupId, teacherId);

    const [assignment] = await db.insert(assignments).values({
        title: data.title,
        instructions: data.instructions,
        classroomId: data.classroomId,
        groupId: data.groupId ?? null,
        createdBy: teacherId,
        totalMarks: data.totalMarks,
        dueDate: data.dueDate ?? null,
    }).returning();

    if (!assignment) throw ApiError.internal("Failed to create assignment");
    return assignment;
};

// ── Update Assignment ────────────────────────────────────────────────────────
const updateAssignment = async (assignmentId: string, data: UpdateAssignmentDto, teacherId: string) => {
    const hasAccess = await PermissionService.teacher.canManageAssignment(teacherId, assignmentId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to update this assignment");

    const [existing] = await db.select().from(assignments).where(eq(assignments.id, assignmentId));
    if (!existing) throw ApiError.notFound("Assignment not found");

    if (data.groupId !== undefined && data.groupId !== null) {
        await validateAssignmentScope(existing.classroomId, data.groupId, teacherId);
    }

    const [updated] = await db.update(assignments)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(assignments.id, assignmentId))
        .returning();

    return updated;
};

// ── Delete Assignment ────────────────────────────────────────────────────────
const deleteAssignment = async (assignmentId: string, teacherId: string) => {
    const hasAccess = await PermissionService.teacher.canManageAssignment(teacherId, assignmentId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to delete this assignment");

    await db.delete(assignments).where(eq(assignments.id, assignmentId));
};

// ── List Assignments (for a classroom, teacher) ──────────────────────────────
const listAssignmentsForClassroom = async (classroomId: string, teacherId: string) => {
    const hasAccess = await PermissionService.teacher.canManageClassroom(teacherId, classroomId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to view this classroom");

    return await db.select().from(assignments).where(eq(assignments.classroomId, classroomId));
};

// ── Get Assignment By Id (teacher) ───────────────────────────────────────────
const getAssignmentById = async (assignmentId: string, teacherId: string) => {
    const hasAccess = await PermissionService.teacher.canManageAssignment(teacherId, assignmentId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to view this assignment");

    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, assignmentId));
    if (!assignment) throw ApiError.notFound("Assignment not found");
    return assignment;
};

// ── Helper: verify question belongs to a classroom the teacher can manage ─────
const verifyQuestionOwnership = async (questionId: string, teacherId: string) => {
    const [question] = await db.select().from(assignmentQuestions).where(eq(assignmentQuestions.id, questionId));
    if (!question) throw ApiError.notFound("Question not found");

    const hasAccess = await PermissionService.teacher.canManageAssignment(teacherId, question.assignmentId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to manage this question");

    return question;
};

// ── Create Question ──────────────────────────────────────────────────────────
const createQuestion = async (data: CreateAssignmentQuestionDto, teacherId: string) => {
    const hasAccess = await PermissionService.teacher.canManageAssignment(teacherId, data.assignmentId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to add questions to this assignment");

    const result = await db.transaction(async (tx) => {
        const [question] = await tx.insert(assignmentQuestions).values({
            assignmentId: data.assignmentId,
            type: data.type,
            description: data.description,
            marks: data.marks,
            modelAnswer: data.modelAnswer,
            images: data.images ?? null,
        }).returning();

        if (!question) throw ApiError.internal("Failed to create question");

        let optionsData: typeof assignmentOptions.$inferSelect[] = [];
        if (data.type === "mcq" && data.options && data.options.length > 0) {
            optionsData = await tx.insert(assignmentOptions).values(
                data.options.map(opt => ({
                    questionId: question.id,
                    value: opt.value,
                    isCorrect: opt.isCorrect,
                }))
            ).returning();
        }

        return { ...question, options: optionsData };
    });

    return result;
};

// ── Update Question (with smart options merge) ───────────────────────────────
const updateQuestion = async (questionId: string, data: UpdateAssignmentQuestionDto, teacherId: string) => {
    await verifyQuestionOwnership(questionId, teacherId);

    const result = await db.transaction(async (tx) => {
        const [updated] = await tx.update(assignmentQuestions)
            .set({
                ...(data.description && { description: data.description }),
                ...(data.marks && { marks: data.marks }),
                ...(data.modelAnswer !== undefined && { modelAnswer: data.modelAnswer }),
                ...(data.images && { images: data.images }),
                updatedAt: new Date(),
            })
            .where(eq(assignmentQuestions.id, questionId))
            .returning();

        if (!updated) throw ApiError.internal("Failed to update question");

        if (data.options && data.options.length > 0) {
            const toUpdate = data.options.filter(opt => opt.id);
            const toCreate = data.options.filter(opt => !opt.id);
            const incomingIds = toUpdate.map(opt => opt.id as string);

            const existingOptions = await tx.select().from(assignmentOptions).where(eq(assignmentOptions.questionId, questionId));
            const toDelete = existingOptions.filter(opt => !incomingIds.includes(opt.id));

            if (toDelete.length > 0) {
                await tx.delete(assignmentOptions).where(inArray(assignmentOptions.id, toDelete.map(opt => opt.id)));
            }

            await Promise.all(
                toUpdate.map(opt =>
                    tx.update(assignmentOptions)
                        .set({ value: opt.value, isCorrect: opt.isCorrect, updatedAt: new Date() })
                        .where(eq(assignmentOptions.id, opt.id as string))
                )
            );

            if (toCreate.length > 0) {
                await tx.insert(assignmentOptions).values(
                    toCreate.map(opt => ({ questionId, value: opt.value!, isCorrect: opt.isCorrect! }))
                );
            }
        }

        const updatedOptions = await tx.select().from(assignmentOptions).where(eq(assignmentOptions.questionId, questionId));
        return { ...updated, options: updatedOptions };
    });

    return result;
};

// ── Delete Question (cascades options) ───────────────────────────────────────
const deleteQuestion = async (questionId: string, teacherId: string) => {
    await verifyQuestionOwnership(questionId, teacherId);
    await db.delete(assignmentQuestions).where(eq(assignmentQuestions.id, questionId));
};

// ── Get Questions (teacher, full view incl. correct answers) ────────────────
const getQuestionsForTeacher = async (assignmentId: string, teacherId: string) => {
    const hasAccess = await PermissionService.teacher.canManageAssignment(teacherId, assignmentId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to view this assignment");

    const questionsData = await db.select().from(assignmentQuestions).where(eq(assignmentQuestions.assignmentId, assignmentId));
    return await Promise.all(questionsData.map(async (question) => {
        const optionsData = await db.select().from(assignmentOptions).where(eq(assignmentOptions.questionId, question.id));
        return { ...question, options: optionsData };
    }));
};

// ── Helper: verify a student can access a given assignment via classroom/group ─
const assertStudentCanAccessAssignment = async (assignmentId: string, studentId: string) => {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, assignmentId));
    if (!assignment) throw ApiError.notFound("Assignment not found");

    const [classroomMembership] = await db.select().from(classroomStudents).where(
        and(
            eq(classroomStudents.classroomId, assignment.classroomId),
            eq(classroomStudents.studentId, studentId),
            eq(classroomStudents.status, "active"),
        )
    );
    if (!classroomMembership) throw ApiError.forbidden("You are not a member of this assignment's classroom");

    if (assignment.groupId) {
        const [groupMembership] = await db.select().from(groupStudents).where(
            and(eq(groupStudents.groupId, assignment.groupId), eq(groupStudents.studentId, studentId))
        );
        if (!groupMembership) throw ApiError.forbidden("You are not a member of this assignment's group");
    }

    return assignment;
};

// ── Get Assignment By Id (student) ───────────────────────────────────────────
const getAssignmentForStudent = async (assignmentId: string, studentId: string) => {
    return await assertStudentCanAccessAssignment(assignmentId, studentId);
};

// ── Get Questions (student, hides correct answers/model answer) ─────────────
const getQuestionsForStudent = async (assignmentId: string, studentId: string) => {
    await assertStudentCanAccessAssignment(assignmentId, studentId);

    const questionsData = await db.select({
        id: assignmentQuestions.id,
        assignmentId: assignmentQuestions.assignmentId,
        type: assignmentQuestions.type,
        description: assignmentQuestions.description,
        images: assignmentQuestions.images,
        marks: assignmentQuestions.marks,
    }).from(assignmentQuestions).where(eq(assignmentQuestions.assignmentId, assignmentId));

    return await Promise.all(questionsData.map(async (question) => {
        const optionsData = await db.select({
            id: assignmentOptions.id,
            questionId: assignmentOptions.questionId,
            value: assignmentOptions.value,
        }).from(assignmentOptions).where(eq(assignmentOptions.questionId, question.id));
        return { ...question, options: optionsData };
    }));
};

// ── List Assignments Visible to a Student ────────────────────────────────────
const getMyAssignments = async (studentId: string) => {
    const memberships = await db.select().from(classroomStudents).where(
        and(eq(classroomStudents.studentId, studentId), eq(classroomStudents.status, "active"))
    );
    if (memberships.length === 0) return [];

    const classroomIds = memberships.map(m => m.classroomId);
    const myGroups = await db.select().from(groupStudents).where(eq(groupStudents.studentId, studentId));
    const myGroupIds = new Set(myGroups.map(g => g.groupId));

    const classWideAndMyGroups = await db.select().from(assignments).where(inArray(assignments.classroomId, classroomIds));

    return classWideAndMyGroups.filter(a => !a.groupId || myGroupIds.has(a.groupId));
};

// ── Start Assignment (creates or resumes an in-progress submission) ─────────
const startAssignment = async (assignmentId: string, studentId: string) => {
    await assertStudentCanAccessAssignment(assignmentId, studentId);

    const [existing] = await db.select().from(assignmentSubmissions).where(
        and(
            eq(assignmentSubmissions.assignmentId, assignmentId),
            eq(assignmentSubmissions.studentId, studentId),
            isNull(assignmentSubmissions.deletedAt),
        )
    );
    if (existing) {
        if (existing.status === "in_progress") return existing;
        throw ApiError.conflict("You have already submitted this assignment");
    }

    const [submission] = await db.insert(assignmentSubmissions).values({
        assignmentId,
        studentId,
        status: "in_progress",
    }).returning();

    if (!submission) throw ApiError.internal("Failed to start assignment");
    return submission;
};

// ── Save Answer (student, upserted per question while in progress) ──────────
const saveAnswer = async (data: SaveAssignmentAnswerDto, studentId: string) => {
    const [submission] = await db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.id, data.submissionId));
    if (!submission) throw ApiError.notFound("Submission not found");
    if (submission.studentId !== studentId) throw ApiError.forbidden("You are not authorized to answer for this submission");
    if (submission.status !== "in_progress") throw ApiError.badRequest("This assignment has already been submitted");

    const [question] = await db.select().from(assignmentQuestions).where(eq(assignmentQuestions.id, data.questionId));
    if (!question) throw ApiError.notFound("Question not found");
    if (question.assignmentId !== submission.assignmentId) throw ApiError.badRequest("Question does not belong to this assignment");

    // MCQ correctness is deterministic (not AI-graded); descriptive answers are
    // left ungraded (marksAwarded null) until the teacher reviews them manually.
    let marksAwarded: number | null = null;
    if (question.type === "mcq") {
        const correctOptions = await db.select().from(assignmentOptions).where(
            and(eq(assignmentOptions.questionId, question.id), eq(assignmentOptions.isCorrect, true))
        );
        const correctIds = correctOptions.map(o => o.id).sort();
        const selectedIds = [...(data.options ?? [])].sort();
        const isCorrect = JSON.stringify(correctIds) === JSON.stringify(selectedIds);
        marksAwarded = isCorrect ? question.marks : 0;
    }

    const [existingAnswer] = await db.select().from(assignmentAnswers).where(
        and(eq(assignmentAnswers.submissionId, data.submissionId), eq(assignmentAnswers.questionId, data.questionId))
    );

    if (existingAnswer) {
        const [updated] = await db.update(assignmentAnswers)
            .set({
                options: data.options ?? [],
                textAnswer: data.textAnswer ?? null,
                marksAwarded,
                updatedAt: new Date(),
            })
            .where(eq(assignmentAnswers.id, existingAnswer.id))
            .returning();
        return updated;
    }

    const [created] = await db.insert(assignmentAnswers).values({
        submissionId: data.submissionId,
        questionId: data.questionId,
        options: data.options ?? [],
        textAnswer: data.textAnswer ?? null,
        marksAwarded,
    }).returning();

    return created;
};

// ── Submit Assignment (finalize; grading of descriptive answers comes later) ─
const submitAssignment = async (submissionId: string, studentId: string) => {
    const [submission] = await db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.id, submissionId));
    if (!submission) throw ApiError.notFound("Submission not found");
    if (submission.studentId !== studentId) throw ApiError.forbidden("You are not authorized to submit this");
    if (submission.status !== "in_progress") throw ApiError.badRequest("This assignment has already been submitted");

    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, submission.assignmentId));
    const now = new Date();
    const isLate = !!(assignment?.dueDate && now > assignment.dueDate);

    const [updated] = await db.update(assignmentSubmissions)
        .set({ status: "submitted", submittedAt: now, isLate, updatedAt: now })
        .where(eq(assignmentSubmissions.id, submissionId))
        .returning();

    return updated;
};

// ── Get My Submission (student) ──────────────────────────────────────────────
const getMySubmission = async (assignmentId: string, studentId: string) => {
    const [submission] = await db.select().from(assignmentSubmissions).where(
        and(eq(assignmentSubmissions.assignmentId, assignmentId), eq(assignmentSubmissions.studentId, studentId))
    );
    if (!submission) return null;

    const answersData = await db.select().from(assignmentAnswers).where(eq(assignmentAnswers.submissionId, submission.id));
    return { ...submission, answers: answersData };
};

// ── List Submissions (teacher, grading queue) ────────────────────────────────
const getSubmissionsForAssignment = async (assignmentId: string, teacherId: string) => {
    const hasAccess = await PermissionService.teacher.canManageAssignment(teacherId, assignmentId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to view this assignment");

    return await db.select({
        id: assignmentSubmissions.id,
        studentId: users.id,
        studentName: users.name,
        studentEmail: users.email,
        status: assignmentSubmissions.status,
        submittedAt: assignmentSubmissions.submittedAt,
        isLate: assignmentSubmissions.isLate,
        totalMarksAwarded: assignmentSubmissions.totalMarksAwarded,
    })
        .from(assignmentSubmissions)
        .innerJoin(users, eq(assignmentSubmissions.studentId, users.id))
        .where(and(eq(assignmentSubmissions.assignmentId, assignmentId), isNull(assignmentSubmissions.deletedAt)));
};

// ── Get Submission By Id (teacher, full detail for grading) ──────────────────
const getSubmissionById = async (submissionId: string, teacherId: string) => {
    const [submission] = await db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.id, submissionId));
    if (!submission) throw ApiError.notFound("Submission not found");

    const hasAccess = await PermissionService.teacher.canManageAssignment(teacherId, submission.assignmentId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to view this submission");

    const answersData = await db.select().from(assignmentAnswers).where(eq(assignmentAnswers.submissionId, submissionId));
    return { ...submission, answers: answersData };
};

// ── Grade Submission (teacher: marks + feedback per answer, then finalize) ──
const gradeSubmission = async (submissionId: string, data: GradeAssignmentSubmissionDto, teacherId: string) => {
    const [submission] = await db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.id, submissionId));
    if (!submission) throw ApiError.notFound("Submission not found");

    const hasAccess = await PermissionService.teacher.canManageAssignment(teacherId, submission.assignmentId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to grade this submission");

    if (submission.status === "in_progress") throw ApiError.badRequest("Student has not submitted this assignment yet");

    return await db.transaction(async (tx) => {
        for (const graded of data.answers) {
            await tx.update(assignmentAnswers)
                .set({ marksAwarded: graded.marksAwarded, feedback: graded.feedback ?? null, updatedAt: new Date() })
                .where(and(eq(assignmentAnswers.id, graded.answerId), eq(assignmentAnswers.submissionId, submissionId)));
        }

        const allAnswers = await tx.select().from(assignmentAnswers).where(eq(assignmentAnswers.submissionId, submissionId));
        const totalMarksAwarded = allAnswers.reduce((sum, a) => sum + (a.marksAwarded ?? 0), 0);

        const [graded] = await tx.update(assignmentSubmissions)
            .set({
                status: "graded",
                totalMarksAwarded,
                overallFeedback: data.overallFeedback ?? null,
                gradedBy: teacherId,
                gradedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(assignmentSubmissions.id, submissionId))
            .returning();

        return graded;
    });
};

export {
    createAssignment,
    updateAssignment,
    deleteAssignment,
    listAssignmentsForClassroom,
    getAssignmentById,
    getAssignmentForStudent,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    getQuestionsForTeacher,
    getQuestionsForStudent,
    getMyAssignments,
    startAssignment,
    saveAnswer,
    submitAssignment,
    getMySubmission,
    getSubmissionsForAssignment,
    getSubmissionById,
    gradeSubmission,
};
