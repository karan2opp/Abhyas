-- Book indexing pipeline: an uploaded book, its numbered blocks, the
-- chapter/section/subsection tree, each subsection's markdown content, and
-- its images. Hand-written like the migrations before it (the drizzle
-- snapshots are behind). Idempotent, safe to re-run.

CREATE TABLE IF NOT EXISTS "books" (
    "id" text PRIMARY KEY NOT NULL,
    "created_by" text NOT NULL REFERENCES "users"("id"),
    "organisation_id" text REFERENCES "organisations"("id"),
    "title" text NOT NULL,
    "file_url" text NOT NULL,
    "visibility" text DEFAULT 'private' NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "progress" jsonb,
    "page_count" integer,
    "toc" jsonb,
    "error" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "book_blocks" (
    "id" text PRIMARY KEY NOT NULL,
    "book_id" text NOT NULL REFERENCES "books"("id") ON DELETE CASCADE,
    "seq" integer NOT NULL,
    "page" integer NOT NULL,
    "type" text NOT NULL,
    "text" text NOT NULL,
    "font_size" real,
    "bold" boolean DEFAULT false NOT NULL,
    "heading_level_hint" integer,
    "heading_source" text,
    "image_url" text,
    "image_width" integer,
    "image_height" integer,
    CONSTRAINT "book_blocks_book_seq_unique" UNIQUE ("book_id", "seq")
);

CREATE TABLE IF NOT EXISTS "book_nodes" (
    "id" text PRIMARY KEY NOT NULL,
    "book_id" text NOT NULL REFERENCES "books"("id") ON DELETE CASCADE,
    "parent_id" text REFERENCES "book_nodes"("id") ON DELETE CASCADE,
    "level" text NOT NULL,
    "position" integer NOT NULL,
    "title" text NOT NULL,
    "title_generated" boolean DEFAULT false NOT NULL,
    "description" text,
    "key_concepts" text[],
    "page_start" integer NOT NULL,
    "page_end" integer NOT NULL,
    "start_block" integer NOT NULL,
    "end_block" integer NOT NULL
);
CREATE INDEX IF NOT EXISTS "book_nodes_book_position_idx" ON "book_nodes" ("book_id", "position");

CREATE TABLE IF NOT EXISTS "book_contents" (
    "id" text PRIMARY KEY NOT NULL,
    "book_id" text NOT NULL REFERENCES "books"("id") ON DELETE CASCADE,
    "node_id" text NOT NULL UNIQUE REFERENCES "book_nodes"("id") ON DELETE CASCADE,
    "markdown" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "book_images" (
    "id" text PRIMARY KEY NOT NULL,
    "book_id" text NOT NULL REFERENCES "books"("id") ON DELETE CASCADE,
    "node_id" text NOT NULL REFERENCES "book_nodes"("id") ON DELETE CASCADE,
    "position" integer NOT NULL,
    "block_seq" integer NOT NULL,
    "page" integer NOT NULL,
    "caption" text,
    "url" text NOT NULL,
    "width" integer,
    "height" integer
);
CREATE INDEX IF NOT EXISTS "book_images_node_idx" ON "book_images" ("node_id");
