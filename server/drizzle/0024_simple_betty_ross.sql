ALTER TABLE "assignments" ADD COLUMN "difficulty" text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "difficulty" text DEFAULT 'medium' NOT NULL;