-- Question bank: per-document sharing, plus parsed options/answer key.
--
-- Hand-written rather than generated: the drizzle snapshots are behind (the
-- question_bank / exam_intent / blocks tables were never captured), so
-- `drizzle-kit generate` treats them as new tables and stops to ask whether
-- each one is a rename. Idempotent, so it is safe to re-run.

-- Sharing model: "private" (uploader only) or "organisation" (any
-- teacher/manager/system_admin in the same org). Existing rows stay private.
ALTER TABLE "question_bank_documents"
    ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'private' NOT NULL;

-- The question stem with option/answer lines lifted out. Nullable: rows
-- indexed before this change keep raw_text as their only text.
ALTER TABLE "question_bank_chunks"
    ADD COLUMN IF NOT EXISTS "question_text" text;

-- Parsed MCQ choices: [{ "label": "A", "text": "Paris" }, ...].
ALTER TABLE "question_bank_chunks"
    ADD COLUMN IF NOT EXISTS "options" jsonb DEFAULT '[]'::jsonb;

-- The answer label when the source paper prints one; null when it does not.
ALTER TABLE "question_bank_chunks"
    ADD COLUMN IF NOT EXISTS "correct_option" text;

-- Listing documents filters on (created_by) or (visibility, organisation_id).
CREATE INDEX IF NOT EXISTS "question_bank_documents_created_by_idx"
    ON "question_bank_documents" ("created_by");

CREATE INDEX IF NOT EXISTS "question_bank_documents_org_visibility_idx"
    ON "question_bank_documents" ("organisation_id", "visibility");
