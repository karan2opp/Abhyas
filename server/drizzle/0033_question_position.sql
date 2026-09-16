-- Explicit, persisted ordering for questions within a section.
--
-- created_at cannot serve this purpose: an entire batch of questions
-- inserted in one transaction (the normal case for AI generation) shares
-- one identical timestamp, since Postgres's now() is fixed for the whole
-- transaction, not per row. Ordering by a tied column is not deterministic
-- across separate reads — which is exactly what let "question 4" resolve to
-- a different question in the exam-builder UI versus the review agent's own
-- fetch a moment later, and caused the wrong question to be replaced.
--
-- Hand-written like the migrations before it: the drizzle snapshots are
-- behind (several tables were never captured), so `drizzle-kit generate`
-- stops to ask about each one interactively. Idempotent, safe to re-run.

ALTER TABLE "questions"
    ADD COLUMN IF NOT EXISTS "position" integer DEFAULT 0 NOT NULL;

-- Backfill: number each section's EXISTING questions 0, 1, 2, ... in the
-- best approximation of their current order (created_at, then id as a
-- stable tie-break for the batch-inserted rows that share a timestamp) —
-- so nothing visibly reshuffles for anyone looking at an exam today. Future
-- inserts set position explicitly and never rely on this backfill logic.
WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY section_id ORDER BY created_at, id) - 1 AS rn
    FROM questions
)
UPDATE questions q SET position = ranked.rn
FROM ranked
WHERE q.id = ranked.id;

CREATE INDEX IF NOT EXISTS "questions_section_position_idx" ON "questions" ("section_id", "position");
