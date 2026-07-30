ALTER TABLE "submissions" ADD COLUMN "graded_by" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "graded_at" timestamp;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "overall_feedback" text;--> statement-breakpoint
ALTER TABLE "answers" ADD COLUMN "evaluated_by" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_graded_by_users_id_fk" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;