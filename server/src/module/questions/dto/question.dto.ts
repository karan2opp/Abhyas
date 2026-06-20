import { z } from "zod"

const optionSchema = z.object({
  value: z.string({ message: "Option value is required" })
    .min(1, { message: "Option value cannot be empty" }),
  isCorrect: z.boolean({ message: "isCorrect is required" }),
})

export const createQuestionSchema = z.object({
  sectionId: z.string({ message: "Section ID is required" })
    .min(1, { message: "Section ID cannot be empty" }),
  type: z.enum(["mcq", "descriptive"], {
    message: "Question type must be mcq or descriptive"
  }),
  images: z.array(z.object({
    url: z.string().url(),
    publicId: z.string()
  })).optional(),
  description: z.string({ message: "Description is required" })
    .min(10, { message: "Description must be at least 10 characters long" }),
  marks: z.number({ message: "Marks are required" })
    .min(0.5, { message: "Marks must be at least 0.5" }),
  options: z.array(optionSchema)
    .min(2, { message: "MCQ must have at least 2 options" })
    .max(5, { message: "MCQ cannot have more than 5 options" })
    .optional(),
})
  .refine((data) => {
    if (data.type === "mcq" && (!data.options || data.options.length === 0)) return false
    return true
  }, { message: "MCQ questions must have options" })
  .refine((data) => {
    if (data.type === "descriptive" && data.options) return false
    return true
  }, { message: "Descriptive questions cannot have options" })
  .refine((data) => {
    if (data.type === "mcq" && data.options) {
      return data.options.some(opt => opt.isCorrect === true)
    }
    return true
  }, { message: "MCQ must have at least one correct option" })

export type CreateQuestionDto = z.infer<typeof createQuestionSchema>

export const updateQuestionSchema = z.object({
  description: z.string()
    .min(10, { message: "Description must be at least 10 characters long" })
    .optional(),
  marks: z.number()
    .min(0.5, { message: "Marks must be at least 0.5" })
    .optional(),
  images: z.array(z.object({
    url: z.string().url(),
    publicId: z.string()
  })).optional(),
  options: z.array(optionSchema.extend({ id: z.string().optional() }))
    .min(2, { message: "MCQ must have at least 2 options" })
    .max(5, { message: "MCQ cannot have more than 5 options" })
    .optional(),
})

export type UpdateQuestionDto = z.infer<typeof updateQuestionSchema>

export const subTopicSchema = z.object({
  name: z.string({ message: "Subtopic name is required" }),
  count: z.number({ message: "Count is required" }).min(1, { message: "Count must be at least 1" }),
  questionTypes: z.array(z.enum(["mcq", "text"]), { message: "Question types are required" })
    .min(1, { message: "At least one question type is required" }),
})

export type SubTopic = z.infer<typeof subTopicSchema>

export const topicSchema = z.object({
  name: z.string({ message: "Topic name is required" }),
  subtopics: z.array(subTopicSchema, { message: "Subtopics are required" })
    .min(1, { message: "At least one subtopic is required" }),
})

export type Topic = z.infer<typeof topicSchema>

export const generateQuestionConfigSchema = z.object({
  subject: z.string({ message: "Subject is required" }),
  difficulty: z.string({ message: "Difficulty is required" }),
  topics: z.array(topicSchema, { message: "Topics are required" })
    .min(1, { message: "At least one topic is required" }),
  textMarks: z.number().min(0.5).optional(),
  customInstructions: z.string().optional(),
  includeExplanation: z.boolean().optional(),
})

export type GenerateQuestionConfig = z.infer<typeof generateQuestionConfigSchema>