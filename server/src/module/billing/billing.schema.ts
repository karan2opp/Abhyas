import { pgTable, text, integer, boolean, doublePrecision, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { organisations } from "../organisations/organisation.schema.js";

// ── Subscription plans (Basic / Pro / Custom) ─────────────────────────────────
// baseStudents + bufferStudents = hard student cap. Question generation and
// evaluation limits are exact (no buffer). Period is monthly.
export const plans = pgTable("plans", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  isCustom: boolean("is_custom").default(false).notNull(),
  period: text("period").default("monthly").notNull(),
  price: doublePrecision("price").default(0).notNull(),
  baseStudents: integer("base_students").default(0).notNull(),
  bufferStudents: integer("buffer_students").default(0).notNull(),
  maxQuestionGenerations: integer("max_question_generations").default(0).notNull(),
  maxQuestionEvaluations: integer("max_question_evaluations").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const planStatusEnum = ["active", "trialing", "expired", "cancelled"] as const;
export type PlanStatus = (typeof planStatusEnum)[number];

// ── Organisation subscription ──────────────────────────────────────────────────
// Effective limits are snapshotted onto the subscription at assignment time
// (for custom plans these differ from the plan template). Enforcement reads the
// subscription's stored limits directly, avoiding joins at meter time.
export const organisationSubscriptions = pgTable("organisation_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organisationId: text("organisation_id")
    .references(() => organisations.id, { onDelete: "cascade" })
    .notNull(),
  planId: text("plan_id").references(() => plans.id).notNull(),
  status: text("status").$type<PlanStatus>().default("active").notNull(),
  // Snapshot of the effective limits for this organisation.
  baseStudents: integer("base_students").default(0).notNull(),
  bufferStudents: integer("buffer_students").default(0).notNull(),
  maxQuestionGenerations: integer("max_question_generations").default(0).notNull(),
  maxQuestionEvaluations: integer("max_question_evaluations").default(0).notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("org_subscriptions_active_org_idx").on(table.organisationId),
]);

export const usageMetricEnum = ["question_generation", "question_evaluation", "active_students"] as const;
export type UsageMetric = (typeof usageMetricEnum)[number];

// ── Usage counters ─────────────────────────────────────────────────────────────
// Atomic per-org per-metric per-period counter. period e.g. "2026-08".
export const usageCounters = pgTable("usage_counters", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organisationId: text("organisation_id")
    .references(() => organisations.id, { onDelete: "cascade" })
    .notNull(),
  metric: text("metric").$type<UsageMetric>().notNull(),
  period: text("period").notNull(),
  count: integer("count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("usage_counters_org_metric_period_idx").on(table.organisationId, table.metric, table.period),
]);

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type OrganisationSubscription = typeof organisationSubscriptions.$inferSelect;
export type NewOrganisationSubscription = typeof organisationSubscriptions.$inferInsert;
export type UsageCounter = typeof usageCounters.$inferSelect;
export type NewUsageCounter = typeof usageCounters.$inferInsert;
