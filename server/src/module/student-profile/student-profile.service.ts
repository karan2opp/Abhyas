import { eq, and, desc, inArray, sql, count } from "drizzle-orm";
import db from "../../common/db/index.js";
import {
    users,
    submissions,
    exams,
    assignments,
    assignmentSubmissions,
    classrooms,
    classroomStudents,
    classroomTeachers,
} from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";

type Requester = { id: string; role: string; organisationId: string | null };

// ── Resolve the classrooms (and their orgs) the student belongs to ───────────
const getStudentClassroomIds = async (studentId: string): Promise<string[]> => {
    const rows = await db.select({ classroomId: classroomStudents.classroomId })
        .from(classroomStudents)
        .where(and(
            eq(classroomStudents.studentId, studentId),
            eq(classroomStudents.status, "active"),
        ));
    return rows.map(r => r.classroomId);
};

// ── Permission: requester must have staff-level access to the student ────────
// teacher -> must manage a classroom the student is in; manager -> a classroom
// of the manager's org; system_admin -> any student.
const assertCanViewStudent = async (requester: Requester, studentId: string, classroomIds: string[]) => {
    if (requester.role === "system_admin") return;

    if (classroomIds.length === 0) {
        throw ApiError.notFound("Student not found");
    }

    if (requester.role === "teacher") {
        const rows = await db.select({ id: classroomTeachers.id }).from(classroomTeachers)
            .where(and(
                eq(classroomTeachers.teacherId, requester.id),
                inArray(classroomTeachers.classroomId, classroomIds),
            ));
        if (rows.length === 0) throw ApiError.forbidden("You are not authorized to view this student");
        return;
    }

    if (requester.role === "manager") {
        if (!requester.organisationId) throw ApiError.forbidden("You are not authorized to view this student");
        const rows = await db.select({ id: classrooms.id }).from(classrooms)
            .where(and(
                eq(classrooms.organisationId, requester.organisationId),
                inArray(classrooms.id, classroomIds),
            ));
        if (rows.length === 0) throw ApiError.forbidden("You are not authorized to view this student");
        return;
    }

    throw ApiError.forbidden("You are not authorized to view this student");
};

export const getStudentProfile = async (studentId: string, requester: Requester) => {
    const [student] = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
    }).from(users).where(eq(users.id, studentId));

    if (!student) throw ApiError.notFound("Student not found");

    const classroomIds = await getStudentClassroomIds(studentId);
    await assertCanViewStudent(requester, studentId, classroomIds);

    // ── Exam submissions ──────────────────────────────────────────────────────
    const examSubmissions = await db.select({
        submission: submissions,
        exam: {
            id: exams.id,
            title: exams.title,
            totalMarks: exams.totalMarks,
            classroomId: exams.classroomId,
        },
    }).from(submissions)
        .innerJoin(exams, eq(submissions.examId, exams.id))
        .where(and(eq(submissions.userId, studentId)))
        .orderBy(desc(submissions.submittedAt));

    const examsTaken = examSubmissions.filter(s => s.submission.status !== "inprogress").length;
    const examsInProgress = examSubmissions.filter(s => s.submission.status === "inprogress").length;
    const totalExamScore = examSubmissions.reduce((sum, s) => sum + (s.submission.score || 0), 0);
    const maxExamMarks = examSubmissions.reduce((sum, s) => sum + (s.exam.totalMarks || 0), 0);

    // ── Assignment submissions ────────────────────────────────────────────────
    const assignmentRows = await db.select({
        submission: assignmentSubmissions,
        assignment: {
            id: assignments.id,
            title: assignments.title,
            totalMarks: assignments.totalMarks,
            classroomId: assignments.classroomId,
        },
    }).from(assignmentSubmissions)
        .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
        .where(eq(assignmentSubmissions.studentId, studentId))
        .orderBy(desc(assignmentSubmissions.submittedAt));

    const assignmentsSubmitted = assignmentRows.filter(s => s.submission.status !== "in_progress").length;
    const assignmentsInProgress = assignmentRows.filter(s => s.submission.status === "in_progress").length;
    const totalAssignmentScore = assignmentRows.reduce((sum, s) => sum + (s.submission.totalMarksAwarded || 0), 0);
    const maxAssignmentMarks = assignmentRows.reduce((sum, s) => sum + (s.assignment.totalMarks || 0), 0);

    return {
        student,
        stats: {
            examsTaken,
            examsInProgress,
            totalExamScore,
            maxExamMarks,
            assignmentsSubmitted,
            assignmentsInProgress,
            totalAssignmentScore,
            maxAssignmentMarks,
        },
        exams: examSubmissions.map(({ submission, exam }) => ({
            submissionId: submission.id,
            examId: exam.id,
            examTitle: exam.title,
            classroomId: exam.classroomId,
            totalMarks: exam.totalMarks,
            score: submission.score,
            status: submission.status,
            submittedAt: submission.submittedAt,
        })),
        assignments: assignmentRows.map(({ submission, assignment }) => ({
            submissionId: submission.id,
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
            classroomId: assignment.classroomId,
            totalMarks: assignment.totalMarks,
            totalMarksAwarded: submission.totalMarksAwarded,
            status: submission.status,
            submittedAt: submission.submittedAt,
        })),
    };
};
