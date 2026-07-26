import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { classrooms } from "../classrooms/classroom.schema.js";
import { users } from "../auth/user.schema.js";

// Scoped to exactly one classroom. Acts as a filter for assigning exams/assignments
// to a subset of a classroom's students, rather than the whole classroom.
export const groups = pgTable("groups", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  classroomId: text("classroom_id").references(() => classrooms.id, { onDelete: "cascade" }).notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const groupStudents = pgTable("group_students", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  groupId: text("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  studentId: text("student_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (table) => [
  unique("group_student_unique").on(table.groupId, table.studentId),
]);

export type Group = typeof groups.$inferSelect;
export type GroupStudent = typeof groupStudents.$inferSelect;
