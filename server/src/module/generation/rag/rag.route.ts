import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadDocument, getCollections, retrieveChunks } from "./rag.controller.js";
import { authenticate, authorize } from "../../../common/middleware/auth.middleware.js";

const router = Router();

// Ensure tmp directory exists
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// PDF/Markdown Multer middleware
const docUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
  fileFilter: (req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const isPdf = file.mimetype === "application/pdf" || name.endsWith(".pdf");
    const isMarkdown =
      file.mimetype === "text/markdown" ||
      file.mimetype === "text/plain" ||
      name.endsWith(".md") ||
      name.endsWith(".markdown");

    if (isPdf || isMarkdown) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and Markdown files are allowed"));
    }
  }
});

// Route for uploading documents: POST /api/rag/upload (manager + system admin only)
router.post("/api/rag/upload", authenticate, authorize("manager", "system_admin"), docUpload.single("file"), uploadDocument);

// Routes for getting distinct collections: staff only (teacher, manager, system_admin)
router.get("/api/rag/collections", authenticate, authorize("teacher", "manager", "system_admin"), getCollections);
router.get("/api/rag/systemadmin/collections", authenticate, authorize("system_admin"), getCollections);

// Routes for querying relevant chunks: staff only (teacher, manager, system_admin)
router.get("/api/rag/retrieve", authenticate, authorize("teacher", "manager", "system_admin"), retrieveChunks);
router.get("/api/rag/systemadmin/retrieve", authenticate, authorize("system_admin"), retrieveChunks);

export default router;
