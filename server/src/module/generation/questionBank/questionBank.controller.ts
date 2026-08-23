import type { Request, Response, NextFunction } from "express";
import fs from "fs";
import { ApiResponse } from "../../../common/utils/ApiResponse.js";
import { ApiError } from "../../../common/utils/ApiError.js";
import {
  addCuratedQuestions,
  listCuratedQuestions,
  deleteCuratedQuestion,
  indexQuestionBankContent,
} from "./questionBank.service.js";

export const addQuestionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = req.body;
    if (!input || (typeof input !== "object" && !Array.isArray(input))) {
      throw ApiError.badRequest("A question object or array of questions is required.");
    }

    // Staff (teacher/manager) always manage their own org's bank. A system
    // admin has no org — they may target a specific org (body.organisationId)
    // or the shared/global collection when none is given.
    const organisationId =
      (req.user?.role !== "system_admin" ? req.user?.organisationId : null)
      ?? (typeof req.body.organisationId === "string" ? req.body.organisationId : null);

    const result = await addCuratedQuestions(input, organisationId);
    return ApiResponse.ok(res, "Question(s) added to question bank", result);
  } catch (error) {
    next(error);
  }
};

export const listQuestionsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organisationId = req.user?.role !== "system_admin" ? req.user?.organisationId : null;
    const questions = await listCuratedQuestions(organisationId);
    return ApiResponse.ok(res, "Question bank fetched successfully", questions);
  } catch (error) {
    next(error);
  }
};

export const deleteQuestionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { questionId } = req.params;
    if (!questionId || typeof questionId !== "string" || questionId.trim() === "") {
      throw ApiError.badRequest("questionId is required.");
    }

    const organisationId = req.user?.role !== "system_admin" ? req.user?.organisationId : null;
    await deleteCuratedQuestion(questionId, organisationId);
    return ApiResponse.ok(res, "Question deleted from question bank", { questionId });
  } catch (error) {
    next(error);
  }
};

export const uploadQuestionBankFileHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw ApiError.badRequest("A markdown or JSON file is required.");
    }

    const content = fs.readFileSync(req.file.path, "utf-8");

    const organisationId =
      (req.user?.role !== "system_admin" ? req.user?.organisationId : null)
      ?? (typeof req.body.organisationId === "string" ? req.body.organisationId : null);

    const result = await indexQuestionBankContent(content, req.file.originalname, organisationId);
    return ApiResponse.ok(res, "Question bank file indexed successfully", result);
  } catch (error) {
    next(error);
  } finally {
    // Delete temporary file
    if (req.file && req.file.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (cleanupError) {
        console.error("Failed to delete temp file:", cleanupError);
      }
    }
  }
};