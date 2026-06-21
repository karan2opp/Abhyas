import { z } from "zod";

export const manageAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
});
