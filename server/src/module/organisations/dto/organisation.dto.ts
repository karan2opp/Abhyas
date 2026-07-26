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

export type CreateOrganisationDto = z.infer<typeof createOrganisationSchema>;
export type AssignUserDto = z.infer<typeof assignUserSchema>;
