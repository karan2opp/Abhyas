import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pLimit from "p-limit";
import { inngest } from "../../../common/inngest/client.js";
import { extractPdf } from "../../../common/pdf/pdf_python_bridge.js";
import { uploadToCloudinary } from "../../../common/config/cloudinary.js";
import { chunkQuestionBankDocument, type QuestionBankRawChunk } from "../question_bank_chunker.js";
import { classifyQuestionBankChunks, type ChunkClassification } from "../question_bank_classifier.js";
import { getDocument, markDocumentProcessing, markDocumentCompleted, markDocumentFailed, saveChunk, embedText } from "../question_bank.service.js";
import { upsertQuestionBankPoints } from "../qdrant_client.js";
import type { QuestionBankImage, QuestionBankTable, QuestionBankList } from "../question_bank.schema.js";

// How many chunks get their images uploaded / embedded / persisted at once.
const PERSIST_CONCURRENCY = 3;

async function downloadToFile(url: string, destPath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download PDF (${response.status} ${response.statusText})`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(destPath, buffer);
}

/**
 * Full question-bank ingestion pipeline for one uploaded PDF: extract (the
 * shared PyMuPDF subprocess) -> chunk per question (bbox-based, see
 * question_bank_chunker.ts) -> classify + mechanically clean each chunk
 * (subject/topics/description, and a spacing/spelling/stray-text cleanup
 * pass over the extracted text — never a rewrite, see
 * question_bank_classifier.ts) -> embed the description -> persist the
 * cleaned chunk to Postgres and its vector to Qdrant, using the SAME id for
 * both so a search hit's point id is directly the Postgres row id.
 */
export const processQuestionBankDocumentFunction = inngest.createFunction(
    {
        id: "question-bank-process-document",
        retries: 2,
        triggers: [{ event: "question-bank/document.process" }],
    },
    async ({ event, step }) => {
        const documentId = event.data.documentId as string;

        let tmpDir: string | null = null;

        try {
            const document = await step.run("load-document", async () => {
                const doc = await getDocument(documentId);
                if (!doc) throw new Error(`Question bank document ${documentId} not found`);
                await markDocumentProcessing(documentId);
                return doc;
            });

            const { extracted, tmpDir: dir } = await step.run("download-and-extract", async () => {
                const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "question-bank-"));
                const pdfPath = path.join(workDir, "input.pdf");
                const outputDir = path.join(workDir, "out");
                await downloadToFile(document.fileUrl, pdfPath);
                const result = await extractPdf(pdfPath, outputDir);
                console.log(`[question-bank] extracted ${result.pages.length} page(s) for document ${documentId}`);
                return { extracted: result, tmpDir: workDir };
            });
            tmpDir = dir;

            const classifiedChunks = await step.run("chunk-and-classify", async () => {
                const rawChunks: QuestionBankRawChunk[] = chunkQuestionBankDocument(extracted);
                console.log(`[question-bank] detected ${rawChunks.length} question chunk(s) for document ${documentId}`);
                const classifications: ChunkClassification[] = await classifyQuestionBankChunks(rawChunks);
                return rawChunks.map((chunk, i) => ({ chunk, classification: classifications[i]! }));
            });

            const totalChunks = await step.run("persist-chunks", async () => {
                const limit = pLimit(PERSIST_CONCURRENCY);

                await Promise.all(
                    classifiedChunks.map(({ chunk, classification }) =>
                        limit(async () => {
                            const images: QuestionBankImage[] = await Promise.all(
                                chunk.images.map(async (img) => {
                                    const fileBuffer = await fs.readFile(img.path);
                                    const uploaded = await uploadToCloudinary(fileBuffer, "question-bank/images");
                                    return { url: uploaded.url, width: img.width, height: img.height, page: chunk.pageStart };
                                })
                            );

                            const tables: QuestionBankTable[] = chunk.tables.map((t) => ({
                                page: chunk.pageStart,
                                header: t.header,
                                rows: t.rows,
                            }));
                            const lists: QuestionBankList[] = [];

                            const vector = await embedText(classification.description || classification.cleanedText.slice(0, 500));

                            const saved = await saveChunk({
                                documentId,
                                organisationId: document.organisationId,
                                questionNumber: chunk.questionNumber,
                                rawText: classification.cleanedText,
                                subject: classification.subject,
                                topics: classification.topics,
                                description: classification.description,
                                pageStart: chunk.pageStart,
                                pageEnd: chunk.pageEnd,
                                images,
                                tables,
                                lists,
                            });

                            await upsertQuestionBankPoints([
                                {
                                    id: saved.id,
                                    vector,
                                    payload: {
                                        documentId,
                                        organisationId: document.organisationId,
                                        subject: classification.subject,
                                        topics: classification.topics,
                                        questionNumber: chunk.questionNumber,
                                        hasImages: images.length > 0,
                                        hasTables: tables.length > 0,
                                    },
                                },
                            ]);
                        })
                    )
                );

                return classifiedChunks.length;
            });

            await step.run("finalize", async () => {
                await markDocumentCompleted(documentId, totalChunks);
                console.log(`[question-bank] document ${documentId} completed with ${totalChunks} chunk(s)`);
            });
        } catch (err: any) {
            await markDocumentFailed(documentId, err?.message || "Unknown error processing document");
            throw err;
        } finally {
            if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        }
    }
);

export const questionBankFunctions = [processQuestionBankDocumentFunction];
