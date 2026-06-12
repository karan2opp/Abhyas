import { pgTable, text, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "../auth/user.schema.js";

export const exams = pgTable("exams", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  title: text("title").notNull(),
  instructions: text("instructions").array(),
  duration: integer("duration").notNull(), // in minutes
  createdBy: text("created_by").references(() => users.id).notNull(),
  joinCode: text("join_code").unique().notNull(),
  totalMarks: doublePrecision("total_marks").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
