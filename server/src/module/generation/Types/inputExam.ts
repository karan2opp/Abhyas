import { z } from "zod";

export const QuestionTypeZodEnum = z.enum(["mcq", "descriptive"]);
export const DifficultyZodEnum = z.enum(["easy", "medium", "hard"]);
export const ExamTypeZodEnum = z.enum(["programming", "tally", "fc", "other"]);

export const IBlockZodSchema = z.object({
    name: z.string(),
    subject: z.string(),
    instructions: z.array(z.string()).optional(),
    question_count: z.number().int().positive(),
    question_type: QuestionTypeZodEnum,
    total_marks: z.number().int().positive(),
    topics: z.array(z.string()),
});

export const ISectionZodSchema = z.object({
    name: z.string(),
    blocks: z.array(IBlockZodSchema),
});

export const IInputExamZodSchema = z.object({
    title: z.string().optional(),
    difficulty: DifficultyZodEnum,
    exam_type: ExamTypeZodEnum.optional(),
    instructions: z.array(z.string()).optional(),
    sections: z.array(ISectionZodSchema),
});

export type QuestionType = z.infer<typeof QuestionTypeZodEnum>;
export type Difficulty = z.infer<typeof DifficultyZodEnum>;
export type ExamType = z.infer<typeof ExamTypeZodEnum>;
export type IBlock = z.infer<typeof IBlockZodSchema>;
export type ISection = z.infer<typeof ISectionZodSchema>;
export type IInputExam = z.infer<typeof IInputExamZodSchema>;
