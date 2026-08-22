import { eq, and, count, inArray, avg, desc, ilike, gte } from "drizzle-orm";
import db from "../../common/db/index.js";
import { exams, sections, questions, options, groups, classroomStudents, groupStudents, blocks } from "../../common/db/schema.js";
import { submissions } from "../submissions/submission.schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import type { CreateExamDto, UpdateExamDto } from "./dto/exam.dto.js";
import { PermissionService } from "../../common/permissions/index.js";














type Requester = { id: string; role: string; organisationId: string | null };

// ── Generate Join Code ─────────────────────────────────────────────────────────
const generateJoinCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// ── Validate Classroom/Group Scope ─────────────────────────────────────────────
const validateExamScope = async (classroomId: string | undefined, groupId: string | undefined, requester: Requester) => {
    if (!classroomId) return;

    const canManageClassroom = requester.role === "manager"
        ? await PermissionService.manager.canManageClassroom(requester.organisationId, classroomId)
        : await PermissionService.teacher.canManageClassroom(requester.id, classroomId);
    if (!canManageClassroom) throw ApiError.forbidden("You are not authorized to create exams in this classroom");

    if (groupId) {
        if (requester.role === "teacher") {
            const canManageGroup = await PermissionService.teacher.canManageGroup(requester.id, groupId);
            if (!canManageGroup) throw ApiError.forbidden("You are not authorized to use this group");
        }

        const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
        if (!group || group.classroomId !== classroomId) {
            throw ApiError.badRequest("Group does not belong to the given classroom");
        }
    }
};

