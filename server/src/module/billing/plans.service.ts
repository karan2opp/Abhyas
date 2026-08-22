import { eq, asc } from "drizzle-orm";
import db from "../../common/db/index.js";
import { plans } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";

export const listPlans = async () => {
    return await db.select().from(plans).orderBy(asc(plans.price), asc(plans.name));
};

export const getPlanById = async (planId: string) => {
    const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
    if (!plan) throw ApiError.notFound("Plan not found");
    return plan;
};
