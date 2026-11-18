ALTER TABLE "classroom_students" ADD COLUMN IF NOT EXISTS "joined_with_code" text;
--> statement-breakpoint
ALTER TABLE "classroom_students" ADD COLUMN IF NOT EXISTS "joined_via" text;
