import { pgTable, text, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "../auth/user.schema.js";
import { organisations } from "../organisations/organisation.schema.js";

export const classrooms = pgTable("classrooms", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  organisationId: text("organisation_id").references(() => organisations.id, { onDelete: "cascade" }).notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),

  // Join code is the trust boundary for classroom onboarding: scoped to one
  // classroom, expiring, usage-capped, and revocable so a leaked code has a
  // small blast radius and a short shelf life.
  joinCode: text("join_code").unique().notNull(),
  joinCodeExpiresAt: timestamp("join_code_expires_at").notNull(),
  joinCodeMaxUses: integer("join_code_max_uses").notNull(),
  joinCodeUseCount: integer("join_code_use_count").default(0).notNull(),
  joinCodeRevoked: boolean("join_code_revoked").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Many-to-many: a teacher can manage multiple classrooms, a classroom can have co-teachers.
export const classroomTeachers = pgTable("classroom_teachers", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  classroomId: text("classroom_id").references(() => classrooms.id, { onDelete: "cascade" }).notNull(),
  teacherId: text("teacher_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("classroom_teacher_unique").on(table.classroomId, table.teacherId),
]);

// Many-to-many with history: a student can join/leave/rejoin classrooms over time.
export const classroomStudents = pgTable("classroom_students", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  classroomId: text("classroom_id").references(() => classrooms.id, { onDelete: "cascade" }).notNull(),
  studentId: text("student_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: text("status").$type<"active" | "left">().default("active").notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
});

// A targeted, single-use invite emailed to one specific student. Distinct from
// the shared classroom-wide joinCode above: this code is tied to one email and
// is atomically consumed on first use, so it can never be redeemed twice.
export const classroomInvites = pgTable("classroom_invites", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  classroomId: text("classroom_id").references(() => classrooms.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  code: text("code").unique().notNull(),
  invitedBy: text("invited_by").references(() => users.id).notNull(),
  status: text("status").$type<"pending" | "used" | "revoked">().default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedByUserId: text("used_by_user_id").references(() => users.id),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Classroom = typeof classrooms.$inferSelect;
export type NewClassroom = typeof classrooms.$inferInsert;
export type ClassroomTeacher = typeof classroomTeachers.$inferSelect;
export type ClassroomStudent = typeof classroomStudents.$inferSelect;
export type ClassroomInvite = typeof classroomInvites.$inferSelect;
