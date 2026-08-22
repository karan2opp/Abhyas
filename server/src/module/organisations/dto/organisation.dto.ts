import { z } from "zod";

export const createOrganisationSchema = z.object({
    name: z.string({ message: "Organisation name is required" })
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must be at most 100 characters")
        .trim(),
    contactEmail: z.string().email("Invalid contact email").toLowerCase().optional().or(z.literal("")),
    phone: z.string().max(30).optional().or(z.literal("")),
    address: z.string().max(500).optional().or(z.literal("")),
    logoUrl: z.string().url("Invalid logo URL").optional().or(z.literal("")),
    logoPublicId: z.string().optional().or(z.literal("")),
});

export const updateOrganisationSchema = createOrganisationSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field is required" }
);

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
export type UpdateOrganisationDto = z.infer<typeof updateOrganisationSchema>;
export type AssignUserDto = z.infer<typeof assignUserSchema>;
export type AssignManagerDto = z.infer<typeof assignManagerSchema>;
export type AssignTeacherDto = z.infer<typeof assignTeacherSchema>;
