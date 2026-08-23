import { assertSafeGenerationRequest } from "./agents/guardrail_agent.js";
import { Subtopics_Agent } from "./agents/subtopics_agent.js";
import { mapMcqOptions } from "./mcq.js";
import { allocateSectionQuestions } from "./allocation.js";
import { queryRelevantChunks } from "./rag/rag.service.js";
import { retrieveExampleQuestions } from "./questionBank/questionBank.service.js";
import { recordUsage } from "../billing/usage.service.js";
import { generationAgent } from "./agents/generation_agent.js";
import { verificationAgent } from "./agents/verification_agent.js";
import { runGenerationBatch, batchByQuestionCount, type GenerationUnit } from "./runner.js";
import { IInputExamZodSchema } from "./Types/inputExam.js";
import type { IInputExam } from "./Types/inputExam.js";
import { ApiError } from "../../common/utils/ApiError.js";

/**
 * Attaches per-topic "reference_examples" (previous questions tagged with the
 * requested difficulty) from the question bank to a deep clone of the exam
 * input, so the Subtopics Agent can gauge difficulty from real questions.
 * Each block gets a "reference_examples" array of { topic, examples }. Fetches
 * are cached per (subject, topic, difficulty, question_type) within a single
 * planning call; empty/error results leave the field absent so the agent
 * falls back to the subject/topics/instructions.
 */
const attachPlanningExamples = async (data: IInputExam, organisationId?: string | null): Promise<IInputExam> => {
    const clone = structuredClone(data);
    const cache = new Map<string, any[]>();
    const difficulty = data.difficulty || "medium";

    for (const section of clone.sections) {
        for (const block of section.blocks) {
            const type = block.question_type || "mcq";
            const blockExamples: { topic: string; examples: any[] }[] = [];
            for (const topic of block.topics || []) {
                const key = `${block.subject}|${topic}|${difficulty}|${type}`;
                if (!cache.has(key)) {
                    let examples: any[] = [];
                    try {
                        examples = await retrieveExampleQuestions(block.subject, topic, "", type, difficulty, 3, 15, 0.7, organisationId);
                    } catch (err) {
                        console.error(`Failed to fetch planning examples for topic "${topic}":`, err);
                    }
                    cache.set(key, examples);
                }
                const examples = cache.get(key) || [];
                if (examples.length > 0) {
                    blockExamples.push({ topic, examples });
                }
            }
            if (blockExamples.length > 0) {
                (block as any).reference_examples = blockExamples;
            }
        }
    }

    return clone;
};

/**
 * Step 1 of Interactive AI Exam Workflow:
 * Generates topic/subtopic allocation blueprint tree without generating question texts.
 * Each section contains subject-scoped BLOCKS.
 */
export const generateExamBlueprint = async (input: IInputExam, organisationId?: string | null): Promise<any> => {
    const parseResult = IInputExamZodSchema.safeParse(input);
    if (!parseResult.success) {
        console.error("Zod Validation Failed for generateExamBlueprint:", JSON.stringify(parseResult.error.format(), null, 2));
        const issues = parseResult.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
        throw ApiError.badRequest(`Invalid input data structure: ${issues}`);
    }
    const data = parseResult.data;

    // Safety Guardrail (per-block subjects)
    const allTopics = data.sections.flatMap((s) => s.blocks.flatMap((b) => b.topics)).join(", ");
    const subjects = data.sections.flatMap((s) => s.blocks.map((b) => b.subject)).join(", ");
    const specialInstructions = data.instructions ? data.instructions.join(", ") : "None";
    await assertSafeGenerationRequest(
        `Create an exam blueprint with title "${data.title || "Untitled"}" and subjects "${subjects}". Topics: ${allTopics}. Special instructions: ${specialInstructions}.`
    );

    // Subtopics Agent Planner (with per-topic difficulty examples from the bank)
    let agentOutput;
    try {
        const planningInput = await attachPlanningExamples(data, organisationId);
        agentOutput = await Subtopics_Agent(planningInput);
    } catch (agentErr: any) {
        console.error("Subtopics Agent planning failed:", agentErr);
        throw ApiError.internal(`Planning failed: ${agentErr.message}`);
    }

    // Two-Pass Question Allocation
    const allocatedSections = allocateSectionQuestions(data.sections, agentOutput.sections);

    return {
        title: data.title || "Untitled Exam",
        difficulty: data.difficulty,
        exam_type: data.exam_type,
        instructions: data.instructions || [],
        sections: allocatedSections
    };
};

