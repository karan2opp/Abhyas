ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "max_teachers" integer;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "max_managers" integer;
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "credits" integer;
--> statement-breakpoint
ALTER TABLE "organisation_subscriptions" ADD COLUMN IF NOT EXISTS "max_teachers" integer;
--> statement-breakpoint
ALTER TABLE "organisation_subscriptions" ADD COLUMN IF NOT EXISTS "max_managers" integer;
--> statement-breakpoint
ALTER TABLE "organisation_subscriptions" ADD COLUMN IF NOT EXISTS "credits" integer;
--> statement-breakpoint
INSERT INTO "plans" ("id", "name", "is_custom", "period", "price", "base_students", "buffer_students", "max_question_generations", "max_question_evaluations", "has_voice_agent", "max_teachers", "max_managers", "credits", "is_active")
SELECT 'plan_trial', 'trial', false, 'monthly', 0, 100, 0, 100000, 100000, false, 10, 1, 50, true
WHERE NOT EXISTS (SELECT 1 FROM "plans" WHERE "name" = 'trial');
