import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  addQuestionHandler,
  listQuestionsHandler,
  deleteQuestionHandler,
  uploadQuestionBankFileHandler,
} from "./questionBank.controller.js";
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

// Markdown/JSON Multer middleware for question-bank files
const bankUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
  fileFilter: (req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const isMarkdown =
      file.mimetype === "text/markdown" ||
      file.mimetype === "text/plain" ||
      name.endsWith(".md") ||
      name.endsWith(".markdown");
    const isJson = file.mimetype === "application/json" || name.endsWith(".json");

    if (isMarkdown || isJson) {
      cb(null, true);
    } else {
      cb(new Error("Only Markdown (.md) and JSON (.json) files are allowed"));
    }
  }
});

router.post(
  "/api/question-bank",
  authenticate,
  authorize("manager", "system_admin"),
  addQuestionHandler
);

router.post(
  "/api/question-bank/upload",
  authenticate,
  authorize("manager", "system_admin"),
  bankUpload.single("file"),
  uploadQuestionBankFileHandler
);

router.get(
  "/api/question-bank",
  authenticate,
  authorize("teacher", "manager", "system_admin"),
  listQuestionsHandler
);

router.delete(
  "/api/question-bank/:questionId",
  authenticate,
  authorize("manager", "system_admin"),
  deleteQuestionHandler
);

export default router;