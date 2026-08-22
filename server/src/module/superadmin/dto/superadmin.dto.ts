import { z } from "zod";

export const manageAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const searchUserSchema = z.object({
  email: z.string().email("Invalid email address"),
});
