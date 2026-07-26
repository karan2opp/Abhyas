import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import * as organisationService from "./organisation.service.js";

export const createOrganisation = async (req: Request, res: Response) => {
    const result = await organisationService.createOrganisation(req.body);
    return ApiResponse.created(res, "Organisation created successfully", result);
};

export const listOrganisations = async (req: Request, res: Response) => {
    const result = await organisationService.listOrganisations();
    return ApiResponse.ok(res, "Organisations", result);
};

export const assignUser = async (req: Request, res: Response) => {
    const result = await organisationService.assignUserToOrganisation(
        req.params.userId as string,
        req.body.organisationId
    );
    return ApiResponse.ok(res, "User assigned to organisation", result);
};

export const assignManager = async (req: Request, res: Response) => {
    const result = await organisationService.assignManager(req.body.email, req.params.id as string);
    return ApiResponse.ok(res, "Manager assigned successfully", result);
};

export const revokeManager = async (req: Request, res: Response) => {
    const result = await organisationService.revokeManager(req.params.userId as string);
    return ApiResponse.ok(res, "Manager revoked successfully", result);
};

export const getOrganisationManagers = async (req: Request, res: Response) => {
    const result = await organisationService.getOrganisationManagers(req.params.id as string);
    return ApiResponse.ok(res, "Organisation managers", result);
};

// ── Manager-scoped: manage teachers within their own organisation ────────────
export const getMyOrganisationTeachers = async (req: Request, res: Response) => {
    const result = await organisationService.getOrganisationTeachers(req.user!.organisationId!);
    return ApiResponse.ok(res, "Organisation teachers", result);
};

export const assignTeacherToMyOrganisation = async (req: Request, res: Response) => {
    const result = await organisationService.assignTeacherToOrganisation(req.user!.organisationId!, req.body.email);
    return ApiResponse.ok(res, "Teacher assigned to organisation", result);
};

export const removeTeacherFromMyOrganisation = async (req: Request, res: Response) => {
    const result = await organisationService.removeTeacherFromOrganisation(req.user!.organisationId!, req.params.userId as string);
    return ApiResponse.ok(res, "Teacher removed from organisation", result);
};
