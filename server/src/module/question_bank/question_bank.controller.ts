import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ApiError } from "../../common/utils/ApiError.js";
import { inngest } from "../../common/inngest/client.js";
import { uploadRawToCloudinary, deleteFromCloudinaryByUrl } from "../../common/config/cloudinary.js";
import {
    createDocument,
    getDocument,
    getDocumentsByIds,
    listAccessibleDocuments,
    canAccessDocument,
    setDocumentVisibility,
    renameDocument,
    getChunksByDocument,
    deleteDocument,
    searchQuestionBank,
} from "./question_bank.service.js";
import { deleteQuestionBankPointsByDocument, type QuestionBankAccess } from "./qdrant_client.js";
import { questionBankVisibilityEnum } from "./question_bank.schema.js";
import { generateQuestionsFromDocuments } from "./question_bank_generator.js";
import { assertQuota, recordUsage } from "../billing/usage.service.js";
import { QuestionTypeZodEnum, DifficultyZodEnum } from "../generation_agents/Types/inputExam.js";

const accessOf = (req: Request): QuestionBankAccess => ({
    userId: req.user!.id,
    organisationId: req.user!.organisationId ?? null,
});

// Reading a document's questions — own, or shared by the organisation.
function assertCanAccessDocument(
    document: { createdBy: string; organisationId: string | null; visibility: "private" | "organisation" },
    req: Request
) {
    if (req.user!.role === "system_admin") return;
    if (!canAccessDocument(document, accessOf(req))) {
        // 404, not 403 — a document the caller can't reach shouldn't be
        // confirmed to exist.
        throw ApiError.notFound("Document not found");
    }
}

// Changing or destroying a document — uploader only. Sharing a document with
// the organisation lets colleagues USE it, never rename or delete it.
function assertOwnsDocument(document: { createdBy: string }, req: Request) {
    if (document.createdBy !== req.user!.id && req.user!.role !== "system_admin") {
        throw ApiError.forbidden("Not your document");
    }
}

export const uploadDocumentHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.file) throw ApiError.badRequest("A PDF file is required (field name: file)");
        if (req.file.mimetype !== "application/pdf") throw ApiError.badRequest("Only PDF files are supported");

        // Multipart field, so it arrives as a string — private unless the
        // uploader explicitly shares it.
        const requestedVisibility = req.body?.visibility;
        if (requestedVisibility !== undefined && !questionBankVisibilityEnum.includes(requestedVisibility)) {
            throw ApiError.badRequest(`visibility must be one of: ${questionBankVisibilityEnum.join(", ")}`);
        }
        const visibility = requestedVisibility === "organisation" ? "organisation" : "private";
        if (visibility === "organisation" && !req.user?.organisationId) {
            throw ApiError.badRequest("You must belong to an organisation before sharing a document with it");
        }

        const uploaded = await uploadRawToCloudinary(req.file.buffer, "question-bank/documents");
        const title = typeof req.body?.title === "string" && req.body.title.trim() ? req.body.title.trim() : req.file.originalname;

        const document = await createDocument({
            title,
            fileUrl: uploaded.url,
            createdBy: req.user!.id,
            organisationId: req.user?.organisationId ?? null,
            visibility,
        });

        try {
            await inngest.send({ name: "question-bank/document.process", data: { documentId: document.id } });
        } catch (sendError) {
            throw ApiError.internal("Could not reach the background job service (Inngest) — is it running?");
        }

        console.log(`[question-bank] uploaded "${title}" as document ${document.id}, processing started`);
        res.status(202).json({ success: true, data: { documentId: document.id, status: document.status } });
    } catch (err) {
        next(err);
    }
};

export const listDocumentsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const documents = await listAccessibleDocuments(accessOf(req));
        res.json({ success: true, data: documents });
    } catch (err) {
        next(err);
    }
};

export const getDocumentStatusHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const document = await getDocument(String(req.params.documentId));
        if (!document) throw ApiError.notFound("Document not found");
        // The document row carries fileUrl — a direct link to the uploaded
        // PDF — so this is gated on access, not left open.
        assertCanAccessDocument(document, req);
        res.json({ success: true, data: document });
    } catch (err) {
        next(err);
    }
};

const RenameDocumentRequestZodSchema = z.object({
    title: z.string().trim().min(1).max(200),
});

export const renameDocumentHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const document = await getDocument(String(req.params.documentId));
        if (!document) throw ApiError.notFound("Document not found");
        assertOwnsDocument(document, req);

        const parsed = RenameDocumentRequestZodSchema.safeParse(req.body);
        if (!parsed.success) {
            const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
            throw ApiError.badRequest(`Invalid request body: ${issues}`);
        }

        const updated = await renameDocument(document.id, parsed.data.title);
        res.json({ success: true, data: updated });
    } catch (err) {
        next(err);
    }
};

