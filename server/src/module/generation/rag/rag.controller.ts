import type { Request, Response, NextFunction } from "express";
import fs from "fs";
import { ApiResponse } from "../../../common/utils/ApiResponse.js";
import { ApiError } from "../../../common/utils/ApiError.js";
import * as ragService from "./rag.service.js";

export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, topic, subtopic } = req.body;

    // Validate inputs
    if (!req.file) {
      throw ApiError.badRequest("File is required");
    }
    if (!subject || typeof subject !== "string" || subject.trim() === "") {
      throw ApiError.badRequest("Subject is required and cannot be empty");
    }

    // Resolve which org's collection this material belongs to. Staff (teacher /
    // manager) always index into their own org's collection. A system admin has
    // no org — they may target a specific org (body.organisationId) or the
    // shared/global collection when none is given.
    const organisationId =
      (req.user?.role !== "system_admin" ? req.user?.organisationId : null)
      ?? (typeof req.body.organisationId === "string" ? req.body.organisationId : null);

    const result = await ragService.indexDocument(
      req.file.path,
      req.file.originalname,
      subject,
      topic,
      subtopic,
      organisationId
    );

    if (result.chunksIndexed === 0) {
      return res.status(200).json({
        success: true,
        message: "This file has already been indexed.",
        data: {
          indexed: false,
          fileHash: result.fileHash,
          subject: subject.trim(),
          topic: topic ? topic.trim() : ""
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: "Document indexed successfully",
      data: {
        indexed: true,
        chunksIndexed: result.chunksIndexed,
        subject: subject.trim(),
        topic: topic ? topic.trim() : "",
        fileHash: result.fileHash
      }
    });

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

export const getCollections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organisationId = req.user?.role !== "system_admin" ? req.user?.organisationId : null;
    const collectionsList = await ragService.getDistinctCollections(organisationId);
    return ApiResponse.ok(res, "Indexed collections fetched successfully", collectionsList);
  } catch (error) {
    next(error);
  }
};

export const retrieveChunks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, topic, subtopic, topK } = req.query;

    if (!subject || typeof subject !== "string" || subject.trim() === "") {
      throw ApiError.badRequest("Subject is required and cannot be empty");
    }
    if (!topic || typeof topic !== "string" || topic.trim() === "") {
      throw ApiError.badRequest("Topic is required and cannot be empty");
    }

    const limit = topK ? parseInt(topK as string, 10) : 5;
    const organisationId = req.user?.role !== "system_admin" ? req.user?.organisationId : null;

    const chunks = await ragService.queryRelevantChunks(
      subject,
      topic,
      typeof subtopic === "string" ? subtopic : "",
      limit,
      organisationId
    );

    return ApiResponse.ok(res, "Relevant chunks retrieved successfully", chunks);
  } catch (error) {
    next(error);
  }
};
