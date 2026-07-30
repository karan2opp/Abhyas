import { pgTable, text, timestamp, pgEnum, doublePrecision } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "../auth/user.schema.js";
import { exams } from "../exam/exam.schema.js";

export const submissionStatusEnum = pgEnum("submission_status", ["inprogress", "submitted", "timeout", "evaluating"]);

export const submissions = pgTable("submissions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  examId: text("exam_id").references(() => exams.id, { onDelete: "cascade" }).notNull(),
  status: submissionStatusEnum("status").notNull(),
  score: doublePrecision("score"),
  submittedAt: timestamp("submitted_at"),
  // Set only when a teacher has manually reviewed/graded this submission
  // (as opposed to it only ever having gone through auto MCQ + AI scoring).
  gradedBy: text("graded_by").references(() => users.id),
  gradedAt: timestamp("graded_at"),
  overallFeedback: text("overall_feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at")   // null = active, timestamp = deleted
});

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
