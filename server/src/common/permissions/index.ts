import db from "../db/index.js";
import { exams, users, sections, classrooms, classroomTeachers, groups, assignments } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export type Requester = { id: string; role: string; organisationId: string | null };

class TeacherPermissions {
    // Manageable by the exam's creator, or (when the creator opts in via
    // allowCoTeacherEdit) any teacher assigned to its classroom.
    static async canManageExam(teacherId: string, examId: string): Promise<boolean> {
        const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
        if (!exam) return false;

        // Creator always manages their own exam.
        if (exam.createdBy === teacherId) return true;

        // Co-teachers can only edit when the creator opted in.
        if (!exam.allowCoTeacherEdit) return false;

        const [coTeacherRow] = await db.select({ id: exams.id })
            .from(exams)
            .innerJoin(classroomTeachers, eq(exams.classroomId, classroomTeachers.classroomId))
            .where(and(eq(exams.id, examId), eq(classroomTeachers.teacherId, teacherId)));

        return !!coTeacherRow;
    }

    // Any co-teacher assigned to the classroom (via classroom_teachers) or organisation manager can manage its content.
    static async canManageClassroom(teacherId: string, classroomId: string): Promise<boolean> {
        const row = await db.select().from(classroomTeachers)
            .where(and(eq(classroomTeachers.classroomId, classroomId), eq(classroomTeachers.teacherId, teacherId)));
        if (row.length > 0) return true;

        const [user] = await db.select().from(users).where(eq(users.id, teacherId));
        if (user && user.role === "manager" && user.organisationId) {
            const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId));
            if (classroom && classroom.organisationId === user.organisationId) return true;
        }

        return false;
    }

    // Only the teacher who created the classroom may add/remove other teachers on it.
    static async isClassroomOwner(teacherId: string, classroomId: string): Promise<boolean> {
        const [classroom] = await db.select().from(classrooms)
            .where(and(eq(classrooms.id, classroomId), eq(classrooms.createdBy, teacherId)));

        return !!classroom;
    }

    // A group is manageable by any co-teacher assigned to the classroom it belongs to or organisation manager.
    static async canManageGroup(teacherId: string, groupId: string): Promise<boolean> {
        const [row] = await db.select({ id: groups.id })
            .from(groups)
            .innerJoin(classroomTeachers, eq(groups.classroomId, classroomTeachers.classroomId))
            .where(and(eq(groups.id, groupId), eq(classroomTeachers.teacherId, teacherId)));
        if (row) return true;

        const [user] = await db.select().from(users).where(eq(users.id, teacherId));
        if (user && user.role === "manager" && user.organisationId) {
            const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
            if (group) {
                const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, group.classroomId));
                if (classroom && classroom.organisationId === user.organisationId) return true;
            }
        }

        return false;
    }

    // An assignment is manageable by any co-teacher assigned to the classroom it belongs to or organisation manager.
    static async canManageAssignment(teacherId: string, assignmentId: string): Promise<boolean> {
        const [row] = await db.select({ id: assignments.id })
            .from(assignments)
            .innerJoin(classroomTeachers, eq(assignments.classroomId, classroomTeachers.classroomId))
            .where(and(eq(assignments.id, assignmentId), eq(classroomTeachers.teacherId, teacherId)));
        if (row) return true;

        const [user] = await db.select().from(users).where(eq(users.id, teacherId));
        if (user && user.role === "manager" && user.organisationId) {
            const [assignment] = await db.select().from(assignments).where(eq(assignments.id, assignmentId));
            if (assignment) {
                const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, assignment.classroomId));
                if (classroom && classroom.organisationId === user.organisationId) return true;
            }
        }

        return false;
    }

    static async canManageSection(teacherId: string, sectionId: string): Promise<boolean> {
        const [section] = await db.select({ examId: sections.examId })
            .from(sections)
            .where(eq(sections.id, sectionId));

        if (!section) return false;
        return TeacherPermissions.canManageExam(teacherId, section.examId);
    }
}

class StudentPermissions {
    static async canAttemptExam(studentId: string, examId: string): Promise<boolean> {
        // TODO: Implement tomorrow when groups and group_exams tables are created
        throw new Error("Group/Classroom features not yet implemented");
    }
}

class ManagerPermissions {
    static async canManageTeacher(managerId: string, teacherId: string): Promise<boolean> {
        const manager = await db.select().from(users).where(eq(users.id, managerId));
        const teacher = await db.select().from(users).where(eq(users.id, teacherId));

        // Ensure both users exist and belong to the same organisation
        if (!manager.length || !teacher.length) return false;

        return manager[0]!.organisationId === teacher[0]!.organisationId;
    }

    // A manager can manage any classroom that belongs to their own organisation.
    static async canManageClassroom(managerOrganisationId: string | null, classroomId: string): Promise<boolean> {
        if (!managerOrganisationId) return false;

        const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId));
        if (!classroom) return false;

        return classroom.organisationId === managerOrganisationId;
    }

    // A manager can manage an exam if it's scoped to a classroom in their own organisation.
    static async canManageExam(managerOrganisationId: string | null, examId: string): Promise<boolean> {
        if (!managerOrganisationId) return false;

        const [row] = await db.select({ id: exams.id })
            .from(exams)
            .innerJoin(classrooms, eq(exams.classroomId, classrooms.id))
            .where(and(eq(exams.id, examId), eq(classrooms.organisationId, managerOrganisationId)));

        return !!row;
    }
}

export class PermissionService {
    static readonly teacher = TeacherPermissions;
    static readonly student = StudentPermissions;
    static readonly manager = ManagerPermissions;

    // Dispatch on role: managers are checked by organisation, everyone else by id.
    static async canManageExam(requester: Requester, examId: string): Promise<boolean> {
        if (requester.role === "manager") {
            return ManagerPermissions.canManageExam(requester.organisationId, examId);
        }
        return TeacherPermissions.canManageExam(requester.id, examId);
    }

    static async canManageSection(requester: Requester, sectionId: string): Promise<boolean> {
        if (requester.role === "manager") {
            const [section] = await db.select({ examId: sections.examId })
                .from(sections)
                .where(eq(sections.id, sectionId));
            if (!section) return false;
            return ManagerPermissions.canManageExam(requester.organisationId, section.examId);
        }
        return TeacherPermissions.canManageSection(requester.id, sectionId);
    }
}
