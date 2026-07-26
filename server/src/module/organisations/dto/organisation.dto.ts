import { z } from "zod";

export const createOrganisationSchema = z.object({
    name: z.string({ message: "Organisation name is required" })
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must be at most 100 characters")
        .trim(),
});

export const assignUserSchema = z.object({
    organisationId: z.string({ message: "organisationId is required" }),
});

export const assignManagerSchema = z.object({
    email: z.string({ message: "Email is required" }).email("Invalid email address").toLowerCase(),
});

export const assignTeacherSchema = z.object({
    email: z.string({ message: "Email is required" }).email("Invalid email address").toLowerCase(),
});

export type CreateOrganisationDto = z.infer<typeof createOrganisationSchema>;
export type AssignUserDto = z.infer<typeof assignUserSchema>;
export type AssignManagerDto = z.infer<typeof assignManagerSchema>;
export type AssignTeacherDto = z.infer<typeof assignTeacherSchema>;
