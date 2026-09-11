import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../common/utils/ApiError.js";
import { runPdfLabExtraction } from "./pdf_lab.service.js";

export const extractPdfLabHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.file) throw ApiError.badRequest("A PDF file is required (field name: file)");
        if (req.file.mimetype !== "application/pdf") throw ApiError.badRequest("Only PDF files are supported");

        console.log(`[pdf-lab] extracting "${req.file.originalname}" (${req.file.size} bytes)`);
        const result = await runPdfLabExtraction(req.file.buffer);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};
