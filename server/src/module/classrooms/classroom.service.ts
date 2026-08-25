import crypto from "crypto";
import { eq, and, lt, sql, ilike, or } from "drizzle-orm";
import db from "../../common/db/index.js";
import { classrooms, classroomTeachers, classroomStudents, classroomInvites, users } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { PermissionService } from "../../common/permissions/index.js";
import { assertStudentQuota } from "../billing/usage.service.js";
import { sendClassroomInviteEmail } from "../../common/config/email.js";
import type {
    CreateClassroomDto,
    UpdateClassroomDto,
    RegenerateJoinCodeDto,
    UpdateJoinCodeDto,
    AddTeacherDto,
    InviteStudentDto,
} from "./dto/classroom.dto.js";

const DEFAULT_JOIN_CODE_EXPIRY_DAYS = 7;
const DEFAULT_JOIN_CODE_MAX_USES = 1;
const INVITE_EXPIRY_DAYS = 7;
// Excludes 0/O/1/I to avoid ambiguity when a code is read aloud or handwritten.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type Requester = { id: string; role: string; organisationId: string | null };

// ── Helpers ──────────────────────────────────────────────────────────────────
const generateJoinCode = (length = 6): string => {
    const bytes = crypto.randomBytes(length);
    let code = "";
    for (let i = 0; i < length; i++) code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
    return code;
};

// Shared and per-student invite codes live in one namespace so a redemption
// lookup can never ambiguously match both a classroom's bulk code and someone's invite.
const generateUniqueCode = async (): Promise<string> => {
    let code = generateJoinCode();
    let clash = await db.select({ id: classrooms.id }).from(classrooms).where(eq(classrooms.joinCode, code));
    let inviteClash = await db.select({ id: classroomInvites.id }).from(classroomInvites).where(eq(classroomInvites.code, code));
    while (clash.length > 0 || inviteClash.length > 0) {
        code = generateJoinCode();
        clash = await db.select({ id: classrooms.id }).from(classrooms).where(eq(classrooms.joinCode, code));
        inviteClash = await db.select({ id: classroomInvites.id }).from(classroomInvites).where(eq(classroomInvites.code, code));
    }
    return code;
};

const buildExpiry = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

// Only the classroom's creator or a manager from the same org may add/remove teachers.
const assertCanManageClassroomTeachers = async (requester: Requester, classroomId: string) => {
    if (requester.role === "manager") {
        const allowed = await PermissionService.manager.canManageClassroom(requester.organisationId, classroomId);
        if (!allowed) throw ApiError.forbidden("You are not authorized to manage teachers in this classroom");
        return;
    }

    const isOwner = await PermissionService.teacher.isClassroomOwner(requester.id, classroomId);
    if (!isOwner) throw ApiError.forbidden("Only the classroom owner or an org manager can manage teachers");
};

// General classroom management (view roster, edit, join codes, invites): any
// co-teacher on the classroom, or a manager from the same organisation.
const assertCanManageClassroom = async (requester: Requester, classroomId: string) => {
    if (requester.role === "manager") {
        const allowed = await PermissionService.manager.canManageClassroom(requester.organisationId, classroomId);
        if (!allowed) throw ApiError.forbidden("You are not authorized to manage this classroom");
        return;
    }

    const allowed = await PermissionService.teacher.canManageClassroom(requester.id, classroomId);
    if (!allowed) throw ApiError.forbidden("You are not authorized to manage this classroom");
};

// ── Create Classroom ─────────────────────────────────────────────────────────
const createClassroom = async (data: CreateClassroomDto, teacherId: string, organisationId: string) => {
    const joinCode = await generateUniqueCode();

    return await db.transaction(async (tx) => {
        const [classroom] = await tx.insert(classrooms).values({
            name: data.name,
            organisationId,
            createdBy: teacherId,
            joinCode,
            joinCodeExpiresAt: buildExpiry(data.joinCodeExpiresInDays ?? DEFAULT_JOIN_CODE_EXPIRY_DAYS),
            joinCodeMaxUses: data.joinCodeMaxUses ?? DEFAULT_JOIN_CODE_MAX_USES,
        }).returning();

        if (!classroom) throw ApiError.internal("Failed to create classroom");

        await tx.insert(classroomTeachers).values({
            classroomId: classroom.id,
            teacherId,
        });

        return classroom;
    });
};

