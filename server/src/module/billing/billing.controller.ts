import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import { ApiError } from "../../common/utils/ApiError.js";
import * as plansService from "./plans.service.js";
import * as subscriptionService from "./subscription.service.js";
import * as usageService from "./usage.service.js";

// ── Plans ────────────────────────────────────────────────────────────────────
export const listPlans = async (req: Request, res: Response) => {
    const result = await plansService.listPlans();
    return ApiResponse.ok(res, "Subscription plans", result);
};

// ── Subscription (system_admin assigns) ──────────────────────────────────────
export const assignPlan = async (req: Request, res: Response) => {
    const { organisationId, planId, customLimits } = req.body;
    const result = await subscriptionService.assignPlanToOrganisation(organisationId, planId, customLimits);
    return ApiResponse.ok(res, "Plan assigned successfully", result);
};

export const getSubscriptionByOrg = async (req: Request, res: Response) => {
    const result = await subscriptionService.getOrganisationSubscription(req.params.orgId as string);
    if (!result) throw ApiError.notFound("Organisation has no subscription");
    return ApiResponse.ok(res, "Organisation subscription", result);
};

// ── Subscription (manager purchases for own org; Razorpay wired later) ───────
export const getMySubscription = async (req: Request, res: Response) => {
    const organisationId = req.user!.organisationId;
    if (!organisationId) throw ApiError.badRequest("You are not associated with an organisation");
    const result = await subscriptionService.getOrganisationSubscription(organisationId);
    if (!result) throw ApiError.notFound("Organisation has no subscription");
    return ApiResponse.ok(res, "Organisation subscription", result);
};

export const purchasePlan = async (req: Request, res: Response) => {
    const organisationId = req.user!.organisationId;
    if (!organisationId) throw ApiError.badRequest("You are not associated with an organisation");
    const { planId, customLimits } = req.body;
    const result = await subscriptionService.purchasePlanForOrganisation(organisationId, planId, customLimits);
    return ApiResponse.ok(res, "Plan purchased successfully", result);
};

// ── Usage ────────────────────────────────────────────────────────────────────
export const getMyUsage = async (req: Request, res: Response) => {
    const organisationId = req.user!.organisationId;
    if (!organisationId) throw ApiError.badRequest("You are not associated with an organisation");
    const usage = await usageService.getUsage(organisationId);
    const activeStudents = await usageService.getActiveStudentCount(organisationId);
    return ApiResponse.ok(res, "Organisation usage", { usage, activeStudents });
};

export const getOrgUsage = async (req: Request, res: Response) => {
    const usage = await usageService.getUsage(req.params.orgId as string);
    const activeStudents = await usageService.getActiveStudentCount(req.params.orgId as string);
    return ApiResponse.ok(res, "Organisation usage", { usage, activeStudents });
};