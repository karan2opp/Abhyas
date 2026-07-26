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
