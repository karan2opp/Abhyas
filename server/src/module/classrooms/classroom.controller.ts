import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { parsePageParams } from "../../common/utils/pagination.js";
import * as classroomService from "./classroom.service.js";

const toRequester = (req: Request) => ({
    id: req.user!.id,
    role: req.user!.role,
    organisationId: req.user!.organisationId,
});

export const createClassroom = async (req: Request, res: Response) => {
    const organisationId = req.user!.organisationId;
    if (!organisationId) throw ApiError.badRequest("Your account is not linked to an organisation yet");

    const result = await classroomService.createClassroom(req.body, req.user!.id, organisationId);
    return ApiResponse.created(res, "Classroom created successfully", result);
};

export const updateClassroom = async (req: Request, res: Response) => {
    const result = await classroomService.updateClassroom(req.params.id as string, req.body, toRequester(req));
    return ApiResponse.ok(res, "Classroom updated successfully", result);
};

export const deleteClassroom = async (req: Request, res: Response) => {
    await classroomService.deleteClassroom(req.params.id as string, toRequester(req));
    return ApiResponse.ok(res, "Classroom deleted successfully", null);
};

export const addTeacher = async (req: Request, res: Response) => {
    const result = await classroomService.addTeacher(req.params.id as string, req.body, toRequester(req));
    return ApiResponse.created(res, "Teacher added to classroom", result);
};

export const removeTeacher = async (req: Request, res: Response) => {
    await classroomService.removeTeacher(req.params.id as string, req.params.teacherId as string, toRequester(req));
    return ApiResponse.ok(res, "Teacher removed from classroom", null);
};

export const listTeachers = async (req: Request, res: Response) => {
    const result = await classroomService.listTeachers(req.params.id as string, toRequester(req), req.query.search as string | undefined);
    return ApiResponse.ok(res, "Classroom teachers", result);
};

export const inviteStudent = async (req: Request, res: Response) => {
    const result = await classroomService.inviteStudent(req.params.id as string, req.body, toRequester(req));
    return ApiResponse.created(res, "Invite sent to student", result);
};

export const regenerateJoinCode = async (req: Request, res: Response) => {
    const result = await classroomService.regenerateJoinCode(req.params.id as string, toRequester(req), req.body);
    return ApiResponse.ok(res, "Join code regenerated", result);
};

export const revokeJoinCode = async (req: Request, res: Response) => {
    const result = await classroomService.revokeJoinCode(req.params.id as string, toRequester(req));
    return ApiResponse.ok(res, "Join code revoked", result);
};

export const updateJoinCode = async (req: Request, res: Response) => {
    const result = await classroomService.updateJoinCode(req.params.id as string, toRequester(req), req.body);
    return ApiResponse.ok(res, "Join code settings updated", result);
};

export const joinClassroom = async (req: Request, res: Response) => {
    const result = await classroomService.joinClassroom(req.body.joinCode, req.user!.id, req.user!.email);
    const message = result.alreadyJoined ? "You have already joined this classroom" : "Joined classroom successfully";
    return ApiResponse.ok(res, message, result);
};

export const getMyClassrooms = async (req: Request, res: Response) => {
    const result = await classroomService.getMyClassrooms(req.user!.id, parsePageParams(req.query, 9), req.query.search as string | undefined);
    return ApiResponse.ok(res, "Your classrooms", result);
};

export const getMyClassroomsAsStudent = async (req: Request, res: Response) => {
    const result = await classroomService.getMyClassroomsAsStudent(req.user!.id, parsePageParams(req.query, 9));
    return ApiResponse.ok(res, "Your classrooms", result);
};

export const getClassroom = async (req: Request, res: Response) => {
    const result = await classroomService.getClassroomById(req.params.id as string, toRequester(req));
    return ApiResponse.ok(res, "Classroom", result);
};

export const getClassroomRoster = async (req: Request, res: Response) => {
    // 12 to a page: the students page shows them three to a row.
    const result = await classroomService.getClassroomRoster(req.params.id as string, toRequester(req), parsePageParams(req.query, 12), req.query.search as string | undefined, {
        activeOnly: req.query.activeOnly === "true",
        notInGroup: (req.query.notInGroup as string | undefined) || undefined,
    });
    return ApiResponse.ok(res, "Classroom roster", result);
};

export const listOrganisationClassrooms = async (req: Request, res: Response) => {
    const organisationId = req.user!.organisationId;
    if (!organisationId) throw ApiError.badRequest("Your account is not linked to an organisation yet");

    const result = await classroomService.listOrganisationClassrooms(organisationId, parsePageParams(req.query, 9), req.query.search as string | undefined);
    return ApiResponse.ok(res, "Organisation classrooms", result);
};

export const getClassroomJoins = async (req: Request, res: Response) => {
    const result = await classroomService.getClassroomJoins(req.params.id as string, toRequester(req), parsePageParams(req.query));
    return ApiResponse.ok(res, "Classroom joins", result);
};

export const getAllJoins = async (req: Request, res: Response) => {
    const result = await classroomService.getAllJoins(parsePageParams(req.query), req.query.search as string | undefined);
    return ApiResponse.ok(res, "All classroom joins", result);
};
