import { inArray } from "drizzle-orm";
import db from "../../common/db/index.js";
import { questionBankChunks } from "./question_bank.schema.js";
import { distributeQuestionsAtLeastOne } from "../generation_agents/allocation.js";
import { generateTopicQuestions } from "../generation_agents/agents/generation_agent.js";
import type { QuestionType, Difficulty } from "../generation_agents/Types/inputExam.js";
import type { StoredQuestion } from "../generation_agents/Types/outputGeneration.js";

export type TopicTier = "high" | "mid" | "low";

// Priority tier -> relative weight when splitting the requested question
// count across topics. High-priority topics get proportionally more.
const TIER_WEIGHT: Record<TopicTier, number> = { high: 3, mid: 2, low: 1 };

async function getDominantSubject(documentIds: string[]): Promise<string> {
    const rows = await db
        .select({ subject: questionBankChunks.subject })
        .from(questionBankChunks)
        .where(inArray(questionBankChunks.documentId, documentIds));

    const counts = new Map<string, number>();
    for (const row of rows) {
        if (!row.subject) continue;
        counts.set(row.subject, (counts.get(row.subject) ?? 0) + 1);
    }
    let best = "General";
    let bestCount = 0;
    for (const [subject, count] of counts) {
        if (count > bestCount) {
            best = subject;
            bestCount = count;
        }
    }
    return best;
}

// Up to this many excerpts, each truncated to this length, are handed to the
// model as grounding context per topic — enough to anchor the generation in
// the source documents' actual content without blowing up the prompt.
const MAX_EXCERPTS_PER_TOPIC = 5;
const MAX_EXCERPT_CHARS = 500;

/**
 * Topics here are free-typed by the teacher, not picked from the document's
 * auto-detected tags — so matching can't rely on exact equality. Tries
 * progressively looser matches: exact tag match, then substring-on-tag, then
 * substring on the raw question text itself, stopping at the first level
 * that finds anything.
 */
async function getTopicExcerpts(documentIds: string[], topic: string): Promise<string[]> {
    const rows = await db
        .select({ rawText: questionBankChunks.rawText, topics: questionBankChunks.topics })
        .from(questionBankChunks)
        .where(inArray(questionBankChunks.documentId, documentIds));

    const needle = topic.trim().toLowerCase();

    const exact = rows.filter((row) => (row.topics ?? []).some((t) => t.toLowerCase() === needle));
    const tagSubstring = exact.length
        ? exact
        : rows.filter((row) => (row.topics ?? []).some((t) => t.toLowerCase().includes(needle) || needle.includes(t.toLowerCase())));
    const matched = tagSubstring.length ? tagSubstring : rows.filter((row) => row.rawText.toLowerCase().includes(needle));

    return matched.slice(0, MAX_EXCERPTS_PER_TOPIC).map((row) => row.rawText.slice(0, MAX_EXCERPT_CHARS));
}

export interface GenerateFromDocumentsInput {
    documentIds: string[];
    topics: { high: string[]; mid: string[]; low: string[] };
    difficulty: Difficulty;
    questionCount: number;
    questionType: QuestionType;
    marks: number;
}

export interface GeneratedTopicGroup {
    tier: TopicTier;
    topic: string;
    allocatedQuestions: number;
    questions: StoredQuestion[];
}

/**
 * Generates NEW questions grounded in one or more previously uploaded
 * documents, spread across teacher-assigned priority tiers (high/mid/low get
 * proportionally more/fewer of the total question count — see TIER_WEIGHT).
 * Topics are free-typed by the teacher (not shown from an auto-detected
 * list) — grounding still works by matching each typed topic against the
 * selected documents' extracted content (see getTopicExcerpts).
 */
export async function generateQuestionsFromDocuments(input: GenerateFromDocumentsInput): Promise<GeneratedTopicGroup[]> {
    if (input.documentIds.length === 0) throw new Error("At least one document must be selected");

    const tiered = (["high", "mid", "low"] as TopicTier[]).flatMap((tier) =>
        input.topics[tier].map((topic) => ({ tier, topic, weight: TIER_WEIGHT[tier] }))
    );
    if (tiered.length === 0) throw new Error("At least one topic must be assigned to a priority tier");

    const allocations = distributeQuestionsAtLeastOne(tiered, input.questionCount);
    const subject = await getDominantSubject(input.documentIds);

    const groups = await Promise.all(
        allocations
            .filter((a) => a.allocatedQuestions > 0)
            .map(async (allocation): Promise<GeneratedTopicGroup> => {
                const excerpts = await getTopicExcerpts(input.documentIds, allocation.topic);
                const topicInstructions =
                    excerpts.length > 0
                        ? [
                              "Ground these questions in the following excerpts from the source document(s) — use them as reference material and inspiration, but write NEW questions, never copy one verbatim:",
                              ...excerpts,
                          ]
                        : [];

                const output = await generateTopicQuestions({
                    subject,
                    question_type: input.questionType,
                    marks: input.marks,
                    difficulty: input.difficulty,
                    topic: allocation.topic,
                    subtopics: [{ name: allocation.topic, count: allocation.allocatedQuestions }],
                    globalInstructions: [],
                    topicInstructions,
                });

                const questions: StoredQuestion[] = output.questions.map((q) => ({
                    ...q,
                    id: crypto.randomUUID(),
                    marks: input.marks,
                }));

                return { tier: allocation.tier, topic: allocation.topic, allocatedQuestions: allocation.allocatedQuestions, questions };
            })
    );

    return groups;
}