// ── Update Classroom ─────────────────────────────────────────────────────────
const updateClassroom = async (classroomId: string, data: UpdateClassroomDto, requester: Requester) => {
    await assertCanManageClassroom(requester, classroomId);

    const [updated] = await db.update(classrooms)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(classrooms.id, classroomId))
        .returning();

    if (!updated) throw ApiError.notFound("Classroom not found");
    return updated;
};

// ── Delete Classroom (cascades teachers, students, invites, groups, exams, assignments) ──
const deleteClassroom = async (classroomId: string, requester: Requester) => {
    await assertCanManageClassroomTeachers(requester, classroomId);

    const [deleted] = await db.delete(classrooms).where(eq(classrooms.id, classroomId)).returning();
    if (!deleted) throw ApiError.notFound("Classroom not found");
    return deleted;
};

// ── Add Teacher ──────────────────────────────────────────────────────────────
const addTeacher = async (classroomId: string, data: AddTeacherDto, requester: Requester) => {
    await assertCanManageClassroomTeachers(requester, classroomId);

    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId));
    if (!classroom) throw ApiError.notFound("Classroom not found");

    const [targetUser] = await db.select().from(users).where(eq(users.email, data.email));
    if (!targetUser) throw ApiError.notFound("No user found with that email");
    if (targetUser.role !== "teacher") throw ApiError.badRequest("Only teachers can be added to a classroom");
    if (targetUser.organisationId !== classroom.organisationId) {
        throw ApiError.forbidden("Teacher does not belong to this classroom's organisation");
    }

    const [existing] = await db.select().from(classroomTeachers).where(
        and(eq(classroomTeachers.classroomId, classroomId), eq(classroomTeachers.teacherId, targetUser.id))
    );
    if (existing) throw ApiError.conflict("Teacher is already assigned to this classroom");

    const [added] = await db.insert(classroomTeachers).values({
        classroomId,
        teacherId: targetUser.id,
    }).returning();

    return added;
};

// ── Remove Teacher ───────────────────────────────────────────────────────────
const removeTeacher = async (classroomId: string, teacherIdToRemove: string, requester: Requester) => {
    await assertCanManageClassroomTeachers(requester, classroomId);

    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId));
    if (!classroom) throw ApiError.notFound("Classroom not found");
    if (classroom.createdBy === teacherIdToRemove) {
        throw ApiError.badRequest("The classroom owner cannot be removed");
    }

    await db.delete(classroomTeachers).where(
        and(eq(classroomTeachers.classroomId, classroomId), eq(classroomTeachers.teacherId, teacherIdToRemove))
    );
};

// ── List Teachers ────────────────────────────────────────────────────────────
const listTeachers = async (classroomId: string, requester: Requester, search?: string) => {
    await assertCanManageClassroom(requester, classroomId);

    const conditions = [eq(classroomTeachers.classroomId, classroomId)];
    if (search) conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))!);

    return await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
    })
        .from(classroomTeachers)
        .innerJoin(users, eq(classroomTeachers.teacherId, users.id))
        .where(and(...conditions));
};

// ── Regenerate Join Code ──────────────────────────────────────────────────────
const regenerateJoinCode = async (classroomId: string, requester: Requester, data: RegenerateJoinCodeDto) => {
    await assertCanManageClassroom(requester, classroomId);

    const joinCode = await generateUniqueCode();

    const [updated] = await db.update(classrooms)
        .set({
            joinCode,
            joinCodeExpiresAt: buildExpiry(data.joinCodeExpiresInDays ?? DEFAULT_JOIN_CODE_EXPIRY_DAYS),
            joinCodeMaxUses: data.joinCodeMaxUses ?? DEFAULT_JOIN_CODE_MAX_USES,
            joinCodeUseCount: 0,
            joinCodeRevoked: false,
            updatedAt: new Date(),
        })
        .where(eq(classrooms.id, classroomId))
        .returning();

    if (!updated) throw ApiError.notFound("Classroom not found");
    return updated;
};

