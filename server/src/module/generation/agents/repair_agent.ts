import { ApiError } from "../../../common/utils/ApiError.js";
import { findNearDuplicateIndices } from "../dedupe.js";

export interface QuestionItem {
    question_text?: string;
    description?: string;
    question?: string;
    text?: string;
    type?: string;
    question_type?: string;
    options?: any[];
    correct_option?: string;
    marks?: number;
    [key: string]: any;
}

/**
 * Validates whether a single generated question object meets basic structural and content completeness.
 */
export function isValidQuestion(q: any): boolean {
    if (!q || typeof q !== "object") return false;

    const text = q.question_text || q.description || q.question || q.text;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
        return false;
    }

    const qType = (q.type || q.question_type || "mcq").toLowerCase();
    if (qType === "mcq") {
        if (!Array.isArray(q.options) || q.options.length !== 4) {
            return false;
        }

        // Ensure all 4 options are non-empty
        const validOptions = q.options.filter((opt: any) => {
            if (typeof opt === "string") return opt.trim().length > 0;
            if (typeof opt === "object" && opt !== null) {
                const val = opt.value || opt.text || opt.option;
                return typeof val === "string" && val.trim().length > 0;
            }
            return false;
        });

        if (validOptions.length !== 4) {
            return false;
        }

        // Correct option must be a valid A-D letter
        if (!["A", "B", "C", "D"].includes(q.correct_option)) {
            return false;
        }
    }

    return true;
}

/**
 * Repair loop that verifies whether the expected amount of questions was generated.
 * If questions are missing or invalid, it executes a targeted delta generation for ONLY the missing part.
 * Then it detects near-duplicate questions (within the batch and against already-accepted
 * questions) and regenerates them. Maximum 2 retries per phase.
 */
export async function repairQuestionGeneration<TPayload>({
    payload,
    initialQuestions,
    expectedCount,
    generateDeltaFn,
    label = "Question Generation",
    existingQuestions = [],
}: {
    payload: TPayload;
    initialQuestions: QuestionItem[];
    expectedCount: number;
    generateDeltaFn: (deltaPayload: TPayload, missingCount: number, existingQuestions: QuestionItem[]) => Promise<QuestionItem[]>;
    label?: string;
    existingQuestions?: QuestionItem[];
}): Promise<QuestionItem[]> {
    const getQuestionText = (q: QuestionItem): string =>
        q.question_text || q.description || q.question || q.text || "";

    // 1. Filter out invalid/incomplete questions from initial run
    let validQuestions = (initialQuestions || []).filter(isValidQuestion).slice(0, expectedCount);

    const MAX_RETRIES = 2;
    let attempt = 0;

    // 2. Count repair — regenerate the missing part only
    while (validQuestions.length < expectedCount && attempt < MAX_RETRIES) {
        attempt++;
        const missingCount = expectedCount - validQuestions.length;
        console.log(`[RepairAgent] ${label} (Count Retry ${attempt}/${MAX_RETRIES}): requesting delta of ${missingCount} missing question(s)...`);

        try {
            const deltaQuestions = await generateDeltaFn(payload, missingCount, validQuestions);
            const validDelta = (deltaQuestions || []).filter(isValidQuestion);
            validQuestions.push(...validDelta);
        } catch (retryErr: any) {
            console.error(`[RepairAgent] ${label} count retry ${attempt} encountered error:`, retryErr?.message || retryErr);
        }
    }

    // 3. Dedup — detect near-duplicates and regenerate them
    attempt = 0;
    while (attempt < MAX_RETRIES) {
        const candidateTexts = validQuestions.map(getQuestionText);
        const existingTexts = existingQuestions.map(getQuestionText);

        let duplicateIndices: Set<number>;
        try {
            duplicateIndices = await findNearDuplicateIndices(candidateTexts, existingTexts);
        } catch (err: any) {
            console.error(`[RepairAgent] ${label} dedup detection failed:`, err?.message || err);
            break;
        }

        if (duplicateIndices.size === 0) break;

        attempt++;
        const dupSet = new Set(duplicateIndices);
        const kept = validQuestions.filter((_, i) => !dupSet.has(i));
        console.log(`[RepairAgent] ${label} (Dedup Retry ${attempt}/${MAX_RETRIES}): ${duplicateIndices.size} duplicate(s), regenerating...`);

        try {
            const regenerated = await generateDeltaFn(payload, duplicateIndices.size, [...existingQuestions, ...kept]);
            const validRegen = (regenerated || []).filter(isValidQuestion);
            validQuestions = [...kept, ...validRegen];
        } catch (retryErr: any) {
            console.error(`[RepairAgent] ${label} dedup retry ${attempt} encountered error:`, retryErr?.message || retryErr);
        }
    }

    // 4. If output still does not match expected count after retries, throw ApiError
    if (validQuestions.length < expectedCount) {
        const errorMessage = `Question generation incomplete: Output not matched for ${label}. Expected ${expectedCount} question(s), but only generated ${validQuestions.length} after repair retries.`;
        console.error(`[RepairAgent Failure] ${errorMessage}`);
        throw ApiError.internal(errorMessage);
    }

    return validQuestions.slice(0, expectedCount);
}
