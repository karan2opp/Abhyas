-- Transcript for the Question Review Agent.
--
-- Hand-written like 0029/0030: the drizzle snapshots are behind, so
-- `drizzle-kit generate` stops to ask about uncaptured tables. Idempotent.
--
-- Keyed by exam_id rather than a generation session: this agent edits a real
-- saved exam, so its conversation outlives any one pipeline run. No foreign
-- key to exams — the transcript is deliberately kept if the exam is removed,
-- matching how the other agent transcripts are retained.

CREATE TABLE IF NOT EXISTS "question_review_messages" (
    "id" text PRIMARY KEY NOT NULL,
    "exam_id" text NOT NULL,
    "role" text NOT NULL,
    "content" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Every read is "this exam's turns, newest first".
CREATE INDEX IF NOT EXISTS "question_review_messages_exam_created_idx"
    ON "question_review_messages" ("exam_id", "created_at" DESC);
