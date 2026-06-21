import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import * as superadminService from "./superadmin.service.js";

export const assignAdmin = async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await superadminService.assignAdmin(email);
    return ApiResponse.ok(res, `Successfully assigned admin role to ${email}`, {
        id: result!.id,
        email: result!.email,
        role: result!.role,
        name: result!.name
    });
};

export const revokeAdmin = async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await superadminService.revokeAdmin(email);
    return ApiResponse.ok(res, `Successfully revoked admin role from ${email}`, {
        id: result!.id,
        email: result!.email,
        role: result!.role,
        name: result!.name
    });
};

export const getAdmins = async (req: Request, res: Response) => {
    const admins = await superadminService.getAdmins();
    return ApiResponse.ok(res, `Admins fetched successfully`, admins);
};
