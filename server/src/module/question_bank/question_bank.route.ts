import { Router } from "express";
import multer from "multer";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import {
    uploadDocumentHandler,
    listDocumentsHandler,
    getDocumentStatusHandler,
    renameDocumentHandler,
    deleteDocumentHandler,
    generateFromDocumentsHandler,
    searchQuestionBankHandler,
} from "./question_bank.controller.js";

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
    "/documents",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    pdfUpload.single("file"),
    uploadDocumentHandler
);

router.get(
    "/documents",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    listDocumentsHandler
);

router.get(
    "/documents/:documentId",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    getDocumentStatusHandler
);

router.patch(
    "/documents/:documentId",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    renameDocumentHandler
);

router.delete(
    "/documents/:documentId",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    deleteDocumentHandler
);

router.post(
    "/generate",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    generateFromDocumentsHandler
);

router.post(
    "/search",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    searchQuestionBankHandler
);

export default router;
