import { z } from "zod";

export const createGroupSchema = z.object({
    name: z.string({ message: "Group name is required" })
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must be at most 100 characters")
        .trim(),
    classroomId: z.string({ message: "Classroom ID is required" })
        .min(1, "Classroom ID cannot be empty"),
});

export const updateGroupSchema = z.object({
    name: z.string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must be at most 100 characters")
        .trim()
        .optional(),
});

export const addStudentToGroupSchema = z.object({
    studentId: z.string({ message: "Student ID is required" })
        .min(1, "Student ID cannot be empty"),
});

export type CreateGroupDto = z.infer<typeof createGroupSchema>;
export type UpdateGroupDto = z.infer<typeof updateGroupSchema>;
export type AddStudentToGroupDto = z.infer<typeof addStudentToGroupSchema>;
