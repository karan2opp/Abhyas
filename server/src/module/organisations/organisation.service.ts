import { eq, and, count, ilike, or } from "drizzle-orm";
import { randomBytes } from "crypto";
import db from "../../common/db/index.js";
import { organisations, users, classrooms, classroomStudents } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import type { CreateOrganisationDto, UpdateOrganisationDto } from "./dto/organisation.dto.js";

// 6-letter org invitation code (A-Z), easy to type and share.
const JOIN_CODE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const generateJoinCode = () =>
    Array.from({ length: 6 }, () => JOIN_CODE_LETTERS[(randomBytes(1)[0] ?? 0) % 26]).join("");

// ── Create Organisation ──────────────────────────────────────────────────────
const createOrganisation = async (data: CreateOrganisationDto) => {
    const [organisation] = await db.insert(organisations).values({ name: data.name }).returning();
    if (!organisation) throw ApiError.internal("Failed to create organisation");
    return organisation;
};

// ── Get Organisation by ID ───────────────────────────────────────────────────
const getOrganisationById = async (organisationId: string) => {
    const [organisation] = await db.select().from(organisations).where(eq(organisations.id, organisationId));
    if (!organisation) throw ApiError.notFound("Organisation not found");
    return organisation;
};

// ── Update Organisation details ───────────────────────────────────────────────
// Undefined fields are dropped; empty strings are stored as null so the
// "cleared" state round-trips cleanly on the client.
const updateOrganisation = async (organisationId: string, data: UpdateOrganisationDto) => {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue;
        clean[key] = value === "" ? null : value;
    }

    const [updated] = await db.update(organisations)
        .set({ ...clean, updatedAt: new Date() })
        .where(eq(organisations.id, organisationId))
        .returning();

    if (!updated) throw ApiError.notFound("Organisation not found");
    return updated;
};

// ── Upload Organisation Logo ────────────────────────────────────────────────
const uploadOrganisationLogo = async (organisationId: string, file: Express.Multer.File) => {
    const org = await getOrganisationById(organisationId);

    const { uploadToCloudinary, deleteFromCloudinary } = await import("../../common/config/cloudinary.js");

    if (org.logoPublicId) {
        try {
            await deleteFromCloudinary(org.logoPublicId);
        } catch (err) {
            console.error("Failed to delete old logo:", err);
        }
    }

    const result = await uploadToCloudinary(file.buffer, "org-logos");

    const [updated] = await db.update(organisations)
        .set({ logoUrl: result.url, logoPublicId: result.publicId, updatedAt: new Date() })
        .where(eq(organisations.id, organisationId))
        .returning();

    if (!updated) throw ApiError.notFound("Organisation not found");
    return updated;
};

// ── Get Organisation for a Student ───────────────────────────────────────────
// A student's organisation is derived via their active classroom memberships
// (classroom_students -> classrooms.organisation_id). We assume a student
// belongs to a single organisation and return the first active one. If the
// student has no classroom yet, fall back to the direct users.organisation_id
// set when they joined the organisation by code.
const getOrganisationForStudent = async (studentId: string) => {
    const rows = await db.select({ organisationId: classrooms.organisationId })
        .from(classroomStudents)
        .innerJoin(classrooms, eq(classrooms.id, classroomStudents.classroomId))
        .where(and(
            eq(classroomStudents.studentId, studentId),
            eq(classroomStudents.status, "active"),
        ));

    const orgId = rows[0]?.organisationId;
    if (orgId) return getOrganisationById(orgId);

    const [user] = await db.select({ organisationId: users.organisationId }).from(users).where(eq(users.id, studentId));
    if (!user?.organisationId) throw ApiError.notFound("No organisation found for this student");
    return getOrganisationById(user.organisationId);
};

// ── Get Organisation for a Teacher ───────────────────────────────────────────
// A teacher's organisation is stored directly on the user (users.organisationId),
// assigned by their manager.
const getOrganisationForTeacher = async (teacherId: string) => {
    const [user] = await db.select({ organisationId: users.organisationId }).from(users).where(eq(users.id, teacherId));
    if (!user?.organisationId) throw ApiError.notFound("No organisation found for this teacher");
    return getOrganisationById(user.organisationId);
};

// ── Delete Organisation (system admin) ───────────────────────────────────────
// Detaches users first (users.organisation_id has no ON DELETE cascade), then
// deletes the org — classrooms (and their exams/submissions) cascade off.
const deleteOrganisation = async (organisationId: string) => {
    await db.update(users).set({ organisationId: null }).where(eq(users.organisationId, organisationId));
    const [deleted] = await db.delete(organisations).where(eq(organisations.id, organisationId)).returning();
    if (!deleted) throw ApiError.notFound("Organisation not found");
    return deleted;
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
const getOrganisationManagers = async (organisationId: string, search?: string) => {
    const conditions = [eq(users.organisationId, organisationId), eq(users.role, "manager")];
    if (search) conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))!);

    return await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
    }).from(users).where(and(...conditions));
};

