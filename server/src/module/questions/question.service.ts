import { eq, and, inArray } from "drizzle-orm";
import db from "../../common/db/index.js";
import { questions, options, sections, exams } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { PermissionService, type Requester } from "../../common/permissions/index.js";
import type { CreateQuestionDto, UpdateQuestionDto } from "./dto/question.dto.js";
import { uploadToCloudinary } from "../../common/config/cloudinary.js";
// ── Helper: verify section is manageable by the requester (creator, opted-in co-teacher, or manager) ─
const verifySectionAccess = async (sectionId: string, requester: Requester) => {
    const [section] = await db.select({
        id: sections.id,
        examId: sections.examId,
    })
        .from(sections)
        .where(eq(sections.id, sectionId));

    if (!section) throw ApiError.notFound("Section not found");

    const hasAccess = await PermissionService.canManageExam(requester, section.examId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized");
    return section;
};

// ── Helper: verify question is manageable by the requester (creator, opted-in co-teacher, or manager) ─
const verifyQuestionAccess = async (questionId: string, requester: Requester) => {
    const [question] = await db.select({
        id: questions.id,
        sectionId: questions.sectionId,
        type: questions.type,
        description: questions.description,
        marks: questions.marks,
        createdAt: questions.createdAt,
        updatedAt: questions.updatedAt,
        examId: sections.examId,
    })
        .from(questions)
        .innerJoin(sections, eq(questions.sectionId, sections.id))
        .where(eq(questions.id, questionId));

    if (!question) throw ApiError.notFound("Question not found");

    const hasAccess = await PermissionService.canManageExam(requester, question.examId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized");
    return question;
};

const recalculateExamTotalMarks = async (examId: string, tx: any = db) => {
    const sectionsList = await tx.select({ id: sections.id })
        .from(sections)
        .where(eq(sections.examId, examId));
    
    if (sectionsList.length === 0) {
        await tx.update(exams).set({ totalMarks: 0, updatedAt: new Date() }).where(eq(exams.id, examId));
        return;
    }

    const sectionIds = sectionsList.map((s: any) => s.id);
    const questionsList = await tx.select({ marks: questions.marks })
        .from(questions)
        .where(inArray(questions.sectionId, sectionIds));

    const totalMarks = questionsList.reduce((sum: number, q: any) => sum + (q.marks || 0), 0);

    await tx.update(exams)
        .set({ totalMarks, updatedAt: new Date() })
        .where(eq(exams.id, examId));
};

// ── Create Question ────────────────────────────────────────────────────────────
const createQuestion = async (
    data: CreateQuestionDto,
    requester: Requester,
    imageFiles?: Express.Multer.File[]
) => {
    const section = await verifySectionAccess(data.sectionId, requester);

    const uploadedImages: { url: string; publicId: string }[] = [];

    if (imageFiles && imageFiles.length > 0) {
        const uploadPromises = imageFiles.map((file) =>
            uploadToCloudinary(file.buffer, "questions")
        );
        const results = await Promise.all(uploadPromises);
        uploadedImages.push(...results.map((r) => ({ url: r.url, publicId: r.publicId })));
    }

    const result = await db.transaction(async (tx) => {
        const [question] = await tx.insert(questions).values({
            sectionId: data.sectionId,
            blockId: data.blockId ?? null,
            type: data.type,
            description: data.description,
            marks: data.marks,
            images: uploadedImages.length > 0 ? uploadedImages : null,
        }).returning();

        if (!question) throw ApiError.internal("Failed to create question");

        let optionsData: typeof options.$inferSelect[] = [];

        if (data.type === "mcq" && data.options && data.options.length > 0) {
            optionsData = await tx.insert(options).values(
                data.options.map(opt => ({
                    questionId: question.id,
                    value: opt.value,
                    isCorrect: opt.isCorrect,
                }))
            ).returning();
        }

        await recalculateExamTotalMarks(section.examId, tx);

        return { ...question, options: optionsData };
    });

    return result;
};

// ── Get All Questions by Section ───────────────────────────────────────────────
const getQuestionsBySection = async (sectionId: string, requester: Requester) => {
    await verifySectionAccess(sectionId, requester);

    const questionsData = await db.select().from(questions).where(eq(questions.sectionId, sectionId));

    const questionsWithOptions = await Promise.all(
        questionsData.map(async (question) => {
            const optionsData = await db.select().from(options).where(eq(options.questionId, question.id));
            return { ...question, options: optionsData };
        })
    );

    return questionsWithOptions;
};

// ── Get Single Question with Options ──────────────────────────────────────────
const getQuestionById = async (questionId: string, requester: Requester) => {
    const question = await verifyQuestionAccess(questionId, requester);
    const optionsData = await db.select().from(options).where(eq(options.questionId, questionId));
    return { ...question, options: optionsData };
};

// ── Update Question (with smart options merge) ─────────────────────────────────
const updateQuestion = async (questionId: string, data: UpdateQuestionDto, requester: Requester, imageFiles?: Express.Multer.File[]) => {
    const question = await verifyQuestionAccess(questionId, requester);

    const uploadedImages: { url: string; publicId: string }[] = [];

    if (imageFiles && imageFiles.length > 0) {
        const uploadPromises = imageFiles.map((file) =>
            uploadToCloudinary(file.buffer, "questions")
        );
        const results = await Promise.all(uploadPromises);
        uploadedImages.push(...results.map((r) => ({ url: r.url, publicId: r.publicId })));
    }

    const result = await db.transaction(async (tx) => {
        // update question fields
        const [updated] = await tx.update(questions)
            .set({
                ...(data.description && { description: data.description }),
                ...(data.marks && { marks: data.marks }),
                ...(uploadedImages.length > 0 && { images: uploadedImages }),
                updatedAt: new Date(),
            })
            .where(eq(questions.id, questionId))
            .returning();

        if (!updated) throw ApiError.internal("Failed to update question");

        if (data.options && data.options.length > 0) {
            // separate options into update and create
            const toUpdate = data.options.filter(opt => opt.id)
            const toCreate = data.options.filter(opt => !opt.id)

            // ids included in request — keep these
            const incomingIds = toUpdate.map(opt => opt.id as string)

            // delete options not included in request
            const existingOptions = await tx.select().from(options).where(eq(options.questionId, questionId))
            const toDelete = existingOptions.filter(opt => !incomingIds.includes(opt.id))

            if (toDelete.length > 0) {
                await tx.delete(options).where(
                    inArray(options.id, toDelete.map(opt => opt.id))
                )
            }

            // update existing options
            await Promise.all(
                toUpdate.map(opt =>
                    tx.update(options)
                        .set({
                            value: opt.value,
                            isCorrect: opt.isCorrect,
                            updatedAt: new Date(),
                        })
                        .where(eq(options.id, opt.id as string))
                )
            )

            // create new options
            if (toCreate.length > 0) {
                await tx.insert(options).values(
                    toCreate.map(opt => ({
                        questionId,
                        value: opt.value!,
                        isCorrect: opt.isCorrect!,
                    }))
                )
            }
        }

        await recalculateExamTotalMarks(question.examId, tx);

        const updatedOptions = await tx.select().from(options).where(eq(options.questionId, questionId))
        return { ...updated, options: updatedOptions };
    });

    return result;
};

// ── Delete Question (cascades options) ────────────────────────────────────────
const deleteQuestion = async (questionId: string, requester: Requester) => {
    const question = await verifyQuestionAccess(questionId, requester);
    await db.transaction(async (tx) => {
        await tx.delete(questions).where(eq(questions.id, questionId));
        await recalculateExamTotalMarks(question.examId, tx);
    });
};
export { createQuestion, getQuestionsBySection, getQuestionById, updateQuestion, deleteQuestion };