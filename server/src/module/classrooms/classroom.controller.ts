import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import { ApiError } from "../../common/utils/ApiError.js";
import * as classroomService from "./classroom.service.js";

export const createClassroom = async (req: Request, res: Response) => {
    const organisationId = req.user!.organisationId;
    if (!organisationId) throw ApiError.badRequest("Your account is not linked to an organisation yet");

    const result = await classroomService.createClassroom(req.body, req.user!.id, organisationId);
    return ApiResponse.created(res, "Classroom created successfully", result);
};

export const updateClassroom = async (req: Request, res: Response) => {
    const result = await classroomService.updateClassroom(req.params.id as string, req.body, req.user!.id);
    return ApiResponse.ok(res, "Classroom updated successfully", result);
};

export const addTeacher = async (req: Request, res: Response) => {
    const result = await classroomService.addTeacher(req.params.id as string, req.body, {
        id: req.user!.id,
        role: req.user!.role,
        organisationId: req.user!.organisationId,
    });
    return ApiResponse.created(res, "Teacher added to classroom", result);
};

export const removeTeacher = async (req: Request, res: Response) => {
    await classroomService.removeTeacher(req.params.id as string, req.params.teacherId as string, {
        id: req.user!.id,
        role: req.user!.role,
        organisationId: req.user!.organisationId,
    });
    return ApiResponse.ok(res, "Teacher removed from classroom", null);
};

export const listTeachers = async (req: Request, res: Response) => {
    const result = await classroomService.listTeachers(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Classroom teachers", result);
};

export const inviteStudent = async (req: Request, res: Response) => {
    const result = await classroomService.inviteStudent(req.params.id as string, req.body, req.user!.id);
    return ApiResponse.created(res, "Invite sent to student", result);
};

export const regenerateJoinCode = async (req: Request, res: Response) => {
    const result = await classroomService.regenerateJoinCode(req.params.id as string, req.user!.id, req.body);
    return ApiResponse.ok(res, "Join code regenerated", result);
};

export const revokeJoinCode = async (req: Request, res: Response) => {
    const result = await classroomService.revokeJoinCode(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Join code revoked", result);
};

export const joinClassroom = async (req: Request, res: Response) => {
    const result = await classroomService.joinClassroom(req.body.joinCode, req.user!.id, req.user!.email);
    const message = result.alreadyJoined ? "You have already joined this classroom" : "Joined classroom successfully";
    return ApiResponse.ok(res, message, result);
};

export const getMyClassrooms = async (req: Request, res: Response) => {
    const result = await classroomService.getMyClassrooms(req.user!.id);
    return ApiResponse.ok(res, "Your classrooms", result);
};

export const getClassroomRoster = async (req: Request, res: Response) => {
    const result = await classroomService.getClassroomRoster(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Classroom roster", result);
};
