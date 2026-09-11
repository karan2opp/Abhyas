import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getClientForModel } from "../../common/agent/openai.client.js";
import { env } from "../../env.js";
import type { QuestionBankRawChunk } from "./question_bank_chunker.js";

const ClassifiedChunkZodSchema = z.object({
    index: z.number(),
    subject: z.string(),
    topics: z.array(z.string()).min(1),
    description: z.string(),
    needsCleanup: z.boolean().describe("true ONLY if the original text has a genuine mechanical defect. false in every other case, including text that is merely awkward, terse, or informally worded."),
    cleanedText: z.string().describe("Ignored by the caller unless needsCleanup is true — see needsCleanup."),
});

const ClassificationBatchZodSchema = z.object({
    classifications: z.array(ClassifiedChunkZodSchema),
});

export interface ChunkClassification {
    subject: string;
    topics: string[];
    description: string;
    // The question's text after a mechanical cleanup pass (see SYSTEM_PROMPT)
    // — never a rewrite. This is what gets stored/returned as the question,
    // replacing the raw chunker output.
    cleanedText: string;
}

// How many questions go into one classification call. Batching keeps cost
// down without making any one call so large the model starts dropping items.
const CLASSIFY_BATCH_SIZE = 8;

const SYSTEM_PROMPT = `You are preparing questions extracted from a previous-year exam paper for a searchable question bank. Each question was pulled out of a PDF automatically, so its text can OCCASIONALLY carry mechanical extraction defects: broken spacing (e.g. "the  boiling   point"), an OCR/spelling misread of a specific word, or a stray line that is not part of the question at all (a running header/footer, a lone page number, a fragment of an adjacent question that leaked in).

Your DEFAULT assumption for every question is that it needs NO changes. Set "needsCleanup" to true only when you can point to one of the three specific defects above. Do not set it to true because the phrasing is terse, informal, could read more smoothly, uses an unusual word choice, or is "not how you would have written it" — none of that is a defect, and none of it gets touched.

FORBIDDEN, even when needsCleanup is true — never do any of the following:
- Rephrasing or rewording a sentence, even to make it clearer or more natural.
- Adding words, explanations, or clarifications that were not in the original.
- Changing active/passive voice, sentence order, or punctuation style.
- "Fixing" grammar that is already understandable, just imperfect.
- Shortening, expanding, or summarizing the question.
- Changing any number, option, name, or unit.

Example — INPUT: "Which gas is absorbed by plants for photosythesis process from atmosphere"
- WRONG cleanedText (rewritten): "Which gas do plants absorb from the atmosphere during photosynthesis?" — this reworded and reordered the sentence; forbidden even though it reads better.
- CORRECT cleanedText (mechanical fix only): "Which gas is absorbed by plants for photosynthesis process from atmosphere" — only the misspelling "photosythesis" -> "photosynthesis" was touched; the awkward phrasing and word order are untouched because they are not defects.

When needsCleanup is true, "cleanedText" must be IDENTICAL to the original except for the specific defect(s) you are fixing — every other character stays as-is. When needsCleanup is false, "cleanedText" is ignored by the caller, so just repeat the original text in it.

For each question you are given, also return:
- "subject": the single subject it belongs to (e.g. "Physics", "Mathematics").
- "topics": one or more specific topics/concepts the question tests (e.g. ["Newton's Laws", "Friction"]). A question can genuinely span more than one topic — include all that apply, but do not pad the list with tenuous ones.
- "description": one or two plain-English sentences describing what the question is actually asking/testing. This is what gets embedded for semantic search, so make it concrete and specific rather than generic — mention the concept, the type of problem, and any numbers/context that matter. If the question references a table or figure, say so explicitly (e.g. "...using the data in the accompanying table" / "...based on the diagram provided").

Return one classification per question, echoing back the same "index" you were given so the caller can match your output to its input. Do not skip any question.`;

function chunkArray<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

/**
 * Classifies subject/topics/description AND does a mechanical cleanup pass
 * (spacing/spelling/stray-text-removal — never a rewrite) for a batch of
 * extracted question chunks, in one call per batch. This is the one LLM pass
 * in the pipeline that "understands" the question — everything else
 * (chunking, image/table attribution) is pure extraction. `description` is
 * deliberately the field embedded for search (see question_bank.service.ts)
 * rather than the question text, since the text alone is often too thin to
 * search well (e.g. "Find x in the figure below").
 */
export async function classifyQuestionBankChunks(chunks: QuestionBankRawChunk[]): Promise<ChunkClassification[]> {
    if (chunks.length === 0) return [];

    const client = await getClientForModel(env.GENERATION_MODEL);
    const results: (ChunkClassification | undefined)[] = new Array(chunks.length);

    const indexed = chunks.map((chunk, index) => ({ chunk, index }));

    for (const batch of chunkArray(indexed, CLASSIFY_BATCH_SIZE)) {
        const payload = batch.map(({ chunk, index }) => ({
            index,
            questionNumber: chunk.questionNumber,
            text: chunk.rawText,
            tables: chunk.tables.map((t) => ({ header: t.header, rows: t.rows })),
            hasImages: chunk.images.length > 0,
        }));

        const response = await client.chat.completions.create({
            model: env.GENERATION_MODEL,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: JSON.stringify({ questions: payload }) },
            ],
            response_format: zodResponseFormat(ClassificationBatchZodSchema, "question_bank_classification"),
        });

        const content = response.choices[0]?.message.content || "{}";
        const parsed = ClassificationBatchZodSchema.parse(JSON.parse(content));

        for (const item of parsed.classifications) {
            if (item.index >= 0 && item.index < results.length) {
                // Enforced in code, not just prompt: unless the model explicitly
                // flags a defect, the original text is used verbatim — whatever
                // it put in cleanedText is discarded. This is what actually
                // prevents rewriting, independent of how well the model follows
                // the prompt on any given call.
                const original = chunks[item.index]?.rawText ?? "";
                results[item.index] = {
                    subject: item.subject,
                    topics: item.topics,
                    description: item.description,
                    cleanedText: item.needsCleanup ? item.cleanedText : original,
                };
            }
        }
    }

    // Fallback for any chunk the model dropped, so one bad batch never fails
    // the whole document — it just keeps its original extracted text as-is
    // (never blank it out) with a thin, text-only classification.
    return results.map((result, i) => result ?? {
        subject: "Unclassified",
        topics: [],
        description: (chunks[i]?.rawText ?? "").slice(0, 200),
        cleanedText: chunks[i]?.rawText ?? "",
    });
}
