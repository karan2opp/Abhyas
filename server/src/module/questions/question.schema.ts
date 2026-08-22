import { pgTable, text, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { sections } from "../sections/section.schema.js";
import { blocks } from "../blocks/block.schema.js";
import { questionTypeEnum } from "./question-type.enum.js";

export const questions = pgTable("questions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  sectionId: text("section_id").references(() => sections.id, { onDelete: "cascade" }).notNull(),
  blockId: text("block_id").references(() => blocks.id, { onDelete: "cascade" }),
  type: questionTypeEnum("type").notNull(),
  description: text("description").notNull(),
  images: jsonb("images").$type<{ url: string; publicId: string }[]>(),
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
