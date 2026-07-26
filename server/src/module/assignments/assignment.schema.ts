import { pgTable, text, doublePrecision, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "../auth/user.schema.js";
import { classrooms } from "../classrooms/classroom.schema.js";
import { groups } from "../groups/group.schema.js";
import { questionTypeEnum } from "../questions/question.schema.js";

// Always scoped to a classroom; groupId null = class-wide, set = restricted to
// that group's members. No sections layer — a flat list of questions.
export const assignments = pgTable("assignments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  title: text("title").notNull(),
  instructions: text("instructions"),
  classroomId: text("classroom_id").references(() => classrooms.id, { onDelete: "cascade" }).notNull(),
  groupId: text("group_id").references(() => groups.id, { onDelete: "cascade" }),
  createdBy: text("created_by").references(() => users.id).notNull(),
  totalMarks: doublePrecision("total_marks").notNull(),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Reuses the same question_type enum as exam questions (mcq | descriptive).
export const assignmentQuestions = pgTable("assignment_questions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  assignmentId: text("assignment_id").references(() => assignments.id, { onDelete: "cascade" }).notNull(),
  type: questionTypeEnum("type").notNull(),
  description: text("description").notNull(),
  images: jsonb("images").$type<{ url: string; publicId: string }[]>(),
  marks: doublePrecision("marks").notNull(),
  modelAnswer: text("model_answer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const assignmentOptions = pgTable("assignment_options", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  questionId: text("question_id").references(() => assignmentQuestions.id, { onDelete: "cascade" }).notNull(),
  value: text("value").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  assignmentId: text("assignment_id").references(() => assignments.id, { onDelete: "cascade" }).notNull(),
  studentId: text("student_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: text("status").$type<"in_progress" | "submitted" | "graded">().default("in_progress").notNull(),
  submittedAt: timestamp("submitted_at"),
  isLate: boolean("is_late").default(false).notNull(),
  totalMarksAwarded: doublePrecision("total_marks_awarded"),
  overallFeedback: text("overall_feedback"),
  gradedBy: text("graded_by").references(() => users.id),
  gradedAt: timestamp("graded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"), // null = active, timestamp = deleted
});

export const assignmentAnswers = pgTable("assignment_answers", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  submissionId: text("submission_id").references(() => assignmentSubmissions.id, { onDelete: "cascade" }).notNull(),
  questionId: text("question_id").references(() => assignmentQuestions.id, { onDelete: "cascade" }).notNull(),
  options: text("options").array(), // array of assignment_option ids, for mcq
  textAnswer: text("text_answer"),
  marksAwarded: doublePrecision("marks_awarded"),
  feedback: text("feedback"), // per-question teacher feedback
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type AssignmentQuestion = typeof assignmentQuestions.$inferSelect;
export type AssignmentOption = typeof assignmentOptions.$inferSelect;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type AssignmentAnswer = typeof assignmentAnswers.$inferSelect;