// ── Assert requester can manage a specific existing exam ───────────────────────
const assertExamAccess = async (requester: Requester, examId: string) => {
    const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
    if (!exam) throw ApiError.notFound("Exam not found");

    const hasAccess = requester.role === "manager"
        ? await PermissionService.manager.canManageExam(requester.organisationId, examId)
        : await PermissionService.teacher.canManageExam(requester.id, examId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to manage this exam");

    return exam;
};

// ── Create Exam ────────────────────────────────────────────────────────────────
const createExam = async (data: CreateExamDto, requester: Requester) => {
    await validateExamScope(data.classroomId, data.groupId, requester);

    let joinCode = generateJoinCode();

    // ensure join code is unique
    let existing = await db.select().from(exams).where(eq(exams.joinCode, joinCode));
    while (existing.length > 0) {
        joinCode = generateJoinCode();
        existing = await db.select().from(exams).where(eq(exams.joinCode, joinCode));
    }

    // Calculate duration automatically if not provided or if we want to override
    let calculatedDuration = data.duration;
    if (data.type === "SCHEDULED" && data.startTime && data.endTime) {
        calculatedDuration = Math.round((new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 60000);
    }

    if (data.publishTime) {
        if (data.startTime && new Date(data.publishTime) >= new Date(data.startTime)) {
            throw ApiError.badRequest("Publish date and time must be before the start date and time of the exam");
        }
    }

    const [exam] = await db.insert(exams).values({
        ...data,
        totalMarks: data.totalMarks ?? 0,
        duration: calculatedDuration || 60, // fallback to 60 if somehow null
        joinCode,
        createdBy: requester.id,
        classroomId: data.classroomId ?? null,
        groupId: data.groupId ?? null,
    }).returning();

    if (!exam) throw ApiError.internal("Failed to create exam");
    return exam;
};

// ── Save Generated Exam ────────────────────────────────────────────────────────
const saveGeneratedExam = async (data: any, requester: Requester) => {
    await validateExamScope(data.classroomId, data.groupId, requester);

    return await db.transaction(async (tx) => {
        let calculatedTotalMarks = 0;
        for (const secData of data.sections || []) {
            if (Array.isArray(secData.blocks) && secData.blocks.length > 0) {
                for (const blockData of secData.blocks) {
                    for (const qData of blockData.questions || []) {
                        calculatedTotalMarks += Number(qData.marks) || 0;
                    }
                }
            } else {
                for (const qData of secData.questions || []) {
                    calculatedTotalMarks += Number(qData.marks) || 0;
                }
            }
        }

        let examId = data.examId;
        let exam;

        if (examId) {
            // Find existing exam and verify ownership/management permissions
            const [existingExam] = await tx.select().from(exams).where(eq(exams.id, examId));
            if (!existingExam) throw ApiError.notFound("Exam not found");

            const hasAccess = requester.role === "manager"
                ? await PermissionService.manager.canManageExam(requester.organisationId, examId)
                : await PermissionService.teacher.canManageExam(requester.id, examId);
            if (!hasAccess) throw ApiError.forbidden("You are not authorized to edit this exam");

            // Update totalMarks
            const [updatedExam] = await tx.update(exams)
                .set({ totalMarks: calculatedTotalMarks, updatedAt: new Date() })
                .where(eq(exams.id, examId))
                .returning();
            exam = updatedExam;
        } else {
            let joinCode = generateJoinCode();
            let existing = await db.select().from(exams).where(eq(exams.joinCode, joinCode));
            while (existing.length > 0) {
                joinCode = generateJoinCode();
                existing = await db.select().from(exams).where(eq(exams.joinCode, joinCode));
            }

            // Create Exam
            const [newExam] = await tx.insert(exams).values({
                title: data.title,
                type: data.examType === "flexible" ? "ON_DEMAND" : "SCHEDULED",
                duration: data.duration,
                startTime: data.windowStart ? new Date(data.windowStart) : null,
                endTime: data.windowEnd ? new Date(data.windowEnd) : null,
                totalMarks: calculatedTotalMarks,
                instructions: [],
                joinCode,
                createdBy: requester.id,
                classroomId: data.classroomId ?? null,
                groupId: data.groupId ?? null,
                difficulty: data.difficulty || "medium",
                status: data.status || "DRAFT",
            }).returning();
            exam = newExam;
        }

        if (!exam) throw ApiError.internal("Failed to save exam");

        // Create Sections, Blocks, and Questions
        for (const secData of data.sections || []) {
            let sectionIdToUse = secData.targetSectionId || secData.target_section_id || secData.sectionId;

            if (!sectionIdToUse) {
                const secTitle = secData.title || secData.section_name || secData.name || "Section A";
                const [section] = await tx.insert(sections).values({
                    examId: exam.id,
                    title: secTitle,
                }).returning();

                if (!section) throw ApiError.internal("Failed to create section");
                sectionIdToUse = section.id;
            } else {
                // Validate that the target section belongs to the exam being saved.
                const [targetSection] = await tx.select().from(sections).where(eq(sections.id, sectionIdToUse));
                if (!targetSection) throw ApiError.notFound("Target section not found");
                if (targetSection.examId !== exam.id) {
                    throw ApiError.badRequest("Target section does not belong to this exam");
                }
            }

            const blockList = Array.isArray(secData.blocks) && secData.blocks.length > 0 ? secData.blocks : null;

            if (blockList) {
                for (const [blockIdx, blockData] of blockList.entries()) {
                    const [block] = await tx.insert(blocks).values({
                        sectionId: sectionIdToUse,
                        name: blockData.name || "Block",
                        subject: blockData.subject || "",
                        questionType: blockData.question_type || "mcq",
                        questionCount: blockData.question_count || (Array.isArray(blockData.questions) ? blockData.questions.length : 0),
                        totalMarks: blockData.total_marks || 0,
                        instructions: Array.isArray(blockData.instructions) ? blockData.instructions : [],
                        position: blockIdx,
                    }).returning();

                    if (!block) throw ApiError.internal("Failed to create block");

                    for (const qData of blockData.questions || []) {
                        const [question] = await tx.insert(questions).values({
                            sectionId: sectionIdToUse,
                            blockId: block.id,
                            type: qData.type,
                            description: qData.description,
                            marks: qData.marks,
                            rubric: qData.rubric || null,
                        }).returning();

                        if (!question) throw ApiError.internal("Failed to create question");

                        if (qData.type === "mcq" && qData.options) {
                            await tx.insert(options).values(
                                qData.options.map((opt: any) => ({
                                    questionId: question.id,
                                    value: opt.value,
                                    isCorrect: opt.isCorrect,
                                }))
                            );
                        }
                    }
                }
            } else {
                // Legacy shape: questions directly under the section (no blocks)
                for (const qData of secData.questions || []) {
                    const [question] = await tx.insert(questions).values({
                        sectionId: sectionIdToUse,
                        type: qData.type,
                        description: qData.description,
                        marks: qData.marks,
                        rubric: qData.rubric || null,
                    }).returning();

                    if (!question) throw ApiError.internal("Failed to create question");

                    if (qData.type === "mcq" && qData.options) {
                        await tx.insert(options).values(
                            qData.options.map((opt: any) => ({
                                questionId: question.id,
                                value: opt.value,
                                isCorrect: opt.isCorrect,
                            }))
                        );
                    }
                }
            }
        }

        // Recalculate grand total marks across all sections in this exam
        const allExamQuestions = await tx.select({ marks: questions.marks })
            .from(questions)
            .innerJoin(sections, eq(questions.sectionId, sections.id))
            .where(eq(sections.examId, exam.id));

        const grandTotalMarks = allExamQuestions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);

        await tx.update(exams)
            .set({ totalMarks: grandTotalMarks, updatedAt: new Date() })
            .where(eq(exams.id, exam.id));

        return exam;
    });
};

// ── Get All Exams (teacher sees only his own) ──────────────────────────────────
const getExams = async (teacherId: string, search?: string, days?: string, page: number = 1, limit: number = 10) => {
    const conditions = [eq(exams.createdBy, teacherId)];

    if (search) {
        conditions.push(ilike(exams.title, `%${search}%`));
    }

    if (days && days !== "all") {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        // Use createdAt for filtering newly created exams
        conditions.push(gte(exams.createdAt, cutoffDate));
    }

    const offset = (page - 1) * limit;

    const data = await db.select().from(exams)
        .where(and(...conditions))
        .orderBy(desc(exams.createdAt))
        .limit(limit)
        .offset(offset);

    const [totalCount] = await db.select({ value: count() }).from(exams)
        .where(and(...conditions));
    const total = Number(totalCount?.value) || 0;

    return {
        data,
        total,
        page,
        limit,
        hasMore: offset + data.length < total
    };
};

// ── Get Single Exam ────────────────────────────────────────────────────────────
const getExamById = async (examId: string, requester: Requester) => {
    return await assertExamAccess(requester, examId);
};

// ── List Exams for a Classroom (teacher or manager) ────────────────────────────
const listExamsForClassroom = async (classroomId: string, requester: Requester, groupId?: string, search?: string) => {
    const canManageClassroom = requester.role === "manager"
        ? await PermissionService.manager.canManageClassroom(requester.organisationId, classroomId)
        : await PermissionService.teacher.canManageClassroom(requester.id, classroomId);
    if (!canManageClassroom) throw ApiError.forbidden("You are not authorized to view this classroom's exams");

    const conditions = [eq(exams.classroomId, classroomId)];
    if (groupId) conditions.push(eq(exams.groupId, groupId));
    if (search) conditions.push(ilike(exams.title, `%${search}%`));

    return await db.select().from(exams).where(and(...conditions)).orderBy(desc(exams.createdAt));
};

// ── Update Exam ────────────────────────────────────────────────────────────────
const updateExam = async (examId: string, data: UpdateExamDto, requester: Requester) => {
    const existing = await assertExamAccess(requester, examId);

    if (data.classroomId !== undefined || data.groupId !== undefined) {
        await validateExamScope(
            data.classroomId ?? existing.classroomId ?? undefined,
            data.groupId ?? existing.groupId ?? undefined,
            requester,
        );
    }

    // Calculate new duration if start/end times change
    let calculatedDuration = data.duration;
    const finalType = data.type !== undefined ? data.type : existing.type;
    const finalStartTime = data.startTime !== undefined ? data.startTime : existing.startTime;
    const finalEndTime = data.endTime !== undefined ? data.endTime : existing.endTime;

    if (finalType === "SCHEDULED" && finalStartTime && finalEndTime) {
        calculatedDuration = Math.round((new Date(finalEndTime).getTime() - new Date(finalStartTime).getTime()) / 60000);
    }

    if (data.publishTime !== undefined && data.publishTime !== null) {
        if (finalStartTime && new Date(data.publishTime) >= new Date(finalStartTime)) {
            throw ApiError.badRequest("Publish date and time must be before the start date and time of the exam");
        }
    }

    const [updated] = await db.update(exams)
        .set({
            ...data,
            duration: calculatedDuration !== undefined ? calculatedDuration : existing.duration,
            updatedAt: new Date()
        })
        .where(eq(exams.id, examId))
        .returning();

    return updated;
};

// ── Delete Exam ────────────────────────────────────────────────────────────────
const deleteExam = async (examId: string, requester: Requester) => {
    await assertExamAccess(requester, examId);
    await db.delete(exams).where(eq(exams.id, examId));
};

// ── Get Overview Stats ─────────────────────────────────────────────────────────
const getOverviewStats = async (teacherId: string) => {
    const [examsCount] = await db.select({ value: count() }).from(exams).where(eq(exams.createdBy, teacherId));

    const recentExams = await db.select().from(exams)
        .where(eq(exams.createdBy, teacherId))
        .orderBy(desc(exams.createdAt))
        .limit(5);

    const teacherExams = await db.select({ id: exams.id }).from(exams).where(eq(exams.createdBy, teacherId));
    const examIds = teacherExams.map(e => e.id);

    let totalStudents = 0;
    let averageScore = 0;

    if (examIds.length > 0) {
        const uniqueStudents = await db.selectDistinct({ userId: submissions.userId })
            .from(submissions)
            .where(and(
                inArray(submissions.examId, examIds),
                eq(submissions.status, "submitted")
            ));
        totalStudents = uniqueStudents.length;

        const [avgResult] = await db.select({ value: avg(submissions.score) })
            .from(submissions)
            .where(and(inArray(submissions.examId, examIds), eq(submissions.status, "submitted")));

        averageScore = avgResult?.value ? Math.round(Number(avgResult.value)) : 0;
    }

    return {
        totalExams: Number(examsCount?.value) || 0,
        totalStudents,
        averageScore,
        recentExams
    };
};

// ── Get My Exams (student, via classroom/group membership) ───────────────────
const getMyExams = async (studentId: string, classroomId?: string) => {
    const memberships = await db.select().from(classroomStudents).where(
        and(eq(classroomStudents.studentId, studentId), eq(classroomStudents.status, "active"))
    );
    const memberClassroomIds = memberships.map(m => m.classroomId);
    if (memberClassroomIds.length === 0) return [];
    if (classroomId && !memberClassroomIds.includes(classroomId)) return [];

    const classroomIds = classroomId ? [classroomId] : memberClassroomIds;
    const myGroups = await db.select().from(groupStudents).where(eq(groupStudents.studentId, studentId));
    const myGroupIds = new Set(myGroups.map(g => g.groupId));

    const classroomExams = await db.select().from(exams).where(inArray(exams.classroomId, classroomIds));

    const now = new Date();
    return classroomExams
        .filter(e => (e as any).status === "PUBLISHED")
        .filter(e => !e.groupId || myGroupIds.has(e.groupId))
        .filter(e => !e.publishTime || now >= e.publishTime);
};












export { createExam, getExams, getExamById, listExamsForClassroom, updateExam, deleteExam, getOverviewStats, saveGeneratedExam, getMyExams };