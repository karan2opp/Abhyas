import { z } from "zod"

export const registerSchema = z.object({
    name: z.string({ message: "Name is required" })
        .min(2, "Name must be at least 2 characters")
        .max(50, "Name must be at most 50 characters")
        .trim(),

    email: z.string({ message: "Email is required" })
        .email("Invalid email address")
        .toLowerCase(),

    password: z.string({ message: "Password is required" })
        .min(8, "Password must be at least 8 characters")
        .regex(/(?=.*[A-Z])/, "Password must contain at least one uppercase letter")
        .regex(/(?=.*\d)/, "Password must contain at least one number"),

    role: z.enum(["student", "teacher", "admin"]).optional().default("student"),

    phone: z.string()
        .length(10, "Phone must be 10 digits")
        .regex(/^[0-9]+$/, "Phone must contain only numbers")
        .optional(),
})

export const loginSchema = z.object({
    email: z.string({ message: "Email is required" })
        .email("Invalid email address")
        .toLowerCase(),
    password: z.string({ message: "Password is required" })
})

export const forgotPasswordSchema = z.object({
    email: z.string({ message: "Email is required" })
        .email("Invalid email address")
        .toLowerCase(),
})

export const resetPasswordSchema = z.object({
    password: z.string({ message: "Password is required" })
        .min(8, "Password must be at least 8 characters")
        .regex(/(?=.*[A-Z])/, "Password must contain at least one uppercase letter")
        .regex(/(?=.*\d)/, "Password must contain at least one number"),
})

export type RegisterDto = z.infer<typeof registerSchema>
export type LoginDto = z.infer<typeof loginSchema>
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>