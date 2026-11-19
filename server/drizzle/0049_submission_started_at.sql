ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "started_at" timestamp;
--> statement-breakpoint
-- Attempts made before this column existed had their clock running from the moment they were created.
UPDATE "submissions" SET "started_at" = "created_at" WHERE "started_at" IS NULL;
