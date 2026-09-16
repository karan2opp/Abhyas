-- Tables and columns the app already relied on that no earlier migration ever created: the block layer,
-- the generation-agent sessions and transcripts, and the question bank. They reached existing databases
-- outside the migration history, so a database built only from migrations was missing them.
-- Shapes are as they stood before 0029, which then adds its own columns and indexes. Idempotent: a database
-- that already has these is left untouched.

CREATE TABLE IF NOT EXISTS "exam_intent_sessions" (
    "id" text PRIMARY KEY NOT NULL,
    "created_by" text NOT NULL REFERENCES "users"("id"),
    "organisation_id" text REFERENCES "organisations"("id"),
    "exam_input" jsonb NOT NULL,
    "status" text DEFAULT 'in_progress' NOT NULL,
    "summary" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "blueprint_status" text DEFAULT 'pending' NOT NULL,
    "blueprint" jsonb,
    "blueprint_error" text,
    "questions_status" text DEFAULT 'pending' NOT NULL,
    "questions" jsonb,
    "questions_error" text
);

CREATE TABLE IF NOT EXISTS "exam_intent_messages" (
    "id" text PRIMARY KEY NOT NULL,
    "session_id" text NOT NULL REFERENCES "exam_intent_sessions"("id") ON DELETE CASCADE,
    "role" text NOT NULL,
    "content" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "blueprint_review_messages" (
    "id" text PRIMARY KEY NOT NULL,
    "session_id" text NOT NULL REFERENCES "exam_intent_sessions"("id") ON DELETE CASCADE,
    "role" text NOT NULL,
    "content" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "blocks" (
    "id" text PRIMARY KEY NOT NULL,
    "section_id" text REFERENCES "sections"("id") ON DELETE CASCADE,
    "assignment_id" text,
    "name" text NOT NULL,
    "subject" text NOT NULL,
    "question_type" "question_type" DEFAULT 'mcq' NOT NULL,
    "question_count" integer DEFAULT 0 NOT NULL,
    "total_marks" double precision DEFAULT 0 NOT NULL,
    "instructions" text[],
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "question_bank_documents" (
    "id" text PRIMARY KEY NOT NULL,
    "created_by" text NOT NULL REFERENCES "users"("id"),
    "organisation_id" text REFERENCES "organisations"("id"),
    "title" text NOT NULL,
    "file_url" text NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "total_chunks" integer DEFAULT 0 NOT NULL,
    "error" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "question_bank_chunks" (
    "id" text PRIMARY KEY NOT NULL,
    "document_id" text NOT NULL REFERENCES "question_bank_documents"("id") ON DELETE CASCADE,
    "organisation_id" text REFERENCES "organisations"("id"),
    "question_number" text,
    "raw_text" text NOT NULL,
    "subject" text,
    "topics" text[],
    "description" text,
    "page_start" integer NOT NULL,
    "page_end" integer NOT NULL,
    "images" jsonb DEFAULT '[]'::jsonb,
    "tables" jsonb DEFAULT '[]'::jsonb,
    "lists" jsonb DEFAULT '[]'::jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Questions (in exams and assignments) belong to a block.
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "block_id" text;
ALTER TABLE "assignment_questions" ADD COLUMN IF NOT EXISTS "block_id" text;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_block_id_blocks_id_fk') THEN
        ALTER TABLE "questions" ADD CONSTRAINT "questions_block_id_blocks_id_fk"
            FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignment_questions_block_id_blocks_id_fk') THEN
        ALTER TABLE "assignment_questions" ADD CONSTRAINT "assignment_questions_block_id_blocks_id_fk"
            FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE;
    END IF;
END $$;
