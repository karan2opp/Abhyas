import { z } from "zod";

export const customLimitsSchema = z.object({
    baseStudents: z.number().int().min(0).optional(),
    bufferStudents: z.number().int().min(0).optional(),
    maxQuestionGenerations: z.number().int().min(0).optional(),
    maxQuestionEvaluations: z.number().int().min(0).optional(),
});

export const assignPlanSchema = z.object({
    organisationId: z.string({ message: "organisationId is required" }),
    planId: z.string({ message: "planId is required" }),
    customLimits: customLimitsSchema.optional(),
});

export const purchasePlanSchema = z.object({
    planId: z.string({ message: "planId is required" }),
    customLimits: customLimitsSchema.optional(),
});

export type AssignPlanDto = z.infer<typeof assignPlanSchema>;
export type PurchasePlanDto = z.infer<typeof purchasePlanSchema>;