// ── Revoke Join Code ──────────────────────────────────────────────────────────
const revokeJoinCode = async (classroomId: string, requester: Requester) => {
    await assertCanManageClassroom(requester, classroomId);

    const [updated] = await db.update(classrooms)
        .set({ joinCodeRevoked: true, updatedAt: new Date() })
        .where(eq(classrooms.id, classroomId))
        .returning();

    if (!updated) throw ApiError.notFound("Classroom not found");
    return updated;
};

// ── Update Join Code Settings (max uses, without regenerating the code) ───────
const updateJoinCode = async (classroomId: string, requester: Requester, data: UpdateJoinCodeDto) => {
    await assertCanManageClassroom(requester, classroomId);

    const [updated] = await db.update(classrooms)
        .set({ joinCodeMaxUses: data.joinCodeMaxUses, updatedAt: new Date() })
        .where(eq(classrooms.id, classroomId))
        .returning();

    if (!updated) throw ApiError.notFound("Classroom not found");
    return updated;
};

// ── Invite Student (single-use, emailed) ─────────────────────────────────────
const inviteStudent = async (classroomId: string, data: InviteStudentDto, requester: Requester) => {
    await assertCanManageClassroom(requester, classroomId);

    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId));
    if (!classroom) throw ApiError.notFound("Classroom not found");

    const code = await generateUniqueCode();

    const [invite] = await db.insert(classroomInvites).values({
        classroomId,
        email: data.email,
        code,
        invitedBy: requester.id,
        expiresAt: buildExpiry(INVITE_EXPIRY_DAYS),
    }).returning();

    if (!invite) throw ApiError.internal("Failed to create invite");

    try {
        await sendClassroomInviteEmail(data.email, code, classroom.name);
    } catch (err) {
        console.error("Failed to send classroom invite email:", err);
    }

    return invite;
};

// ── Join Classroom (student) ─────────────────────────────────────────────────
// Accepts either a per-student invite code or the classroom's shared join code.
const joinClassroom = async (code: string, studentId: string, studentEmail: string) => {
    const [invite] = await db.select().from(classroomInvites).where(eq(classroomInvites.code, code));

    if (invite) {
        if (invite.status !== "pending") throw ApiError.badRequest("This invite has already been used or revoked");
        if (invite.expiresAt < new Date()) throw ApiError.badRequest("This invite has expired");
        if (invite.email.toLowerCase() !== studentEmail.toLowerCase()) {
            throw ApiError.forbidden("This invite was issued to a different email address");
        }

        const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, invite.classroomId));
        if (!classroom) throw ApiError.notFound("Classroom not found");

        const [existingMembership] = await db.select().from(classroomStudents).where(
            and(
                eq(classroomStudents.classroomId, invite.classroomId),
                eq(classroomStudents.studentId, studentId),
                eq(classroomStudents.status, "active"),
            )
        );
        if (existingMembership) {
            await db.update(classroomInvites)
                .set({ status: "used", usedByUserId: studentId, usedAt: new Date() })
                .where(eq(classroomInvites.id, invite.id));
            return { classroom, membership: existingMembership, alreadyJoined: true };
        }

        // Enforce the organisation's student seat capacity (base + buffer).
        await assertStudentQuota(classroom.organisationId);

        return await db.transaction(async (tx) => {
            // Atomically consume the invite: the status check and the update
            // happen in one conditional UPDATE, so the code can never be
            // redeemed twice even under concurrent requests.
            const [consumedInvite] = await tx.update(classroomInvites)
                .set({ status: "used", usedByUserId: studentId, usedAt: new Date() })
                .where(and(eq(classroomInvites.id, invite.id), eq(classroomInvites.status, "pending")))
                .returning();

            if (!consumedInvite) throw ApiError.badRequest("This invite has already been used");

            const [membership] = await tx.insert(classroomStudents).values({
                classroomId: invite.classroomId,
                studentId,
            }).returning();

            if (!membership) throw ApiError.internal("Failed to join classroom");

            return { classroom, membership, alreadyJoined: false };
        });
    }

    // Fall back to the classroom-wide shared join code.
    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.joinCode, code));
    if (!classroom) throw ApiError.notFound("Invalid join code");

    if (classroom.joinCodeRevoked) throw ApiError.badRequest("This join code has been revoked");
    if (classroom.joinCodeExpiresAt < new Date()) throw ApiError.badRequest("This join code has expired");

    const [existingMembership] = await db.select().from(classroomStudents).where(
        and(
            eq(classroomStudents.classroomId, classroom.id),
            eq(classroomStudents.studentId, studentId),
            eq(classroomStudents.status, "active"),
        )
    );
    if (existingMembership) return { classroom, membership: existingMembership, alreadyJoined: true };

    // Enforce the organisation's student seat capacity (base + buffer).
    await assertStudentQuota(classroom.organisationId);

    return await db.transaction(async (tx) => {
        // Atomic, race-safe usage-cap enforcement: the increment and the cap
        // check happen in one conditional UPDATE, so concurrent joins can't
        // both slip in once the cap is reached.
        const [updatedClassroom] = await tx.update(classrooms)
            .set({ joinCodeUseCount: sql`${classrooms.joinCodeUseCount} + 1` })
            .where(and(
                eq(classrooms.id, classroom.id),
                lt(classrooms.joinCodeUseCount, classrooms.joinCodeMaxUses),
            ))
            .returning();

        if (!updatedClassroom) throw ApiError.badRequest("This join code has reached its usage limit");

        const [membership] = await tx.insert(classroomStudents).values({
            classroomId: classroom.id,
            studentId,
        }).returning();

        if (!membership) throw ApiError.internal("Failed to join classroom");

        // Automatically regenerate a new join code once usage limit is reached
        if (updatedClassroom.joinCodeUseCount >= updatedClassroom.joinCodeMaxUses) {
            const newCode = await generateUniqueCode();
            await tx.update(classrooms)
                .set({
                    joinCode: newCode,
                    joinCodeUseCount: 0,
                    updatedAt: new Date(),
                })
                .where(eq(classrooms.id, classroom.id));
        }

        return { classroom: updatedClassroom, membership, alreadyJoined: false };
    });
};

