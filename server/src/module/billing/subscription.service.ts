import { eq } from "drizzle-orm";
import db from "../../common/db/index.js";
import { organisationSubscriptions } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { getPlanById } from "./plans.service.js";

export interface CustomPlanLimits {
    baseStudents?: number;
    bufferStudents?: number;
    maxQuestionGenerations?: number;
    maxQuestionEvaluations?: number;
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// ── Assign a plan to an organisation ─────────────────────────────────────────
// system_admin assigns plans. For custom plans, effective limits come from
// customLimits; for standard plans they come from the plan template. Effective
// limits are snapshotted onto the subscription so meter-time reads are simple.
export const assignPlanToOrganisation = async (
    organisationId: string,
    planId: string,
    customLimits?: CustomPlanLimits
) => {
    const plan = await getPlanById(planId);
    if (!plan.isActive) throw ApiError.badRequest("Plan is not active");

    const effective = plan.isCustom
        ? {
            baseStudents: customLimits?.baseStudents ?? 0,
            bufferStudents: customLimits?.bufferStudents ?? 0,
            maxQuestionGenerations: customLimits?.maxQuestionGenerations ?? 0,
            maxQuestionEvaluations: customLimits?.maxQuestionEvaluations ?? 0,
        }
        : {
            baseStudents: plan.baseStudents,
            bufferStudents: plan.bufferStudents,
            maxQuestionGenerations: plan.maxQuestionGenerations,
            maxQuestionEvaluations: plan.maxQuestionEvaluations,
        };

    const now = new Date();
    const periodEnd = new Date(now.getTime() + MONTH_MS);

    const [existing] = await db
        .select()
        .from(organisationSubscriptions)
        .where(eq(organisationSubscriptions.organisationId, organisationId));

    if (existing) {
        const [updated] = await db.update(organisationSubscriptions)
            .set({
                planId,
                status: "active",
                ...effective,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                updatedAt: now,
            })
            .where(eq(organisationSubscriptions.id, existing.id))
            .returning();
        return updated;
    }

    const [created] = await db.insert(organisationSubscriptions)
        .values({
            organisationId,
            planId,
            status: "active",
            ...effective,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
        })
        .returning();
    return created;
};

export const getOrganisationSubscription = async (organisationId: string) => {
    const [sub] = await db
        .select()
        .from(organisationSubscriptions)
        .where(eq(organisationSubscriptions.organisationId, organisationId));
    return sub ?? null;
};

// Manager can "purchase" a plan. Razorpay integration comes later; for now this
// assigns the plan immediately (a stand-in for a successful payment callback).
export const purchasePlanForOrganisation = async (
    organisationId: string,
    planId: string,
    customLimits?: CustomPlanLimits
) => {
    return assignPlanToOrganisation(organisationId, planId, customLimits);
};
