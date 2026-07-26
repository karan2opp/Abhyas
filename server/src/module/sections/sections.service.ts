import { eq, and } from "drizzle-orm";
import db from "../../common/db/index.js";
import { sections, exams, questions, options } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import type { CreateSectionDto, UpdateSectionDto } from "./dto/section.dto.js";

import { PermissionService } from "../../common/permissions/index.js";

// ── Create Section ─────────────────────────────────────────────────────────────
const createSection = async (data: CreateSectionDto, teacherId: string) => {
    // verify exam belongs to teacher
    const hasAccess = await PermissionService.teacher.canManageExam(teacherId, data.examId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to create a section for this exam");

    const [section] = await db.insert(sections).values({
        title: data.title,
        examId: data.examId,
    }).returning();

    if (!section) throw ApiError.internal("Failed to create section");
    return section;
};

// ── Get All Sections of an Exam (teacher) ──────────────────────────────────────
const getSectionsByExam = async (examId: string, teacherId: string) => {
    // verify exam belongs to teacher
    const hasAccess = await PermissionService.teacher.canManageExam(teacherId, examId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to view this exam's sections");

    const result = await db.select().from(sections).where(eq(sections.examId, examId));
    return result;
};

// ── Get Sections with Questions and Options (teacher full view) ────────────────
const getSectionsWithDetails = async (examId: string, teacherId: string) => {
    // verify exam belongs to teacher
    const hasAccess = await PermissionService.teacher.canManageExam(teacherId, examId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to view this exam's details");

    const sectionsData = await db.select().from(sections).where(eq(sections.examId, examId));

    // fetch questions and options for each section
    const sectionsWithDetails = await Promise.all(
        sectionsData.map(async (section) => {
            const questionsData = await db.select().from(questions).where(eq(questions.sectionId, section.id));

            const questionsWithOptions = await Promise.all(
                questionsData.map(async (question) => {
                    const optionsData = await db.select().from(options).where(eq(options.questionId, question.id));
                    return { ...question, options: optionsData };
                })
            );

            return { ...section, questions: questionsWithOptions };
        })
    );

    return sectionsWithDetails;
};

// ── Update Section ─────────────────────────────────────────────────────────────
const updateSection = async (sectionId: string, data: UpdateSectionDto, teacherId: string) => {
    // verify section belongs to teacher's exam
    const hasAccess = await PermissionService.teacher.canManageSection(teacherId, sectionId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to update this section");

    const [updated] = await db.update(sections)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(sections.id, sectionId))
        .returning();

    return updated;
};

// ── Delete Section (cascades questions + options) ──────────────────────────────
const deleteSection = async (sectionId: string, teacherId: string) => {
    // verify section belongs to teacher's exam
    const hasAccess = await PermissionService.teacher.canManageSection(teacherId, sectionId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to delete this section");

    await db.delete(sections).where(eq(sections.id, sectionId));
    // questions and options are cascade deleted automatically by PostgreSQL
};

export { createSection, getSectionsByExam, getSectionsWithDetails, updateSection, deleteSection };