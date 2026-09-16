import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ApiError } from "../../common/utils/ApiError.js";
import { inngest } from "../../common/inngest/client.js";
import { uploadRawToCloudinary, deleteFromCloudinaryByUrl } from "../../common/config/cloudinary.js";
import { canAccessDocument } from "../question_bank/question_bank.service.js";
import type { QuestionBankAccess } from "../question_bank/qdrant_client.js";
import { questionBankVisibilityEnum } from "../question_bank/question_bank.schema.js";
import { createBook, deleteBook, getBook, getSubsectionContent, listAccessibleBooks, setBookVisibility } from "./book.service.js";

const accessOf = (req: Request): QuestionBankAccess => ({
    userId: req.user!.id,
    organisationId: req.user!.organisationId ?? null,
});

type BookRow = NonNullable<Awaited<ReturnType<typeof getBook>>>;

async function loadAccessibleBook(req: Request): Promise<BookRow> {
    const book = await getBook(String(req.params.bookId));
    // 404, not 403, so a book the caller can't reach isn't confirmed to exist.
    if (!book || (req.user!.role !== "system_admin" && !canAccessDocument(book, accessOf(req)))) {
        throw ApiError.notFound("Book not found");
    }
    return book;
}

function assertOwnsBook(book: BookRow, req: Request) {
    if (book.createdBy !== req.user!.id && req.user!.role !== "system_admin") throw ApiError.forbidden("Not your book");
}

export const uploadBookHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.file) throw ApiError.badRequest("A PDF file is required (field name: file)");
        if (req.file.mimetype !== "application/pdf") throw ApiError.badRequest("Only PDF files are supported");

        const requestedVisibility = req.body?.visibility;
        if (requestedVisibility !== undefined && !questionBankVisibilityEnum.includes(requestedVisibility)) {
            throw ApiError.badRequest(`visibility must be one of: ${questionBankVisibilityEnum.join(", ")}`);
        }
        const visibility = requestedVisibility === "organisation" ? "organisation" : "private";
        if (visibility === "organisation" && !req.user?.organisationId) {
            throw ApiError.badRequest("You must belong to an organisation before sharing a book with it");
        }

        const uploaded = await uploadRawToCloudinary(req.file.buffer, "books/pdfs");
        const title = typeof req.body?.title === "string" && req.body.title.trim()
            ? req.body.title.trim()
            : req.file.originalname.replace(/\.pdf$/i, "");

        const book = await createBook({
            title,
            fileUrl: uploaded.url,
            createdBy: req.user!.id,
            organisationId: req.user?.organisationId ?? null,
            visibility,
        });

        try {
            await inngest.send({ name: "book/index", data: { bookId: book.id } });
        } catch {
            throw ApiError.internal("Could not reach the background job service (Inngest). Is it running?");
        }

        res.status(202).json({ success: true, data: { bookId: book.id, status: book.status } });
    } catch (err) {
        next(err);
    }
};

export const listBooksHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        res.json({ success: true, data: await listAccessibleBooks(accessOf(req)) });
    } catch (err) {
        next(err);
    }
};

export const getBookHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        res.json({ success: true, data: await loadAccessibleBook(req) });
    } catch (err) {
        next(err);
    }
};

export const getSubsectionContentHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const book = await loadAccessibleBook(req);
        const content = await getSubsectionContent(book.id, String(req.params.nodeId));
        if (!content) throw ApiError.notFound("Subsection not found");
        res.json({ success: true, data: content });
    } catch (err) {
        next(err);
    }
};

const VisibilityRequestZodSchema = z.object({ visibility: z.enum(questionBankVisibilityEnum) });

export const setBookVisibilityHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const parsed = VisibilityRequestZodSchema.safeParse(req.body);
        if (!parsed.success) throw ApiError.badRequest("visibility must be private or organisation");
        const book = await loadAccessibleBook(req);
        assertOwnsBook(book, req);
        if (parsed.data.visibility === "organisation" && !book.organisationId) {
            throw ApiError.badRequest("This book isn't linked to an organisation, so it can't be shared");
        }
        res.json({ success: true, data: await setBookVisibility(book.id, parsed.data.visibility) });
    } catch (err) {
        next(err);
    }
};

export const deleteBookHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const book = await loadAccessibleBook(req);
        assertOwnsBook(book, req);
        const imageUrls = await deleteBook(book.id);
        // Best-effort cleanup after the rows are gone; a leftover file never blocks the delete.
        void Promise.all([book.fileUrl, ...imageUrls].map((url) => deleteFromCloudinaryByUrl(url)));
        res.json({ success: true, data: { bookId: book.id } });
    } catch (err) {
        next(err);
    }
};