/**
 * Step 2 of Interactive AI Exam Workflow:
 * Invokes Verification Agent to check semantic relevance & allocation validity of the user-modified blueprint tree.
 */
export const verifyExamBlueprint = async (blueprint: any): Promise<any> => {
    if (!blueprint || !Array.isArray(blueprint.sections)) {
        throw ApiError.badRequest("Invalid blueprint data for verification.");
    }

    try {
        const verificationResult = await verificationAgent(blueprint);
        return verificationResult;
    } catch (err: any) {
        console.error("Verification Agent execution failed:", err);
        throw ApiError.internal(`Verification failed: ${err.message}`);
    }
};

/**
 * Step 3 of Interactive AI Exam Workflow:
 * Takes the verified blueprint tree, queries RAG context per block subject, and runs
 * question generation with Repair Agent.
 */
export const generateExamFromBlueprint = async (
    blueprint: any,
    organisationId?: string | null,
    onProgress?: (done: number, total: number, message?: string) => void
): Promise<any> => {
    if (!blueprint || !Array.isArray(blueprint.sections)) {
        throw ApiError.badRequest("Invalid blueprint structure.");
    }

    const finalSections: any[] = [];

    // Total questions to generate (matches per-block qCount resolution below)
    const totalQuestions = (blueprint.sections || []).reduce((sum: number, sec: any) =>
        sum + (sec.blocks || []).reduce((blockSum: number, blk: any) =>
            blockSum + (blk.question_count
                || (blk.topics || []).reduce((topicSum: number, top: any) =>
                    topicSum + (top.subtopics || []).reduce((subSum: number, sb: any) => subSum + (sb.allocatedQuestions || 0), 0), 0)
                || 5), 0), 0);
    let generatedSoFar = 0;

    for (const section of blueprint.sections) {
        const finalBlocks: any[] = [];

        for (const block of section.blocks || []) {
            const blockQuestions: any[] = [];

            // Calculate marks per question if not specified
            const qCount = block.question_count
                || block.topics?.reduce((s: number, t: any) => s + (t.subtopics?.reduce((ss: number, st: any) => ss + (st.allocatedQuestions || 0), 0) || 0), 0)
                || 5;
            const totalMarks = block.total_marks || 10;
            const marksPerQuestion = Math.round((totalMarks / Math.max(1, qCount)) * 100) / 100;

            // Flatten subtopics with active allocations into generation units
            const units: GenerationUnit[] = [];
            for (const topic of block.topics || []) {
                for (const subtopic of topic.subtopics || []) {
                    if (subtopic.allocatedQuestions && subtopic.allocatedQuestions > 0) {
                        units.push({
                            topic: topic.topic,
                            subtopic: subtopic.name,
                            questionType: block.question_type || "mcq",
                            count: subtopic.allocatedQuestions,
                            marks: marksPerQuestion,
                            subject: block.subject,
                            instructions: [...(blueprint.instructions || []), ...(block.instructions || [])],
                        });
                    }
                }
            }

            // Enforce block.question_count if specified
            const targetCount = block.question_count;
            if (targetCount && targetCount > 0 && units.length > 0) {
                const currentTotal = units.reduce((acc, u) => acc + u.count, 0);
                if (currentTotal !== targetCount) {
                    let runningTotal = 0;
                    const factor = targetCount / currentTotal;
                    units.forEach((u, idx) => {
                        if (idx === units.length - 1) {
                            u.count = Math.max(1, targetCount - runningTotal);
                        } else {
                            u.count = Math.max(1, Math.round(u.count * factor));
                            runningTotal += u.count;
                        }
                    });
                }
            }

            for (const batch of batchByQuestionCount(units, 10)) {
                const batchLabel = batch.map((u) => u.subtopic || u.topic).filter(Boolean).join(", ");
                onProgress?.(generatedSoFar, totalQuestions, batchLabel ? `Generating: ${batchLabel}` : "Generating questions...");
                try {
                    const repairedQuestions = await runGenerationBatch({
                        units: batch,
                        fetchContext: async (unit) => {
                            let chunks: any[] = [];
                            try {
                                chunks = await queryRelevantChunks(unit.subject, unit.topic, unit.subtopic ?? "", 4);
                            } catch (ragError) {
                                console.error(`Failed to fetch RAG chunks for "${unit.subtopic}":`, ragError);
                            }
                            return chunks.map((c) => ({ source: c.sourceFile, text: c.text }));
                        },
                        fetchExamples: async (unit) => {
                            let examples: any[] = [];
                            try {
                                examples = await retrieveExampleQuestions(
                                    unit.subject,
                                    unit.topic,
                                    unit.subtopic ?? "",
                                    unit.questionType,
                                    blueprint.difficulty || "medium",
                                    3,
                                    15,
                                    0.7,
                                    organisationId
                                );
                            } catch (ragError) {
                                console.error(`Failed to fetch example questions for "${unit.subtopic}":`, ragError);
                            }
                            return examples;
                        },
                        buildPayload: (batchUnits, contexts, examples) => ({
                            subject: block.subject,
                            exam_type: blueprint.exam_type || "programming",
                            difficulty: blueprint.difficulty || "medium",
                            batch: batchUnits.map((u) => ({
                                topic: u.topic,
                                subtopics: [{ name: u.subtopic, question_type: u.questionType, count: u.count, marks: u.marks }],
                            })),
                            rag_context: batchUnits.flatMap((u, i) =>
                                (contexts[i] || []).map((rc) => ({ topic: u.topic, subtopic: u.subtopic, source: rc.source, text: rc.text }))
                            ),
                            reference_examples: batchUnits.flatMap((u, i) =>
                                (examples[i] || []).map((e: any) => ({
                                    subtopic: u.subtopic,
                                    type: e.type,
                                    difficulty: e.difficulty,
                                    question: e.question,
                                    options: e.options,
                                    correct_option: e.correctOption,
                                    rubric: e.rubric,
                                }))
                            ),
                            instructions: [...(blueprint.instructions || []), ...(block.instructions || [])],
                        }),
                        applyMissingCount: (batch, count) =>
                            batch.map((b: any) => ({ ...b, subtopics: b.subtopics.map((st: any) => ({ ...st, count })) })),
                        callAgent: async (payload) => generationAgent(payload),
                        existingQuestions: blockQuestions,
                        label: `Exam Section "${section.name || section.section_name}" Block "${block.name}"`,
                    });

                    blockQuestions.push(...repairedQuestions);
                    onProgress?.(generatedSoFar + blockQuestions.length, totalQuestions);
                } catch (genError: any) {
                    if (genError instanceof ApiError) throw genError;
                    console.error(`Generation failed for block "${block.name}" of section "${section.name || section.section_name}":`, genError);
                }
            }

            if (block.question_count && blockQuestions.length > block.question_count) {
                blockQuestions.length = block.question_count;
            }

            generatedSoFar += blockQuestions.length;

            const formattedQuestions = blockQuestions.map((q: any) => {
                const qType = (q.type || q.question_type || block.question_type || "mcq").toLowerCase();
                const text = q.question_text || q.description || q.question || q.text || "Question";
                const marksEach = Number(q.marks) || Math.round(totalMarks / Math.max(1, blockQuestions.length)) || 1;

                if (qType === "mcq") {
                    const optionValues = (q.options || []).map((opt: any) =>
                        typeof opt === "string" ? opt : (opt.value || opt.text || opt.option || "")
                    );
                    return {
                        type: "mcq",
                        description: text,
                        marks: marksEach,
                        options: mapMcqOptions(optionValues, q.correct_option),
                    };
                }

                return {
                    type: "descriptive",
                    description: text,
                    marks: marksEach,
                    rubric: q.rubric || null
                };
            });

            finalBlocks.push({
                name: block.name,
                subject: block.subject,
                question_type: block.question_type || "mcq",
                instructions: block.instructions || [],
                total_marks: totalMarks,
                questions: formattedQuestions
            });
        }

        finalSections.push({
            targetSectionId: section.targetSectionId || section.target_section_id || null,
            name: section.name || section.section_name || "Section A",
            blocks: finalBlocks
        });
    }

    // Meter the actual number of questions generated for this organisation.
    if (organisationId) {
        const totalGenerated = finalSections.reduce(
            (sum: number, sec: any) => sum + (sec.blocks || []).reduce((bs: number, b: any) => bs + (b.questions?.length || 0), 0),
            0
        );
        try {
            await recordUsage(organisationId, "question_generation", totalGenerated);
        } catch (meterErr) {
            console.error(`[Billing] Failed to record generation usage for org ${organisationId}:`, meterErr);
        }
    }

    return {
        title: blueprint.title || "Untitled Exam",
        difficulty: blueprint.difficulty || "medium",
        instructions: blueprint.instructions || [],
        sections: finalSections
    };
};
