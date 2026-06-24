import { eq, and, count, inArray, avg, desc } from "drizzle-orm";
import db from "../../common/db/index.js";
import { exams } from "../../common/db/schema.js";
import { submissions } from "../submissions/submission.schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import type { CreateExamDto, UpdateExamDto } from "./dto/exam.dto.js";

// ── Generate Join Code ─────────────────────────────────────────────────────────
const generateJoinCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// ── Create Exam ────────────────────────────────────────────────────────────────
const createExam = async (data: CreateExamDto, teacherId: string) => {
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

    const [exam] = await db.insert(exams).values({
        ...data,
        duration: calculatedDuration || 60, // fallback to 60 if somehow null
        joinCode,
        createdBy: teacherId,
    }).returning();

    if (!exam) throw ApiError.internal("Failed to create exam");
    return exam;
};

// ── Get All Exams (teacher sees only his own) ──────────────────────────────────
const getExams = async (teacherId: string) => {
    const result = await db.select().from(exams).where(eq(exams.createdBy, teacherId));
    return result;
};

// ── Get Single Exam ────────────────────────────────────────────────────────────
const getExamById = async (examId: string, teacherId: string) => {
    const [exam] = await db.select().from(exams).where(
        and(eq(exams.id, examId), eq(exams.createdBy, teacherId))
    );
    if (!exam) throw ApiError.notFound("Exam not found");
    return exam;
};

// ── Update Exam ────────────────────────────────────────────────────────────────
const updateExam = async (examId: string, data: UpdateExamDto, teacherId: string) => {
    const [existing] = await db.select().from(exams).where(
        and(eq(exams.id, examId), eq(exams.createdBy, teacherId))
    );
    if (!existing) throw ApiError.notFound("Exam not found");

    // Calculate new duration if start/end times change
    let calculatedDuration = data.duration;
    const finalType = data.type !== undefined ? data.type : existing.type;
    const finalStartTime = data.startTime !== undefined ? data.startTime : existing.startTime;
    const finalEndTime = data.endTime !== undefined ? data.endTime : existing.endTime;

    if (finalType === "SCHEDULED" && finalStartTime && finalEndTime) {
        calculatedDuration = Math.round((new Date(finalEndTime).getTime() - new Date(finalStartTime).getTime()) / 60000);
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
const deleteExam = async (examId: string, teacherId: string) => {
    const [existing] = await db.select().from(exams).where(
        and(eq(exams.id, examId), eq(exams.createdBy, teacherId))
    );
    if (!existing) throw ApiError.notFound("Exam not found");

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

export { createExam, getExams, getExamById, updateExam, deleteExam, getOverviewStats };