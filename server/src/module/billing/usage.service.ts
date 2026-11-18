import { and, eq, gte, sql, count } from "drizzle-orm";
import db from "../../common/db/index.js";
import { usageCounters, classrooms, classroomStudents, users, aiUsageLog, type UsageMetric } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { getOrganisationSubscription } from "./subscription.service.js";
import { CREDIT_USD } from "../ai_usage/ai_usage_report.service.js";

export const getCurrentPeriodKey = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const getLimitForMetric = (sub: { baseStudents: number; bufferStudents: number; maxQuestionGenerations: number; maxQuestionEvaluations: number }, metric: UsageMetric): number => {
    switch (metric) {
        case "question_generation":
            return sub.maxQuestionGenerations;
        case "question_evaluation":
            return sub.maxQuestionEvaluations;
        case "active_students":
            return sub.baseStudents + sub.bufferStudents;
    }
};

export const getUsage = async (organisationId: string, metric?: UsageMetric) => {
    const period = getCurrentPeriodKey();
    const conditions = metric
        ? [
            eq(usageCounters.organisationId, organisationId),
            eq(usageCounters.metric, metric),
            eq(usageCounters.period, period),
        ]
        : [
            eq(usageCounters.organisationId, organisationId),
            eq(usageCounters.period, period),
        ];
    return await db.select().from(usageCounters).where(and(...conditions));
};

// ── Atomic increment with lazy period reset ───────────────────────────────────
// If a counter row exists for a stale period, we reset it to 0 then add the new
// amount. Handled via upsert on the unique (org, metric, period) index.
export const recordUsage = async (organisationId: string, metric: UsageMetric, amount: number) => {
    if (amount <= 0) return;
    const period = getCurrentPeriodKey();
    await db.insert(usageCounters)
        .values({ organisationId, metric, period, count: amount })
        .onConflictDoUpdate({
            target: [usageCounters.organisationId, usageCounters.metric, usageCounters.period],
            set: {
                count: sql`${usageCounters.count} + ${amount}`,
                updatedAt: new Date(),
            },
        });
};

// ── Pre-check quota before performing a metered action ───────────────────────
// Throws 402 (no plan / plan does not include metric) or 429 (over quota).
export const assertQuota = async (organisationId: string, metric: UsageMetric, amount: number) => {
    const sub = await getOrganisationSubscription(organisationId);
    if (!sub || sub.status !== "active") {
        throw new ApiError(402, "No active subscription for this organisation");
    }

    // AI work (generating and grading) stops when the month's credits are used up. Grading is then left for the teacher.
    if (metric === "question_generation" || metric === "question_evaluation") await assertCredits(organisationId);

    const limit = getLimitForMetric(sub, metric);
    if (limit <= 0) {
        throw new ApiError(402, `Your plan does not include ${metric.replace(/_/g, " ")}`);
    }

    const period = getCurrentPeriodKey();
    const [counter] = await db
        .select()
        .from(usageCounters)
        .where(and(
            eq(usageCounters.organisationId, organisationId),
            eq(usageCounters.metric, metric),
            eq(usageCounters.period, period),
        ));

    const used = counter?.count ?? 0;
    if (used + amount > limit) {
        throw new ApiError(
            429,
            `Quota exceeded for ${metric.replace(/_/g, " ")}. Used ${used} of ${limit}.`
        );
    }
};

// ── Count active students across an org's classrooms ─────────────────────────
export const getActiveStudentCount = async (organisationId: string): Promise<number> => {
    const [result] = await db
        .select({ value: count() })
        .from(classroomStudents)
        .innerJoin(classrooms, eq(classrooms.id, classroomStudents.classroomId))
        .where(and(
            eq(classrooms.organisationId, organisationId),
            eq(classroomStudents.status, "active"),
        ));
    return Number(result?.value ?? 0);
};

// ── Pre-check the org's student seat capacity (base + buffer hard cap) ───────
export const assertStudentQuota = async (organisationId: string) => {
    const sub = await getOrganisationSubscription(organisationId);
    if (!sub || sub.status !== "active") {
        throw new ApiError(402, "No active subscription for this organisation");
    }

    const limit = sub.baseStudents + sub.bufferStudents;
    if (limit <= 0) {
        throw new ApiError(402, "Your plan does not include student seats");
    }

    const current = await getActiveStudentCount(organisationId);
    if (current + 1 > limit) {
        throw new ApiError(
            429,
            `Student limit reached (${current}/${limit}). Upgrade your plan or remove inactive students.`
        );
    }
};

// ── AI credits (1 credit = $0.10 of AI cost, counted from the usage log, per calendar month like the counters above) ──
export const getCreditsUsed = async (organisationId: string): Promise<number> => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [row] = await db
        .select({ total: sql<number>`coalesce(sum(${aiUsageLog.costUsd}), 0)` })
        .from(aiUsageLog)
        .where(and(eq(aiUsageLog.organisationId, organisationId), gte(aiUsageLog.createdAt, monthStart)));
    return Number(row?.total ?? 0) / CREDIT_USD;
};

/** What the plan allows and what this month has used. `limit` is null when the plan has no credit limit. */
export const getCreditsSummary = async (organisationId: string) => {
    const sub = await getOrganisationSubscription(organisationId);
    return { limit: sub?.credits ?? null, used: await getCreditsUsed(organisationId) };
};

// Stops new AI work once the plan's credits are used up. No organisation, no plan, or no credit limit: nothing to stop.
export const assertCredits = async (organisationId: string | null | undefined) => {
    if (!organisationId) return;
    const sub = await getOrganisationSubscription(organisationId);
    if (!sub || sub.status !== "active" || sub.credits == null) return;

    const used = await getCreditsUsed(organisationId);
    if (used >= sub.credits) {
        throw new ApiError(
            402,
            `Your organisation's AI credits for this month are used up (${used.toFixed(1)} of ${sub.credits}). Ask your administrator to add credits.`
        );
    }
};

// ── Staff seats (an empty limit means no limit; a staff member leaving frees the seat) ──
const countStaff = async (organisationId: string, role: "teacher" | "manager"): Promise<number> => {
    const [result] = await db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.organisationId, organisationId), eq(users.role, role)));
    return Number(result?.value ?? 0);
};

export const getStaffCounts = async (organisationId: string) => ({
    teachers: await countStaff(organisationId, "teacher"),
    managers: await countStaff(organisationId, "manager"),
});

export const assertTeacherQuota = async (organisationId: string) => {
    const sub = await getOrganisationSubscription(organisationId);
    if (!sub || sub.maxTeachers == null) return;
    const current = await countStaff(organisationId, "teacher");
    if (current + 1 > sub.maxTeachers) {
        throw new ApiError(429, `Teacher limit reached (${current}/${sub.maxTeachers}). Ask your administrator to upgrade the plan.`);
    }
};

export const assertManagerQuota = async (organisationId: string) => {
    const sub = await getOrganisationSubscription(organisationId);
    if (!sub || sub.maxManagers == null) return;
    const current = await countStaff(organisationId, "manager");
    if (current + 1 > sub.maxManagers) {
        throw new ApiError(429, `Manager limit reached (${current}/${sub.maxManagers}). Ask your administrator to upgrade the plan.`);
    }
};
