import { z } from "zod";

export const SubtopicZodSchema = z.object({
    name: z.string().describe("The name of the subtopic"),
    weight: z.number().int().min(1).max(10).describe("Relative importance weight of the subtopic (1-10)"),
    allocatedQuestions: z.number().int().nullable().describe("Number of questions allocated (computed downstream)"),
});

export const TopicZodSchema = z.object({
    topic: z.string().describe("The name of the topic"),
    weight: z.number().int().min(1).max(10).describe("Relative importance weight of the topic (1-10)"),
    subtopics: z.array(SubtopicZodSchema).describe("List of subtopics under this topic"),
    allocatedQuestions: z.number().int().nullable().describe("Number of questions allocated (computed downstream)"),
});

export const BlockOutputZodSchema = z.object({
    name: z.string().describe("The name of the block"),
    subject: z.string().describe("The subject of this block"),
    instructions: z.array(z.string()).describe("Instructions specific to this block (empty array if none)"),
    topics: z.array(TopicZodSchema).describe("List of topics under this block"),
});

export const SectionOutputZodSchema = z.object({
    name: z.string().describe("The name of the section"),
    blocks: z.array(BlockOutputZodSchema).describe("List of blocks under this section"),
});

export const SubtopicAgentOutputZodSchema = z.object({
    sections: z.array(SectionOutputZodSchema).describe("List of sections in the exam"),
});

export type Subtopic = z.infer<typeof SubtopicZodSchema>;
export type Topic = z.infer<typeof TopicZodSchema>;
export type BlockOutput = z.infer<typeof BlockOutputZodSchema>;
export type SectionOutput = z.infer<typeof SectionOutputZodSchema>;
export type SubtopicAgentOutput = z.infer<typeof SubtopicAgentOutputZodSchema>;
