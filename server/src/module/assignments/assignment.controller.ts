import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import * as assignmentService from "./assignment.service.js";

export const createAssignment = async (req: Request, res: Response) => {
    const result = await assignmentService.createAssignment(req.body, req.user!.id);
    return ApiResponse.created(res, "Assignment created successfully", result);
};

export const updateAssignment = async (req: Request, res: Response) => {
    const result = await assignmentService.updateAssignment(req.params.id as string, req.body, req.user!.id);
    return ApiResponse.ok(res, "Assignment updated successfully", result);
};

export const deleteAssignment = async (req: Request, res: Response) => {
    await assignmentService.deleteAssignment(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Assignment deleted successfully", null);
};

export const listAssignmentsForClassroom = async (req: Request, res: Response) => {
    const result = await assignmentService.listAssignmentsForClassroom(req.params.classroomId as string, req.user!.id);
    return ApiResponse.ok(res, "Assignments", result);
};

export const getAssignmentById = async (req: Request, res: Response) => {
    const result = req.user!.role === "student"
        ? await assignmentService.getAssignmentForStudent(req.params.id as string, req.user!.id)
        : await assignmentService.getAssignmentById(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Assignment", result);
};

export const createQuestion = async (req: Request, res: Response) => {
    const result = await assignmentService.createQuestion(req.body, req.user!.id);
    return ApiResponse.created(res, "Question created successfully", result);
};

export const updateQuestion = async (req: Request, res: Response) => {
    const result = await assignmentService.updateQuestion(req.params.id as string, req.body, req.user!.id);
    return ApiResponse.ok(res, "Question updated successfully", result);
};

export const deleteQuestion = async (req: Request, res: Response) => {
    await assignmentService.deleteQuestion(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Question deleted successfully", null);
};

export const getQuestions = async (req: Request, res: Response) => {
    const result = req.user!.role === "student"
        ? await assignmentService.getQuestionsForStudent(req.params.id as string, req.user!.id)
        : await assignmentService.getQuestionsForTeacher(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Questions", result);
};

export const getMyAssignments = async (req: Request, res: Response) => {
    const result = await assignmentService.getMyAssignments(req.user!.id);
    return ApiResponse.ok(res, "Your assignments", result);
};

export const startAssignment = async (req: Request, res: Response) => {
    const result = await assignmentService.startAssignment(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Assignment started", result);
};

export const saveAnswer = async (req: Request, res: Response) => {
    const result = await assignmentService.saveAnswer(req.body, req.user!.id);
    return ApiResponse.ok(res, "Answer saved", result);
};

export const submitAssignment = async (req: Request, res: Response) => {
    const result = await assignmentService.submitAssignment(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Assignment submitted successfully", result);
};

export const getMySubmission = async (req: Request, res: Response) => {
    const result = await assignmentService.getMySubmission(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Your submission", result);
};

export const getSubmissionsForAssignment = async (req: Request, res: Response) => {
    const result = await assignmentService.getSubmissionsForAssignment(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Submissions", result);
};

export const getSubmissionById = async (req: Request, res: Response) => {
    const result = await assignmentService.getSubmissionById(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Submission", result);
};

export const gradeSubmission = async (req: Request, res: Response) => {
    const result = await assignmentService.gradeSubmission(req.params.id as string, req.body, req.user!.id);
    return ApiResponse.ok(res, "Submission graded successfully", result);
};
