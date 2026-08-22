import { eq, and, count, ilike, or } from "drizzle-orm";
import db from "../../common/db/index.js";
import { organisations, users, classrooms, classroomStudents } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import type { CreateOrganisationDto, UpdateOrganisationDto } from "./dto/organisation.dto.js";

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
// belongs to a single organisation and return the first active one.
const getOrganisationForStudent = async (studentId: string) => {
    const rows = await db.select({ organisationId: classrooms.organisationId })
        .from(classroomStudents)
        .innerJoin(classrooms, eq(classrooms.id, classroomStudents.classroomId))
        .where(and(
            eq(classroomStudents.studentId, studentId),
            eq(classroomStudents.status, "active"),
        ));

    const orgId = rows[0]?.organisationId;
    if (!orgId) throw ApiError.notFound("No organisation found for this student");
    return getOrganisationById(orgId);
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

export {
    createOrganisation,
    getOrganisationById,
    updateOrganisation,
    uploadOrganisationLogo,
    getOrganisationForStudent,
    listOrganisations,
    assignUserToOrganisation,
    assignManager,
    revokeManager,
    getOrganisationManagers,
    assignTeacherToOrganisation,
    removeTeacherFromOrganisation,
    getOrganisationTeachers,
};
