import { QdrantClient } from "@qdrant/js-client-rest";

export const QUESTION_BANK_COLLECTION = "question_bank_chunks";
// text-embedding-3-small's native output size.
export const QUESTION_BANK_VECTOR_SIZE = 1536;

let client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
    if (client) return client;
    const url = process.env.QDRANT_URL;
    if (!url) throw new Error("QDRANT_URL is not set in the environment variables.");
    const apiKey = process.env.QDRANT_API_KEY;
    client = new QdrantClient({ url, ...(apiKey ? { apiKey } : {}) });
    return client;
}

let collectionReady = false;

/**
 * Creates the question-bank collection and its payload indexes if they don't
 * already exist. Safe to call on every request — cheap no-op once the
 * collection exists (memoized per process so it isn't re-checked every call).
 */
export async function ensureQuestionBankCollection(): Promise<void> {
    if (collectionReady) return;
    const qdrant = getQdrantClient();

    const exists = await qdrant.collectionExists(QUESTION_BANK_COLLECTION);
    if (!exists.exists) {
        await qdrant.createCollection(QUESTION_BANK_COLLECTION, {
            vectors: { size: QUESTION_BANK_VECTOR_SIZE, distance: "Cosine" },
        });
    }

    for (const field of ["organisationId", "subject", "topics", "documentId"]) {
        try {
            await qdrant.createPayloadIndex(QUESTION_BANK_COLLECTION, {
                field_name: field,
                field_schema: "keyword",
            });
        } catch {
            // Index already exists — fine, this call is only ever needed once.
        }
    }

    collectionReady = true;
}

export interface QuestionBankPointPayload {
    documentId: string;
    organisationId: string | null;
    subject: string;
    topics: string[];
    questionNumber: string | null;
    hasImages: boolean;
    hasTables: boolean;
}

export async function upsertQuestionBankPoints(
    points: { id: string; vector: number[]; payload: QuestionBankPointPayload }[]
): Promise<void> {
    if (points.length === 0) return;
    await ensureQuestionBankCollection();
    const qdrant = getQdrantClient();
    await qdrant.upsert(QUESTION_BANK_COLLECTION, {
        wait: true,
        points: points.map((p) => ({ id: p.id, vector: p.vector, payload: p.payload as unknown as Record<string, unknown> })),
    });
}

export async function deleteQuestionBankPointsByDocument(documentId: string): Promise<void> {
    await ensureQuestionBankCollection();
    const qdrant = getQdrantClient();
    await qdrant.delete(QUESTION_BANK_COLLECTION, {
        wait: true,
        filter: { must: [{ key: "documentId", match: { value: documentId } }] },
    });
}

export interface QuestionBankSearchHit {
    id: string;
    score: number;
    payload: QuestionBankPointPayload;
}

export async function searchQuestionBankPoints(
    vector: number[],
    options: { organisationId?: string | null; subject?: string; topics?: string[]; limit?: number } = {}
): Promise<QuestionBankSearchHit[]> {
    await ensureQuestionBankCollection();
    const qdrant = getQdrantClient();

    const must: Record<string, unknown>[] = [];
    if (options.organisationId) must.push({ key: "organisationId", match: { value: options.organisationId } });
    if (options.subject) must.push({ key: "subject", match: { value: options.subject } });
    if (options.topics && options.topics.length > 0) must.push({ key: "topics", match: { any: options.topics } });

    const result = await qdrant.query(QUESTION_BANK_COLLECTION, {
        query: vector,
        limit: options.limit ?? 10,
        with_payload: true,
        ...(must.length > 0 ? { filter: { must } } : {}),
    });

    return result.points.map((point) => ({
        id: String(point.id),
        score: point.score,
        payload: point.payload as unknown as QuestionBankPointPayload,
    }));
}
