import { assertSafeGenerationRequest } from "./agents/guardrail_agent.js";
import { queryRelevantChunks, resolveIndexedSubject } from "./rag/rag.service.js";
import { tryGenerateContext, contextToText } from "./agents/context_agent.js";
import { assingmentAgent } from "./agents/assignment_agent.js";
import { repairQuestionGeneration } from "./agents/repair_agent.js";
import { runGenerationBatch, type GenerationUnit } from "./runner.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { z } from "zod";
import { ExamTypeZodEnum, DifficultyZodEnum, QuestionTypeZodEnum } from "./Types/inputExam.js";

const AssignmentBlockInputSchema = z.object({
    name: z.string(),
    subject: z.string(),
    question_type: QuestionTypeZodEnum,
    question_count: z.number().int().positive(),
    marks_per_question: z.number().positive(),
    instructions: z.array(z.string()).optional(),
    topics: z.array(z.string()).min(1),
});

const AssignmentGenerationInputSchema = z.object({
    exam_type: ExamTypeZodEnum,
    difficulty: DifficultyZodEnum,
    instructions: z.array(z.string()).optional(),
    blocks: z.array(AssignmentBlockInputSchema).min(1),
});

const SingleQuestionGenerationInputSchema = z.object({
    subject: z.string(),
    exam_type: ExamTypeZodEnum,
    difficulty: DifficultyZodEnum,
    question_type: QuestionTypeZodEnum,
    topic: z.string(),
    marks: z.number().positive(),
    instructions: z.array(z.string()).optional(),
});

export type AssignmentBlockInput = z.infer<typeof AssignmentBlockInputSchema>;
export type AssignmentGenerationInput = z.infer<typeof AssignmentGenerationInputSchema>;
export type SingleQuestionGenerationInput = z.infer<typeof SingleQuestionGenerationInputSchema>;

export const generateMockAssignment = async (input: AssignmentGenerationInput, organisationId?: string | null): Promise<any> => {
    // 1. Validate Input
    const parseResult = AssignmentGenerationInputSchema.safeParse(input);
    if (!parseResult.success) {
        throw ApiError.badRequest("Invalid assignment generation input data structure.");
    }
    const data = parseResult.data;

    // 2. Safety Guardrail on Blocks and Instructions
    const allTopics = data.blocks.flatMap((b) => b.topics).join(", ");
    const blockSummaries = data.blocks.map((b) => `subject "${b.subject}" (${b.question_count} ${b.question_type} questions) topics [${b.topics.join(", ")}]`).join("; ");
    const specialInstructions = data.instructions ? data.instructions.join(", ") : "None";
    await assertSafeGenerationRequest(
        `Generate assignment exam questions for: ${blockSummaries}. Topics covered: ${allTopics}. Special instructions: ${specialInstructions}.`
    );

    const finalBlocks: any[] = [];

    for (const block of data.blocks) {
        // 3. Distribute questions and marks across topics within this block
        const topicsCount = block.topics.length;
        const baseQuestionCount = Math.floor(block.question_count / topicsCount);
        let extraQuestions = block.question_count % topicsCount;

        const topicConfigurations = block.topics.map((topic, index) => {
            const count = baseQuestionCount + (index < extraQuestions ? 1 : 0);
            return { topic, count, marks: block.marks_per_question };
        }).filter((tc) => tc.count > 0);

        // 4. Convert topic configurations to generation units (subject per block)
        const units: GenerationUnit[] = topicConfigurations.map((tc) => ({
            topic: tc.topic,
            questionType: block.question_type,
            count: tc.count,
            marks: tc.marks,
            subject: block.subject,
            instructions: [...(data.instructions || []), ...(block.instructions || [])],
        }));

        const blockQuestions: any[] = [];
        const batchSize = 3;

        for (let i = 0; i < units.length; i += batchSize) {
            const batch = units.slice(i, i + batchSize);

            try {
                const repairedQuestions = await runGenerationBatch({
                    units: batch,
                    fetchContext: async (unit) => {
                        const generated = await tryGenerateContext({
                            subject: unit.subject,
                            topic: unit.topic,
                            subtopic: unit.topic,
                            difficulty: data.difficulty,
                            question_type: unit.questionType,
                            instructions: [...(data.instructions || []), ...(block.instructions || [])],
                        });
                        const generatedText = generated ? contextToText(generated) : null;

                        let ragChunks: any[] = [];
                        try {
                            const { matched } = await resolveIndexedSubject(unit.subject, organisationId);
                            if (matched) {
                                ragChunks = await queryRelevantChunks(
                                    matched,
                                    unit.topic,
                                    unit.topic,
                                    4,
                                    organisationId,
                                    generatedText ?? undefined
                                );
                            }
                        } catch (ragError) {
                            console.error(`Failed to fetch RAG chunks for topic "${unit.topic}":`, ragError);
                        }

                        const entries: { source: string; text: string }[] = [];
                        if (generatedText) entries.push({ source: "agent-generated context", text: generatedText });
                        entries.push(...ragChunks.map((c) => ({ source: c.sourceFile, text: c.text })));
                        return entries;
                    },
                    buildPayload: (batchUnits, contexts) => ({
                        subject: block.subject,
                        exam_type: data.exam_type,
                        difficulty: data.difficulty,
                        question_type: block.question_type,
                        batch: batchUnits.map((u) => ({ topic: u.topic, question_type: u.questionType, count: u.count, marks: u.marks })),
                        rag_context: batchUnits.flatMap((u, i) =>
                            (contexts[i] || []).map((rc) => ({ topic: u.topic, source: rc.source, text: rc.text }))
                        ),
                        instructions: [...(data.instructions || []), ...(block.instructions || [])],
                    }),
                    applyMissingCount: (batch, count) => batch.map((b: any) => ({ ...b, count })),
                    callAgent: async (payload) => assingmentAgent(payload, false),
                    existingQuestions: blockQuestions,
                    label: `Assignment Block "${block.name}" Batch (${batch.map((u) => u.topic).join(", ")})`,
                });

                blockQuestions.push(...repairedQuestions);
            } catch (genError: any) {
                if (genError instanceof ApiError) throw genError;
                console.error(`Assignment generation failed for block "${block.name}":`, genError);
                throw ApiError.internal(`Failed to generate assignment questions: ${genError.message}`);
            }
        }

        finalBlocks.push({
            name: block.name,
            subject: block.subject,
            question_type: block.question_type,
            instructions: block.instructions || [],
            total_marks: block.question_count * block.marks_per_question,
            questions: blockQuestions,
        });
    }

    return {
        difficulty: data.difficulty,
        instructions: data.instructions || [],
        blocks: finalBlocks,
    };
};

