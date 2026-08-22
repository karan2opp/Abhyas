import { repairQuestionGeneration, type QuestionItem } from "./agents/repair_agent.js";

export interface RagChunk {
    source: string;
    text: string;
}

export interface GenerationUnit {
    topic: string;
    subtopic?: string;
    questionType: string;
    count: number;
    marks: number;
    subject: string;
    instructions?: string[];
}

/**
 * Shared inner loop of the generation pipeline: for a batch of generation units,
 * fetch RAG context concurrently, build the agent payload, call the agent, and run
 * repair (count + dedup). The caller supplies the agent-specific callbacks; error
 * handling and accumulation stay with the caller.
 */
export async function runGenerationBatch({
    units,
    fetchContext,
    fetchExamples,
    buildPayload,
    applyMissingCount,
    callAgent,
    existingQuestions,
    label,
}: {
    units: GenerationUnit[];
    fetchContext: (unit: GenerationUnit) => Promise<RagChunk[]>;
    fetchExamples?: (unit: GenerationUnit) => Promise<any[]>;
    buildPayload: (units: GenerationUnit[], contexts: RagChunk[][], examples: any[][]) => any;
    applyMissingCount: (batch: any, count: number) => any;
    callAgent: (payload: any) => Promise<{ questions?: QuestionItem[] }>;
    existingQuestions: QuestionItem[];
    label: string;
}): Promise<QuestionItem[]> {
    const contexts = await Promise.all(units.map((unit) => fetchContext(unit)));
    const examples = fetchExamples
        ? await Promise.all(units.map((unit) => fetchExamples(unit)))
        : units.map(() => []);

    const payload = buildPayload(units, contexts, examples);
    const expectedCount = units.reduce((sum, unit) => sum + unit.count, 0);

    const agentResponse = await callAgent(payload);
    const initialQuestions = agentResponse?.questions || [];

    return repairQuestionGeneration({
        payload,
        initialQuestions,
        expectedCount,
        generateDeltaFn: async (deltaPayload, missingCount, existing) => {
            const existingTexts = existing.map((q) => q.question_text || q.description).filter(Boolean);
            const rebuiltPayload = {
                ...deltaPayload,
                batch: applyMissingCount(deltaPayload.batch, missingCount),
                instructions: [
                    ...(deltaPayload.instructions || []),
                    `IMPORTANT REPAIR INSTRUCTION: Generate EXACTLY ${missingCount} new distinct question(s). Do NOT duplicate existing questions: ${JSON.stringify(existingTexts.slice(-5))}`
                ]
            };
            const res = await callAgent(rebuiltPayload);
            return res?.questions || [];
        },
        existingQuestions,
        label,
    });
}

/**
 * Group units into batches, capping the total question count per batch without
 * ever splitting a single unit across batches.
 */
export function batchByQuestionCount(units: GenerationUnit[], maxPerBatch: number): GenerationUnit[][] {
    const batches: GenerationUnit[][] = [];
    let current: GenerationUnit[] = [];
    let currentCount = 0;

    for (const unit of units) {
        if (current.length > 0 && currentCount + unit.count > maxPerBatch) {
            batches.push(current);
            current = [];
            currentCount = 0;
        }
        current.push(unit);
        currentCount += unit.count;
    }
    if (current.length > 0) {
        batches.push(current);
    }

    return batches;
}
