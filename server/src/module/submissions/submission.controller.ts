import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import * as submissionsService from "./submission.service.js";

export const joinExam = async (req: Request, res: Response) => {
    const result = await submissionsService.joinExam(req.body.joinCode, req.user!.id);
    return ApiResponse.ok(res, "Exam joined successfully", result);
};

export const submitExam = async (req: Request, res: Response) => {
    const result = await submissionsService.submitExam(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Exam submitted successfully", result);
};

export const getSubmissionById = async (req: Request, res: Response) => {
    const submission = await submissionsService.getSubmissionById(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Submission fetched successfully", submission);
};

export const getSubmissionsByExam = async (req: Request, res: Response) => {
    const submissions = await submissionsService.getSubmissionsByExam(req.params.examId as string, req.user!.id);
    return ApiResponse.ok(res, "Submissions fetched successfully", submissions);
};

export const deleteSubmission = async (req: Request, res: Response) => {
    await submissionsService.deleteSubmission(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Submission deleted successfully", null);
};