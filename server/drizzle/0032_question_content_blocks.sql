-- Rich question content: code listings, tables, and lists shown between the
-- question text and its options; and a per-option flag for options that are
-- themselves code (e.g. "which snippet reverses an array?").
--
-- Hand-written like 0029-0031: the drizzle snapshots are behind (several
-- tables were never captured), so `drizzle-kit generate` stops to ask about
-- each one interactively. Idempotent, safe to re-run.

-- Ordered array of { type: "code" | "table" | "list", ... }. Defaults to an
-- empty array so every existing question is unaffected — nothing renders
-- until a question is generated or edited to include one.
ALTER TABLE "questions"
    ADD COLUMN IF NOT EXISTS "content_blocks" jsonb DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE "options"
    ADD COLUMN IF NOT EXISTS "is_code" boolean DEFAULT false NOT NULL;
