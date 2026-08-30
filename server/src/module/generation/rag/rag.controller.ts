import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../../common/utils/ApiResponse.js";
import { ApiError } from "../../../common/utils/ApiError.js";
import { ragIndexQueue, ragIndexEvents } from "../../../common/queue/queues.js";
import { queryRouter } from "../agents/query_router_agent.js";
import {
  streamChatAnswer,
  generateChatAnswer,
  type ChatContextEntry,
} from "../agents/chat_answer_agent.js";
import { searchMemories, addMemories, type MemoMessage } from "../../../common/utils/mem0.js";
import * as ragService from "./rag.service.js";

const INDEX_JOB_TIMEOUT_MS = 10 * 60 * 1000;

const buildChatContext = (chunks: any[]): ChatContextEntry[] =>
  chunks.map((c) => ({
    source: (c.sourceFile ?? "") as string,
    page: typeof c.page === "number" ? c.page : undefined,
    text: ((c.childText || c.text) ?? "") as string,
  }));

const parseHistory = (raw: unknown): MemoMessage[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is MemoMessage => {
      if (!m || typeof m !== "object") return false;
      const role = (m as any).role;
      return role === "user" || role === "assistant";
    })
    .map((m) => ({ role: m.role, content: String(m.content ?? "").slice(0, 2000) }));
};

export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, topic, subtopic } = req.body;

    if (!req.file) {
      throw ApiError.badRequest("File is required");
    }
    if (!subject || typeof subject !== "string" || subject.trim() === "") {
      throw ApiError.badRequest("Subject is required and cannot be empty");
    }

    // Resolve which org's collection this material belongs to. Staff (teacher /
    // manager) always index into their own org's collection. A system admin has
    // no org — they may target a specific org (body.organisationId) or the
    // shared/global collection when none is given.
    const organisationId =
      (req.user?.role !== "system_admin" ? req.user?.organisationId : null) ??
      (typeof req.body.organisationId === "string" ? req.body.organisationId : null);

    // Indexing is long-running (PDF parsing + embeddings), so it runs on a
    // dedicated BullMQ worker. The temp file is deleted by that worker once the
    // job completes (retries need it to still exist).
    const job = await ragIndexQueue.add(
      "index-document",
      {
        filePath: req.file.path,
        originalFileName: req.file.originalname,
        subject,
        topic,
        subtopic,
        organisationId,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    const result = (await job.waitUntilFinished(ragIndexEvents, INDEX_JOB_TIMEOUT_MS)) as {
      chunksIndexed: number;
      fileHash: string;
    };

    if (result.chunksIndexed === 0) {
      return res.status(200).json({
        success: true,
        message: "This file has already been indexed.",
        data: {
          indexed: false,
          fileHash: result.fileHash,
          subject: subject.trim(),
          topic: topic ? topic.trim() : "",
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Document indexed successfully",
      data: {
        indexed: true,
        chunksIndexed: result.chunksIndexed,
        subject: subject.trim(),
        topic: topic ? topic.trim() : "",
        fileHash: result.fileHash,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCollections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organisationId = req.user?.role !== "system_admin" ? req.user?.organisationId : null;
    const collectionsList = await ragService.getDistinctCollections(organisationId);
    return ApiResponse.ok(res, "Indexed collections fetched successfully", collectionsList);
  } catch (error) {
    next(error);
  }
};

export const retrieveChunks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, topic, subtopic, topK } = req.query;

    if (!subject || typeof subject !== "string" || subject.trim() === "") {
      throw ApiError.badRequest("Subject is required and cannot be empty");
    }
    if (!topic || typeof topic !== "string" || topic.trim() === "") {
      throw ApiError.badRequest("Topic is required and cannot be empty");
    }

    const limit = topK ? parseInt(topK as string, 10) : 5;
    const organisationId = req.user?.role !== "system_admin" ? req.user?.organisationId : null;

    const chunks = await ragService.queryRelevantChunks(
      subject,
      topic,
      typeof subtopic === "string" ? subtopic : "",
      limit,
      organisationId
    );

    return ApiResponse.ok(res, "Relevant chunks retrieved successfully", chunks);
  } catch (error) {
    next(error);
  }
};

export const chatRetrieve = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, topK } = req.body ?? {};

    if (!question || typeof question !== "string" || question.trim() === "") {
      throw ApiError.badRequest("Question is required and cannot be empty");
    }

    const limit = topK ? parseInt(String(topK), 10) : 5;
    const organisationId = req.user?.role !== "system_admin" ? req.user?.organisationId : null;
    const userId = req.user?.id;
    const history = parseHistory(req.body?.history);

    // Query router: skip the (expensive) RAG pipeline for simple general facts.
    let useRag = true;
    try {
      const route = await queryRouter(question);
      useRag = route.useRag;
    } catch (routerError) {
      console.warn("Query router failed, defaulting to RAG:", routerError);
    }

    const chunks = useRag
      ? await ragService.retrieveChatChunks(question, limit, organisationId)
      : [];

    const memories = userId ? await searchMemories(question, userId) : [];
    const answer = await generateChatAnswer(question, buildChatContext(chunks), memories);

    if (userId && answer) {
      void addMemories(
        [...history, { role: "user", content: question }, { role: "assistant", content: answer }],
        userId
      );
    }

    return ApiResponse.ok(res, "Chat response generated", { answer, chunks, usedRag: useRag });
  } catch (error) {
    next(error);
  }
};

export const streamChatRetrieve = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, topK } = req.body ?? {};

    if (!question || typeof question !== "string" || question.trim() === "") {
      throw ApiError.badRequest("Question is required and cannot be empty");
    }

    const limit = topK ? parseInt(String(topK), 10) : 5;
    const organisationId = req.user?.role !== "system_admin" ? req.user?.organisationId : null;
    const userId = req.user?.id;
    const history = parseHistory(req.body?.history);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // 1. Route the question (skip RAG for simple general facts).
    let useRag = true;
    try {
      const route = await queryRouter(question);
      useRag = route.useRag;
      send("routed", { useRag, reason: route.reason });
    } catch (routerError) {
      console.warn("Query router failed, defaulting to RAG:", routerError);
      send("routed", { useRag: true, reason: "router unavailable" });
    }

    // 2. Retrieval (only when the router says the knowledge base is needed) in
    //    parallel with fetching the user's mem0 memories.
    if (useRag) send("status", { stage: "searching" });
    const [chunks, memories] = await Promise.all([
      useRag
        ? ragService.retrieveChatChunks(question, limit, organisationId)
        : Promise.resolve([] as any[]),
      userId ? searchMemories(question, userId) : Promise.resolve([] as string[]),
    ]);
    send("chunks", { chunks, usedRag: useRag });

    // 3. Stream the grounded answer (memories included for personalization).
    send("status", { stage: "answering" });
    let fullAnswer = "";
    try {
      fullAnswer = await streamChatAnswer(
        question,
        buildChatContext(chunks),
        (delta) => send("answer", { text: delta }),
        memories
      );
    } catch (answerError) {
      console.error("Chat answer streaming failed:", answerError);
      send("error", { message: "Failed to generate answer." });
    }

    // 4. Persist the exchange to mem0 (fire-and-forget).
    if (userId && fullAnswer) {
      void addMemories(
        [...history, { role: "user", content: question }, { role: "assistant", content: fullAnswer }],
        userId
      );
    }

    send("done", {});
    res.end();
  } catch (error) {
    if (res.headersSent) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: (error as any)?.message || "Stream failed" })}\n\n`
      );
      res.end();
      return;
    }
    next(error);
  }
};