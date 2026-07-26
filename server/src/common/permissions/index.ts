import db from "../db/index.js";
import { exams, users, sections, classrooms, classroomTeachers, groups, assignments } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

class TeacherPermissions {
    static async canManageExam(teacherId: string, examId: string): Promise<boolean> {
        const exam = await db.select().from(exams)
            .where(and(eq(exams.id, examId), eq(exams.createdBy, teacherId)));

        return exam.length > 0;
    }

    // Any co-teacher assigned to the classroom (via classroom_teachers) can manage its content.
    static async canManageClassroom(teacherId: string, classroomId: string): Promise<boolean> {
        const row = await db.select().from(classroomTeachers)
            .where(and(eq(classroomTeachers.classroomId, classroomId), eq(classroomTeachers.teacherId, teacherId)));

        return row.length > 0;
    }

    // Only the teacher who created the classroom may add/remove other teachers on it.
    static async isClassroomOwner(teacherId: string, classroomId: string): Promise<boolean> {
        const [classroom] = await db.select().from(classrooms)
            .where(and(eq(classrooms.id, classroomId), eq(classrooms.createdBy, teacherId)));

        return !!classroom;
    }

    // A group is manageable by any co-teacher assigned to the classroom it belongs to.
    static async canManageGroup(teacherId: string, groupId: string): Promise<boolean> {
        const [row] = await db.select({ id: groups.id })
            .from(groups)
            .innerJoin(classroomTeachers, eq(groups.classroomId, classroomTeachers.classroomId))
            .where(and(eq(groups.id, groupId), eq(classroomTeachers.teacherId, teacherId)));

        return !!row;
    }

    // An assignment is manageable by any co-teacher assigned to the classroom it belongs to.
    static async canManageAssignment(teacherId: string, assignmentId: string): Promise<boolean> {
        const [row] = await db.select({ id: assignments.id })
            .from(assignments)
            .innerJoin(classroomTeachers, eq(assignments.classroomId, classroomTeachers.classroomId))
            .where(and(eq(assignments.id, assignmentId), eq(classroomTeachers.teacherId, teacherId)));

        return !!row;
    }

    static async canManageSection(teacherId: string, sectionId: string): Promise<boolean> {
        const section = await db.select()
            .from(sections)
            .innerJoin(exams, eq(sections.examId, exams.id))
            .where(and(
                eq(sections.id, sectionId),
                eq(exams.createdBy, teacherId)
            ));

        return section.length > 0;
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
}

export class PermissionService {
    static readonly teacher = TeacherPermissions;
    static readonly student = StudentPermissions;
    static readonly manager = ManagerPermissions;
}
