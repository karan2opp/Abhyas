ALTER TABLE "organisations" ADD COLUMN "join_code" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD CONSTRAINT "organisations_join_code_unique" UNIQUE("join_code");