// ── Get My Classrooms (teacher) ──────────────────────────────────────────────
const getMyClassrooms = async (teacherId: string, search?: string) => {
    const conditions = [eq(classroomTeachers.teacherId, teacherId)];
    if (search) conditions.push(ilike(classrooms.name, `%${search}%`));

    return await db.select({ classroom: classrooms })
        .from(classroomTeachers)
        .innerJoin(classrooms, eq(classroomTeachers.classroomId, classrooms.id))
        .where(and(...conditions));
};

// ── List Classrooms in Organisation (manager) ────────────────────────────────
const listOrganisationClassrooms = async (organisationId: string, search?: string) => {
    const conditions = [eq(classrooms.organisationId, organisationId)];
    if (search) conditions.push(ilike(classrooms.name, `%${search}%`));

    return await db.select().from(classrooms).where(and(...conditions));
};

// ── Get My Classrooms (student) ──────────────────────────────────────────────
const getMyClassroomsAsStudent = async (studentId: string) => {
    return await db.select({ classroom: classrooms })
        .from(classroomStudents)
        .innerJoin(classrooms, eq(classroomStudents.classroomId, classrooms.id))
        .where(and(eq(classroomStudents.studentId, studentId), eq(classroomStudents.status, "active")));
};

// ── Get Classroom Roster (teacher or manager) ────────────────────────────────
const getClassroomRoster = async (classroomId: string, requester: Requester, search?: string) => {
    await assertCanManageClassroom(requester, classroomId);

    const conditions = [eq(classroomStudents.classroomId, classroomId)];
    if (search) conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))!);

    return await db.select({
        studentId: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        status: classroomStudents.status,
        enrolledAt: classroomStudents.enrolledAt,
        leftAt: classroomStudents.leftAt,
    })
        .from(classroomStudents)
        .innerJoin(users, eq(classroomStudents.studentId, users.id))
        .where(and(...conditions));
};

export {
    createClassroom,
    updateClassroom,
    deleteClassroom,
    addTeacher,
    removeTeacher,
    listTeachers,
    inviteStudent,
    regenerateJoinCode,
    updateJoinCode,
    revokeJoinCode,
    joinClassroom,
    getMyClassrooms,
    getMyClassroomsAsStudent,
    getClassroomRoster,
    listOrganisationClassrooms,
};
