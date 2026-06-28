import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "../auth/user.schema.js";

export const chats = pgTable("chats", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  teacherId: text("teacher_id").references(() => users.id).notNull(),
  title: text("title").notNull().default("New Chat"),
  model: text("model").notNull().default("gpt-4o-mini"),
  messages: jsonb("messages").$type<Array<{ role: string, content: string }>>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
