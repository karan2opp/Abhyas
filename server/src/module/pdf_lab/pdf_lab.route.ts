import { Router } from "express";
import multer from "multer";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import { extractPdfLabHandler } from "./pdf_lab.controller.js";

const pdfUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") cb(null, true);
        else cb(new Error("Only PDF files are allowed"));
    },
});

const router = Router();

router.post(
    "/extract",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    pdfUpload.single("file"),
    extractPdfLabHandler
);

export default router;
