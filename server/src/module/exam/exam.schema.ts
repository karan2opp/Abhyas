import { pgTable, text, integer, doublePrecision, timestamp, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "../auth/user.schema.js";
import { classrooms } from "../classrooms/classroom.schema.js";
import { groups } from "../groups/group.schema.js";

export const exams = pgTable("exams", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  title: text("title").notNull(),
  type: text("type").$type<"SCHEDULED" | "ON_DEMAND">().default("SCHEDULED").notNull(),
  instructions: text("instructions").array(),
  duration: integer("duration").notNull(), // in minutes
  createdBy: text("created_by").references(() => users.id).notNull(),
  // Nullable for backward compatibility with exams created before classroom scoping
  // existed. New exams should always set classroomId; groupId null = class-wide,
  // set = restricted to that group's members.
  classroomId: text("classroom_id").references(() => classrooms.id, { onDelete: "cascade" }),
  groupId: text("group_id").references(() => groups.id, { onDelete: "cascade" }),
  // Kept regardless of classroom scoping — a classroom/group member can start the
  // exam directly via membership (no code), but the code still works as-is.
  joinCode: text("join_code").unique().notNull(),
  totalMarks: doublePrecision("total_marks").notNull(),
  requireFeedback: boolean("require_feedback").default(false).notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  publishTime: timestamp("publish_time"),
  status: text("status").$type<"DRAFT" | "PUBLISHED">().default("DRAFT").notNull(),
  // Creator opts in to let co-teachers of the classroom edit this exam's content.
  allowCoTeacherEdit: boolean("allow_co_teacher_edit").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
