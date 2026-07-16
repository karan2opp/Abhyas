import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import * as examService from "./exam.service.js";

export const createExam = async (req: Request, res: Response) => {
    const exam = await examService.createExam(req.body, req.user!.id);
    return ApiResponse.created(res, "Exam created successfully", exam);
};

export const saveGeneratedExam = async (req: Request, res: Response) => {
    const exam = await examService.saveGeneratedExam(req.body, req.user!.id);
    return ApiResponse.created(res, "Generated exam saved successfully", exam);
};

export const generateFromForm = async (req: Request, res: Response) => {
    const examData = await examService.generateExamFromForm(req.body, req.user!.id);
    return ApiResponse.ok(res, "Exam generated successfully", examData);
};

export const getExams = async (req: Request, res: Response) => {
    const { search, days, page, limit } = req.query;
    const examsData = await examService.getExams(
        req.user!.id,
        search as string,
        days as string,
        Number(page) || 1,
        Number(limit) || 10
    );
    return ApiResponse.ok(res, "Exams fetched successfully", examsData);
};

export const getExamById = async (req: Request, res: Response) => {
    const exam = await examService.getExamById(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Exam fetched successfully", exam);
};

export const updateExam = async (req: Request, res: Response) => {
    const exam = await examService.updateExam(req.params.id as string, req.body, req.user!.id);
    return ApiResponse.ok(res, "Exam updated successfully", exam);
};

export const deleteExam = async (req: Request, res: Response) => {
    await examService.deleteExam(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Exam deleted successfully", null);
};

export const getOverviewStats = async (req: Request, res: Response) => {
    const stats = await examService.getOverviewStats(req.user!.id);
    return ApiResponse.ok(res, "Overview stats fetched successfully", stats);
};