// ── Assign Teacher to Organisation (manager, scoped to their own org) ────────
// A manager can add a teacher to their organisation by email. If the user is a
// student who belongs to this organisation (via an active classroom membership),
// they are promoted to the teacher role and linked. An unlinked teacher is simply
// linked. Managers/admins, teachers of other orgs, and students of other orgs are
// rejected.
const assignTeacherToOrganisation = async (organisationId: string, email: string) => {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) throw ApiError.notFound("User not found with this email address");

    if (user.role === "manager" || user.role === "system_admin") {
        throw ApiError.badRequest("Cannot assign a manager or system admin as a teacher");
    }

    // Existing teacher: only allowed to link them when they are not already
    // claimed by another organisation.
    if (user.role === "teacher") {
        if (user.organisationId && user.organisationId !== organisationId) {
            throw ApiError.badRequest("This teacher already belongs to another organisation");
        }

        const [updatedUser] = await db.update(users)
            .set({ organisationId, updatedAt: new Date() })
            .where(eq(users.id, user.id))
            .returning();

        if (!updatedUser) throw ApiError.internal("Failed to assign teacher");
        const { password, verificationToken, refreshToken, resetPasswordToken, resetPasswordExpires, ...safeUser } = updatedUser;
        return safeUser;
    }

    // Student path: they must belong to this organisation via an active
    // classroom membership before we promote them.
    const [membership] = await db.select({ id: classroomStudents.id })
        .from(classroomStudents)
        .innerJoin(classrooms, eq(classrooms.id, classroomStudents.classroomId))
        .where(and(
            eq(classroomStudents.studentId, user.id),
            eq(classroomStudents.status, "active"),
            eq(classrooms.organisationId, organisationId),
        ));

    if (!membership) {
        throw ApiError.badRequest("This user is not a student in your organisation");
    }

    const [updatedUser] = await db.update(users)
        .set({ role: "teacher", organisationId, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();

    if (!updatedUser) throw ApiError.internal("Failed to assign teacher");
    const { password, verificationToken, refreshToken, resetPasswordToken, resetPasswordExpires, ...safeUser } = updatedUser;
    return safeUser;
};

// ── Demote Teacher to Student (manager, scoped to their own org) ──────────────
// Reverts a teacher of the manager's own organisation back to the student role
// and detaches them from the organisation (a student's org is derived from their
// classroom memberships, not the direct users.organisation_id field).
const demoteTeacher = async (organisationId: string, userId: string) => {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw ApiError.notFound("User not found");
    if (user.role !== "teacher" || user.organisationId !== organisationId) {
        throw ApiError.badRequest("User is not a teacher in your organisation");
    }

    const [updatedUser] = await db.update(users)
        .set({ role: "student", organisationId: null, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

    if (!updatedUser) throw ApiError.internal("Failed to demote teacher");
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
const getOrganisationTeachers = async (organisationId: string, search?: string) => {
    const conditions = [eq(users.organisationId, organisationId), eq(users.role, "teacher")];
    if (search) conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))!);

    return await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
    }).from(users).where(and(...conditions));
};

// ── Get / create organisation join code ──────────────────────────────────────
// Returns the org's invite code, generating one on first request.
const getOrCreateOrganisationJoinCode = async (organisationId: string) => {
    const [organisation] = await db.select().from(organisations).where(eq(organisations.id, organisationId));
    if (!organisation) throw ApiError.notFound("Organisation not found");

    if (organisation.joinCode) return organisation;

    const [updated] = await db.update(organisations)
        .set({ joinCode: generateJoinCode(), updatedAt: new Date() })
        .where(eq(organisations.id, organisationId))
        .returning();

    if (!updated) throw ApiError.internal("Failed to generate join code");
    return updated;
};

// ── Regenerate organisation join code ────────────────────────────────────────
// Issues a fresh code, invalidating the previous one.
const regenerateOrganisationJoinCode = async (organisationId: string) => {
    const [updated] = await db.update(organisations)
        .set({ joinCode: generateJoinCode(), updatedAt: new Date() })
        .where(eq(organisations.id, organisationId))
        .returning();

    if (!updated) throw ApiError.notFound("Organisation not found");
    return updated;
};

// ── Join organisation by code (student or teacher) ───────────────────────────
// Links the caller to the organisation matching the code. Managers and system
// admins can't join by code (their org is assigned by a system admin).
const joinOrganisationByCode = async (userId: string, code: string) => {
    const [organisation] = await db.select().from(organisations).where(eq(organisations.joinCode, code));
    if (!organisation) throw ApiError.badRequest("Invalid organisation join code");

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw ApiError.notFound("User not found");
    if (user.role === "manager" || user.role === "system_admin") {
        throw ApiError.badRequest("Only students and teachers can join an organisation by code");
    }

    if (user.organisationId) {
        if (user.organisationId === organisation.id) {
            const { password, verificationToken, refreshToken, resetPasswordToken, resetPasswordExpires, ...safeUser } = user;
            return safeUser;
        }
        throw ApiError.badRequest("You already belong to another organisation");
    }

    const [updatedUser] = await db.update(users)
        .set({ organisationId: organisation.id, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

    if (!updatedUser) throw ApiError.internal("Failed to join organisation");
    const { password, verificationToken, refreshToken, resetPasswordToken, resetPasswordExpires, ...safeUser } = updatedUser;
    return safeUser;
};

export {
    createOrganisation,
    getOrganisationById,
    updateOrganisation,
    uploadOrganisationLogo,
    getOrganisationForStudent,
    getOrganisationForTeacher,
    deleteOrganisation,
    listOrganisations,
    assignUserToOrganisation,
    assignManager,
    revokeManager,
    getOrganisationManagers,
    assignTeacherToOrganisation,
    demoteTeacher,
    removeTeacherFromOrganisation,
    getOrganisationTeachers,
    getOrCreateOrganisationJoinCode,
    regenerateOrganisationJoinCode,
    joinOrganisationByCode,
};
