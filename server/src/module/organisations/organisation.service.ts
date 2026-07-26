import { eq, and } from "drizzle-orm";
import db from "../../common/db/index.js";
import { organisations, users } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import type { CreateOrganisationDto } from "./dto/organisation.dto.js";

// ── Create Organisation ──────────────────────────────────────────────────────
const createOrganisation = async (data: CreateOrganisationDto) => {
    const [organisation] = await db.insert(organisations).values({ name: data.name }).returning();
    if (!organisation) throw ApiError.internal("Failed to create organisation");
    return organisation;
};

// ── List Organisations ───────────────────────────────────────────────────────
const listOrganisations = async () => {
    return await db.select().from(organisations);
};

// ── Assign User to Organisation ──────────────────────────────────────────────
const assignUserToOrganisation = async (userId: string, organisationId: string) => {
    const [organisation] = await db.select().from(organisations).where(eq(organisations.id, organisationId));
    if (!organisation) throw ApiError.notFound("Organisation not found");

    const [updatedUser] = await db.update(users)
        .set({ organisationId, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

    if (!updatedUser) throw ApiError.notFound("User not found");

    const { password, verificationToken, refreshToken, resetPasswordToken, resetPasswordExpires, ...safeUser } = updatedUser;
    return safeUser;
};

// ── Assign Manager (promotes role + assigns org, in one step) ────────────────
const assignManager = async (email: string, organisationId: string) => {
    const [organisation] = await db.select().from(organisations).where(eq(organisations.id, organisationId));
    if (!organisation) throw ApiError.notFound("Organisation not found");

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) throw ApiError.notFound("User not found with this email address");
    if (user.role === "system_admin") throw ApiError.badRequest("Cannot assign manager to a system admin");

    const [updatedUser] = await db.update(users)
        .set({ role: "manager", organisationId, updatedAt: new Date() })
        .where(eq(users.email, email))
        .returning();

    if (!updatedUser) throw ApiError.internal("Failed to assign manager");

    const { password, verificationToken, refreshToken, resetPasswordToken, resetPasswordExpires, ...safeUser } = updatedUser;
    return safeUser;
};

// ── Revoke Manager ────────────────────────────────────────────────────────────
const revokeManager = async (userId: string) => {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw ApiError.notFound("User not found");
    if (user.role !== "manager") throw ApiError.badRequest("User is not a manager");

    const [updatedUser] = await db.update(users)
        .set({ role: "student", organisationId: null, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

    const { password, verificationToken, refreshToken, resetPasswordToken, resetPasswordExpires, ...safeUser } = updatedUser!;
    return safeUser;
};

// ── Get Organisation Managers ─────────────────────────────────────────────────
const getOrganisationManagers = async (organisationId: string) => {
    return await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
    }).from(users).where(and(eq(users.organisationId, organisationId), eq(users.role, "manager")));
};

// ── Assign Teacher to Organisation (manager, scoped to their own org) ────────
const assignTeacherToOrganisation = async (organisationId: string, email: string) => {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) throw ApiError.notFound("User not found with this email address");
    if (user.role !== "teacher") throw ApiError.badRequest("User must already have the teacher role");

    const [updatedUser] = await db.update(users)
        .set({ organisationId, updatedAt: new Date() })
        .where(eq(users.email, email))
        .returning();

    if (!updatedUser) throw ApiError.internal("Failed to assign teacher");

    const { password, verificationToken, refreshToken, resetPasswordToken, resetPasswordExpires, ...safeUser } = updatedUser;
    return safeUser;
};

// ── Remove Teacher from Organisation (manager, scoped to their own org) ──────
const removeTeacherFromOrganisation = async (organisationId: string, userId: string) => {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw ApiError.notFound("User not found");
    if (user.role !== "teacher" || user.organisationId !== organisationId) {
        throw ApiError.badRequest("User is not a teacher in this organisation");
    }

    const [updatedUser] = await db.update(users)
        .set({ organisationId: null, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

    const { password, verificationToken, refreshToken, resetPasswordToken, resetPasswordExpires, ...safeUser } = updatedUser!;
    return safeUser;
};

// ── Get Organisation Teachers ──────────────────────────────────────────────────
const getOrganisationTeachers = async (organisationId: string) => {
    return await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
    }).from(users).where(and(eq(users.organisationId, organisationId), eq(users.role, "teacher")));
};

export {
    createOrganisation,
    listOrganisations,
    assignUserToOrganisation,
    assignManager,
    revokeManager,
    getOrganisationManagers,
    assignTeacherToOrganisation,
    removeTeacherFromOrganisation,
    getOrganisationTeachers,
};
