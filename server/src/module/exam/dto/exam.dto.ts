import { z } from "zod";

export const createExamSchema = z.object({
  title: z.string({ message: "Title is required" })
    .min(3, { message: "Title must be at least 3 characters long" })
    .max(100, { message: "Title cannot exceed 100 characters" }),
  instructions: z.array(z.string()).optional(),
  duration: z.number({ message: "Duration is required" })
    .min(1, { message: "Duration must be at least 1 minute" })
    .max(180, { message: "Duration cannot exceed 180 minutes" }).optional(),
  startTime: z.coerce.date({ message: "Start time is required" }),
  endTime: z.coerce.date({ message: "End time is required" }),
  totalMarks: z.number({ message: "Total marks is required" })
    .min(1, { message: "Total marks must be at least 1" }),
}).refine(data => data.endTime > data.startTime, {
  message: "End time must be after start time",
  path: ["endTime"],
});

export type CreateExamDto = z.infer<typeof createExamSchema>;

export const updateExamSchema = z.object({
  title: z.string({ message: "Title must be a string" })
    .min(3, { message: "Title must be at least 3 characters long" })
    .max(100, { message: "Title cannot exceed 100 characters" })
    .optional(),
  instructions: z.array(z.string()).optional(),
  duration: z.number({ message: "Duration must be a number" })
    .min(1, { message: "Duration must be at least 1 minute" })
    .max(180, { message: "Duration cannot exceed 180 minutes" })
    .optional(),
  startTime: z.coerce.date({ message: "Invalid start time date format" }).optional(),
  endTime: z.coerce.date({ message: "Invalid end time date format" }).optional(),
  totalMarks: z.number({ message: "Total marks must be a number" })
    .min(1, { message: "Total marks must be at least 1" })
    .optional(),
}).refine(data => {
  if (data.startTime && data.endTime) {
    return data.endTime > data.startTime;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});

export type UpdateExamDto = z.infer<typeof updateExamSchema>;

export const joinExamSchema = z.object({
  joinCode: z.string({ message: "Join code is required" })
    .length(6, { message: "Join code must be exactly 6 characters" })
    .regex(/^[A-Z0-9]+$/, { message: "Join code must be uppercase letters and numbers only" }),
});

export type JoinExamDto = z.infer<typeof joinExamSchema>;
