import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import * as groupService from "./group.service.js";

export const createGroup = async (req: Request, res: Response) => {
    const result = await groupService.createGroup(req.body, req.user!.id);
    return ApiResponse.created(res, "Group created successfully", result);
};

export const updateGroup = async (req: Request, res: Response) => {
    const result = await groupService.updateGroup(req.params.id as string, req.body, req.user!.id);
    return ApiResponse.ok(res, "Group updated successfully", result);
};

export const deleteGroup = async (req: Request, res: Response) => {
    await groupService.deleteGroup(req.params.id as string, req.user!.id);
    return ApiResponse.ok(res, "Group deleted successfully", null);
};

export const listGroups = async (req: Request, res: Response) => {
    const result = await groupService.listGroups(req.params.classroomId as string, {
        id: req.user!.id,
        role: req.user!.role,
        organisationId: req.user!.organisationId ?? null,
    });
    return ApiResponse.ok(res, "Groups", result);
};

export const addStudentToGroup = async (req: Request, res: Response) => {
    const result = await groupService.addStudentToGroup(req.params.id as string, req.body, req.user!.id);
    return ApiResponse.created(res, "Student added to group", result);
};

export const removeStudentFromGroup = async (req: Request, res: Response) => {
    await groupService.removeStudentFromGroup(req.params.id as string, req.params.studentId as string, req.user!.id);
    return ApiResponse.ok(res, "Student removed from group", null);
};

export const getGroupMembers = async (req: Request, res: Response) => {
    const result = await groupService.getGroupMembers(req.params.id as string, req.user!.id, req.query.search as string | undefined);
    return ApiResponse.ok(res, "Group members", result);
};

export const getMyGroups = async (req: Request, res: Response) => {
    const classroomId = req.query.classroomId as string | undefined;
    if (!classroomId) return ApiResponse.ok(res, "My groups", []);
    const result = await groupService.getMyGroups(req.user!.id, classroomId);
    return ApiResponse.ok(res, "My groups", result);
};
