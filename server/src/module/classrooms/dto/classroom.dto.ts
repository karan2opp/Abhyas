import { z } from "zod";

export const createClassroomSchema = z.object({
    name: z.string({ message: "Classroom name is required" })
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must be at most 100 characters")
        .trim(),
    joinCodeExpiresInDays: z.number().int().min(1).max(90).optional(),
    joinCodeMaxUses: z.number().int().min(1).max(1000).optional(),
});

export const updateClassroomSchema = z.object({
    name: z.string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must be at most 100 characters")
        .trim()
        .optional(),
});

export const regenerateJoinCodeSchema = z.object({
    joinCodeExpiresInDays: z.number().int().min(1).max(90).optional(),
    joinCodeMaxUses: z.number().int().min(1).max(1000).optional(),
});

export const joinClassroomSchema = z.object({
    joinCode: z.string({ message: "Join code is required" })
        .length(6, "Join code must be exactly 6 characters")
        .transform((val) => val.toUpperCase()),
});

export const addTeacherSchema = z.object({
    email: z.string({ message: "Teacher email is required" })
        .email("Invalid email address")
        .toLowerCase(),
});

export const inviteStudentSchema = z.object({
    email: z.string({ message: "Student email is required" })
        .email("Invalid email address")
        .toLowerCase(),
});

export type CreateClassroomDto = z.infer<typeof createClassroomSchema>;
export type UpdateClassroomDto = z.infer<typeof updateClassroomSchema>;
export type RegenerateJoinCodeDto = z.infer<typeof regenerateJoinCodeSchema>;
export type JoinClassroomDto = z.infer<typeof joinClassroomSchema>;
export type AddTeacherDto = z.infer<typeof addTeacherSchema>;
export type InviteStudentDto = z.infer<typeof inviteStudentSchema>;