export const generateSingleAssignmentQuestion = async (input: SingleQuestionGenerationInput, organisationId?: string | null): Promise<any> => {
    // 1. Validate Input
    const parseResult = SingleQuestionGenerationInputSchema.safeParse(input);
    if (!parseResult.success) {
        throw ApiError.badRequest("Invalid single question generation input data structure.");
    }
    const data = parseResult.data;

    // 2. Safety Guardrail
    const specialInstructions = data.instructions ? data.instructions.join(", ") : "None";
    await assertSafeGenerationRequest(
        `Generate a single exam question (${data.question_type}) for subject "${data.subject}" on topic "${data.topic}". Special instructions: ${specialInstructions}.`
    );

    // 3. Always generate a study-note context for the topic, then run a single
    // subject-only semantic search using it as the query.
    const generated = await tryGenerateContext({
        subject: data.subject,
        topic: data.topic,
        subtopic: data.topic,
        difficulty: data.difficulty,
        question_type: data.question_type,
        instructions: data.instructions || [],
    });
    const generatedText = generated ? contextToText(generated) : null;

    let chunks: any[] = [];
    try {
        const { matched } = await resolveIndexedSubject(data.subject, organisationId);
        if (matched) {
            chunks = await queryRelevantChunks(
                matched,
                data.topic,
                data.topic,
                4,
                organisationId,
                generatedText ?? undefined
            );
        }
    } catch (ragError) {
        console.error(`Failed to fetch RAG chunks for topic "${data.topic}":`, ragError);
    }

    const ragContextForAgent = [];
    if (generatedText) {
        ragContextForAgent.push({ topic: data.topic, source: "agent-generated context", text: generatedText });
    }
    ragContextForAgent.push(...chunks.map(c => ({
        topic: data.topic,
        source: c.sourceFile,
        text: c.text
    })));

    const generationPayload = {
        subject: data.subject,
        exam_type: data.exam_type,
        difficulty: data.difficulty,
        question_type: data.question_type,
        batch: [{
            topic: data.topic,
            question_type: data.question_type,
            count: 1,
            marks: data.marks
        }],
        rag_context: ragContextForAgent,
        instructions: data.instructions || []
    };

    // 4. Call Assignment Agent in Single Mode with Repair Agent
    try {
        const response = await assingmentAgent(generationPayload, true);
        const initialQuestions = response?.question ? [response.question] : [];

        const repairedQuestions = await repairQuestionGeneration({
            payload: generationPayload,
            initialQuestions,
            expectedCount: 1,
            generateDeltaFn: async (payload) => {
                const res = await assingmentAgent(payload, true);
                return res?.question ? [res.question] : [];
            },
            label: `Single Question (${data.topic})`
        });

        return repairedQuestions[0];
    } catch (genError: any) {
        if (genError instanceof ApiError) throw genError;
        console.error(`Single question generation failed:`, genError);
        throw ApiError.internal(`Failed to generate question: ${genError.message}`);
    }
};
