import { pgTable, text, timestamp, doublePrecision, integer, jsonb } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { sections } from "../sections/section.schema.js";
import { blocks } from "../blocks/block.schema.js";
import { questionTypeEnum } from "./question-type.enum.js";

// Supplementary content shown between the question text and its options (for
// an MCQ) — a code listing, a table, or a list. Deliberately NOT html: raw
// markup from a model can't be validated and would be an XSS vector on a page
// students are logged into, so each kind gets its own typed, renderable shape
// instead. Optional and usually absent — only add one when the question is
// unreadable without it (e.g. "what does this code print?").
export interface CodeContentBlock {
  type: "code";
  language: string;
  code: string;
}

export interface TableContentBlock {
  type: "table";
  headers: string[];
  rows: string[][];
}

export interface ListContentBlock {
  type: "list";
  ordered: boolean;
  items: string[];
}

export type QuestionContentBlock = CodeContentBlock | TableContentBlock | ListContentBlock;

export const questions = pgTable("questions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  sectionId: text("section_id").references(() => sections.id, { onDelete: "cascade" }).notNull(),
  blockId: text("block_id").references(() => blocks.id, { onDelete: "cascade" }),
  type: questionTypeEnum("type").notNull(),
  description: text("description").notNull(),
  // The question's place in its section's list — "question 4" means the
  // question whose position is 3 (0-indexed) among its section's questions.
  // Set once at creation, in generation/entry order, and never touched again
  // unless the question is removed. createdAt can't serve this purpose: a
  // whole batch of questions inserted in the same transaction (the normal
  // case for AI generation) shares one identical timestamp, so ordering by
  // it is not actually deterministic — this column exists specifically
  // because that ambiguity let "question 4" resolve to a different question
  // on two different reads of the same exam.
  position: integer("position").default(0).notNull(),
  images: jsonb("images").$type<{ url: string; publicId: string }[]>(),
  // Ordered — rendered in this sequence, after the description and before
  // the options. Empty for the overwhelming majority of questions.
  contentBlocks: jsonb("content_blocks").$type<QuestionContentBlock[]>().default([]).notNull(),
  marks: doublePrecision("marks").notNull(),
  modelAnswer: text("model_answer"),
  rubric: jsonb("rubric").$type<{
    categories: {
      name: string;
      weight: number;
      key_points: string[];
    }[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
