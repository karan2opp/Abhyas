CREATE TABLE "organisation_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"organisation_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"base_students" integer DEFAULT 0 NOT NULL,
	"buffer_students" integer DEFAULT 0 NOT NULL,
	"max_question_generations" integer DEFAULT 0 NOT NULL,
	"max_question_evaluations" integer DEFAULT 0 NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"period" text DEFAULT 'monthly' NOT NULL,
	"price" double precision DEFAULT 0 NOT NULL,
	"base_students" integer DEFAULT 0 NOT NULL,
	"buffer_students" integer DEFAULT 0 NOT NULL,
	"max_question_generations" integer DEFAULT 0 NOT NULL,
	"max_question_evaluations" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"id" text PRIMARY KEY NOT NULL,
	"organisation_id" text NOT NULL,
	"metric" text NOT NULL,
	"period" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "logo_public_id" text;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "status" text DEFAULT 'DRAFT' NOT NULL;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "allow_co_teacher_edit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organisation_subscriptions" ADD CONSTRAINT "organisation_subscriptions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisation_subscriptions" ADD CONSTRAINT "organisation_subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "org_subscriptions_active_org_idx" ON "organisation_subscriptions" USING btree ("organisation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_counters_org_metric_period_idx" ON "usage_counters" USING btree ("organisation_id","metric","period");--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_active_exam_user_idx" ON "submissions" USING btree ("exam_id","user_id") WHERE "submissions"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "answers_submission_question_idx" ON "answers" USING btree ("submission_id","question_id");