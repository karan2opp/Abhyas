import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import { ApiError } from "../../common/utils/ApiError.js";
import * as organisationService from "./organisation.service.js";

export const createOrganisation = async (req: Request, res: Response) => {
    const result = await organisationService.createOrganisation(req.body);
    return ApiResponse.created(res, "Organisation created successfully", result);
};

export const listOrganisations = async (req: Request, res: Response) => {
    const result = await organisationService.listOrganisations();
    return ApiResponse.ok(res, "Organisations", result);
};

// ── Org details (manager sees/updates own org; system_admin manages any org) ─
export const getMyOrganisation = async (req: Request, res: Response) => {
    const result = await organisationService.getOrganisationById(req.user!.organisationId!);
    return ApiResponse.ok(res, "Organisation details", result);
};

export const getMyOrganisationForStudent = async (req: Request, res: Response) => {
    const result = await organisationService.getOrganisationForStudent(req.user!.id);
    return ApiResponse.ok(res, "Organisation details", result);
};

export const getMyOrganisationForTeacher = async (req: Request, res: Response) => {
    const result = await organisationService.getOrganisationForTeacher(req.user!.id);
    return ApiResponse.ok(res, "Organisation details", result);
};

export const deleteOrganisation = async (req: Request, res: Response) => {
    const result = await organisationService.deleteOrganisation(req.params.id as string);
    return ApiResponse.ok(res, "Organisation deleted", result);
};

export const updateMyOrganisation = async (req: Request, res: Response) => {
    const result = await organisationService.updateOrganisation(req.user!.organisationId!, req.body);
    return ApiResponse.ok(res, "Organisation updated successfully", result);
};

export const uploadMyOrganisationLogo = async (req: Request, res: Response) => {
    if (!req.file) throw ApiError.badRequest("No logo file provided");
    const result = await organisationService.uploadOrganisationLogo(req.user!.organisationId!, req.file);
    return ApiResponse.ok(res, "Organisation logo uploaded successfully", result);
};

export const getOrganisationById = async (req: Request, res: Response) => {
    const result = await organisationService.getOrganisationById(req.params.id as string);
    return ApiResponse.ok(res, "Organisation details", result);
};

export const updateOrganisationById = async (req: Request, res: Response) => {
    const result = await organisationService.updateOrganisation(req.params.id as string, req.body);
    return ApiResponse.ok(res, "Organisation updated successfully", result);
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
    const result = await organisationService.getOrganisationManagers(req.params.id as string, req.query.search as string | undefined);
    return ApiResponse.ok(res, "Organisation managers", result);
};

// ── Manager-scoped: manage teachers within their own organisation ────────────
export const getMyOrganisationTeachers = async (req: Request, res: Response) => {
    const result = await organisationService.getOrganisationTeachers(req.user!.organisationId!, req.query.search as string | undefined);
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
