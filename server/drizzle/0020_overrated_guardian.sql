CREATE TYPE "public"."series_type" AS ENUM('weekly', 'custom');--> statement-breakpoint
ALTER TABLE "assignment_series" ADD COLUMN "type" "series_type" DEFAULT 'weekly' NOT NULL;