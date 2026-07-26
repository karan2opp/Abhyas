import { eq, and } from "drizzle-orm";
import db from "../../common/db/index.js";
import { groups, groupStudents, classroomStudents, users } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { PermissionService } from "../../common/permissions/index.js";
import type { CreateGroupDto, UpdateGroupDto, AddStudentToGroupDto } from "./dto/group.dto.js";

// ── Create Group ──────────────────────────────────────────────────────────────
const createGroup = async (data: CreateGroupDto, teacherId: string) => {
    const hasAccess = await PermissionService.teacher.canManageClassroom(teacherId, data.classroomId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to create groups in this classroom");

    const [group] = await db.insert(groups).values({
        name: data.name,
        classroomId: data.classroomId,
        createdBy: teacherId,
    }).returning();

    if (!group) throw ApiError.internal("Failed to create group");
    return group;
};

// ── Update Group ──────────────────────────────────────────────────────────────
const updateGroup = async (groupId: string, data: UpdateGroupDto, teacherId: string) => {
    const hasAccess = await PermissionService.teacher.canManageGroup(teacherId, groupId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to update this group");

    const [updated] = await db.update(groups)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(groups.id, groupId))
        .returning();

    if (!updated) throw ApiError.notFound("Group not found");
    return updated;
};

// ── Delete Group ──────────────────────────────────────────────────────────────
const deleteGroup = async (groupId: string, teacherId: string) => {
    const hasAccess = await PermissionService.teacher.canManageGroup(teacherId, groupId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to delete this group");

    await db.delete(groups).where(eq(groups.id, groupId));
};

// ── List Groups (for a classroom) ─────────────────────────────────────────────
const listGroups = async (classroomId: string, teacherId: string) => {
    const hasAccess = await PermissionService.teacher.canManageClassroom(teacherId, classroomId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to view this classroom");

    return await db.select().from(groups).where(eq(groups.classroomId, classroomId));
};

// ── Add Student to Group ──────────────────────────────────────────────────────
const addStudentToGroup = async (groupId: string, data: AddStudentToGroupDto, teacherId: string) => {
    const hasAccess = await PermissionService.teacher.canManageGroup(teacherId, groupId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to manage this group");

    const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
    if (!group) throw ApiError.notFound("Group not found");

    // A student can only be filtered into a group if they're an active member
    // of the classroom the group belongs to.
    const [membership] = await db.select().from(classroomStudents).where(
        and(
            eq(classroomStudents.classroomId, group.classroomId),
            eq(classroomStudents.studentId, data.studentId),
            eq(classroomStudents.status, "active"),
        )
    );
    if (!membership) throw ApiError.badRequest("Student is not an active member of this classroom");

    const [existing] = await db.select().from(groupStudents).where(
        and(eq(groupStudents.groupId, groupId), eq(groupStudents.studentId, data.studentId))
    );
    if (existing) throw ApiError.conflict("Student is already in this group");

    const [added] = await db.insert(groupStudents).values({
        groupId,
        studentId: data.studentId,
    }).returning();

    if (!added) throw ApiError.internal("Failed to add student to group");
    return added;
};

// ── Remove Student from Group ─────────────────────────────────────────────────
const removeStudentFromGroup = async (groupId: string, studentId: string, teacherId: string) => {
    const hasAccess = await PermissionService.teacher.canManageGroup(teacherId, groupId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to manage this group");

    await db.delete(groupStudents).where(
        and(eq(groupStudents.groupId, groupId), eq(groupStudents.studentId, studentId))
    );
};

// ── Get Group Members ─────────────────────────────────────────────────────────
const getGroupMembers = async (groupId: string, teacherId: string) => {
    const hasAccess = await PermissionService.teacher.canManageGroup(teacherId, groupId);
    if (!hasAccess) throw ApiError.forbidden("You are not authorized to view this group");

    return await db.select({
        studentId: users.id,
        name: users.name,
        email: users.email,
        addedAt: groupStudents.addedAt,
    })
        .from(groupStudents)
        .innerJoin(users, eq(groupStudents.studentId, users.id))
        .where(eq(groupStudents.groupId, groupId));
};

export {
    createGroup,
    updateGroup,
    deleteGroup,
    listGroups,
    addStudentToGroup,
    removeStudentFromGroup,
    getGroupMembers,
};
