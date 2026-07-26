import { pgTable, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { organisations } from "../organisations/organisation.schema.js";

export const roleEnum = pgEnum("role", ["student", "teacher", "manager", "system_admin"]);

export const users = pgTable("users", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    role: roleEnum("role").default("student").notNull(),
    // Authoritative for staff (teacher/manager/system_admin), who belong to exactly one org.
    // Not authoritative for students — a student's org(s) are derived via
    // classroom_students -> classrooms.organisation_id, since a student can be
    // enrolled in classrooms across more than one organisation.
    organisationId: text("organisation_id").references(() => organisations.id),
    phone: text("phone").default(""),
    isVerified: boolean("is_verified").default(false).notNull(),

    avatarUrl: text("avatar_url"),
    avatarPublicId: text("avatar_public_id"),

    verificationToken: text("verification_token"),
    verificationExpires: timestamp("verification_expires"),
    refreshToken: text("refresh_token"),
    resetPasswordToken: text("reset_password_token"),
    resetPasswordExpires: timestamp("reset_password_expires"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;