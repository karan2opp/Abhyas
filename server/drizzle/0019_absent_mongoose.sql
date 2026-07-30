CREATE TABLE "assignment_series" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"classroom_id" text NOT NULL,
	"group_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "start_date" timestamp;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "series_id" text;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "day_gap" integer;--> statement-breakpoint
ALTER TABLE "assignment_series" ADD CONSTRAINT "assignment_series_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_series" ADD CONSTRAINT "assignment_series_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_series" ADD CONSTRAINT "assignment_series_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_series_id_assignment_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."assignment_series"("id") ON DELETE cascade ON UPDATE no action;