export const deleteDocumentHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const document = await getDocument(String(req.params.documentId));
        if (!document) throw ApiError.notFound("Document not found");
        assertOwnsDocument(document, req);

        const chunks = await getChunksByDocument(document.id);

        await deleteQuestionBankPointsByDocument(document.id).catch((err) =>
            console.warn(`[question-bank] failed to delete Qdrant points for ${document.id}:`, err?.message)
        );

        await deleteFromCloudinaryByUrl(document.fileUrl);
        await Promise.all(
            chunks.flatMap((chunk) => (chunk.images ?? []).map((img) => deleteFromCloudinaryByUrl(img.url)))
        );

        await deleteDocument(document.id);

        console.log(`[question-bank] deleted document ${document.id} ("${document.title}") and ${chunks.length} chunk(s)`);
        res.json({ success: true, data: { documentId: document.id } });
    } catch (err) {
        next(err);
    }
};

const SetVisibilityRequestZodSchema = z.object({
    visibility: z.enum(questionBankVisibilityEnum),
});

export const setDocumentVisibilityHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const document = await getDocument(String(req.params.documentId));
        if (!document) throw ApiError.notFound("Document not found");
        // Only the uploader decides how their document is shared.
        assertOwnsDocument(document, req);

        const parsed = SetVisibilityRequestZodSchema.safeParse(req.body);
        if (!parsed.success) {
            throw ApiError.badRequest(`visibility must be one of: ${questionBankVisibilityEnum.join(", ")}`);
        }
        if (parsed.data.visibility === "organisation" && !document.organisationId) {
            throw ApiError.badRequest("This document has no organisation to share with");
        }

        const updated = await setDocumentVisibility(document.id, parsed.data.visibility);
        console.log(`[question-bank] document ${document.id} visibility set to ${parsed.data.visibility}`);
        res.json({ success: true, data: updated });
    } catch (err) {
        next(err);
    }
};

async function assertDocumentsReady(documentIds: string[], req: Request) {
    const documents = await getDocumentsByIds(documentIds);
    if (documents.length !== documentIds.length) throw ApiError.notFound("One or more documents were not found");
    // Generation feeds these documents' contents into the response, so the
    // caller has to be able to reach every one of them — their own, or ones
    // their organisation has shared.
    for (const document of documents) assertCanAccessDocument(document, req);
    const notReady = documents.find((d) => d.status !== "completed");
    if (notReady) throw ApiError.badRequest(`Document "${notReady.title}" is still processing`);
}

const GenerateFromDocumentsRequestZodSchema = z.object({
    documentIds: z.array(z.string()).min(1),
    topics: z.object({
        high: z.array(z.string()).default([]),
        mid: z.array(z.string()).default([]),
        low: z.array(z.string()).default([]),
    }),
    difficulty: DifficultyZodEnum,
    questionCount: z.number().int().min(1).max(50),
    questionType: QuestionTypeZodEnum,
    marks: z.number().positive(),
});

export const generateFromDocumentsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const parsed = GenerateFromDocumentsRequestZodSchema.safeParse(req.body);
        if (!parsed.success) {
            const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
            throw ApiError.badRequest(`Invalid request body: ${issues}`);
        }

        await assertDocumentsReady(parsed.data.documentIds, req);

        // Metered against the same question_generation quota as the exam
        // pipeline — checked up front for the requested count, then recorded
        // against what was actually produced (allocation can generate fewer
        // when there are more topics than questions).
        const organisationId = req.user?.organisationId ?? null;
        if (organisationId) {
            await assertQuota(organisationId, "question_generation", parsed.data.questionCount);
        }

        const groups = await generateQuestionsFromDocuments(parsed.data, accessOf(req));

        if (organisationId) {
            const generated = groups.reduce((n, group) => n + group.questions.length, 0);
            try {
                await recordUsage(organisationId, "question_generation", generated);
            } catch (meterErr) {
                console.error(`[Billing] Failed to record generation usage for org ${organisationId}:`, meterErr);
            }
        }

        res.json({ success: true, data: { groups } });
    } catch (err) {
        next(err);
    }
};

const SearchRequestZodSchema = z.object({
    query: z.string().min(1),
    subject: z.string().optional(),
    topics: z.array(z.string()).optional(),
    limit: z.number().min(1).max(50).optional(),
});

export const searchQuestionBankHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const parsed = SearchRequestZodSchema.safeParse(req.body);
        if (!parsed.success) {
            const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
            throw ApiError.badRequest(`Invalid request body: ${issues}`);
        }

        const results = await searchQuestionBank(parsed.data.query, accessOf(req), {
            ...(parsed.data.subject !== undefined ? { subject: parsed.data.subject } : {}),
            ...(parsed.data.topics !== undefined ? { topics: parsed.data.topics } : {}),
            ...(parsed.data.limit !== undefined ? { limit: parsed.data.limit } : {}),
        });

        res.json({ success: true, data: results });
    } catch (err) {
        next(err);
    }
};
