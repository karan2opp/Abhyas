import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import * as adminService from "./admin.service.js";

export const assignTeacher = async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await adminService.assignTeacher(email);
    return ApiResponse.ok(res, `Successfully assigned teacher role to ${email}`, {
        id: result!.id,
        email: result!.email,
        role: result!.role,
        name: result!.name
    });
};

export const revokeTeacher = async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await adminService.revokeTeacher(email);
    return ApiResponse.ok(res, `Successfully revoked teacher role from ${email}`, {
        id: result!.id,
        email: result!.email,
        role: result!.role,
        name: result!.name
    });
};

export const getTeachers = async (req: Request, res: Response) => {
    const teachers = await adminService.getTeachers();
    return ApiResponse.ok(res, `Teachers fetched successfully`, teachers);
};

export const searchUser = async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await adminService.getUserByEmail(email);
    return ApiResponse.ok(res, `User found`, result);
};
