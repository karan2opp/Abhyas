import type { Request, Response, NextFunction } from "express";
import { examIntentAgentTurn } from "./agents/exam_intent_agent.js";
import { blueprintReviewAgentTurn } from "./agents/blueprint_review_agent.js";
import { IInputExamZodSchema } from "./Types/inputExam.js";
import { ExamBlueprintZodSchema } from "./Types/outputSubtopics.js";
import { buildGenerationContextBySection } from "./session_context.util.js";
import {
    createSession,
    getSession,
    getSessionHistory,
    appendMessage,
    completeSession,
    setBlueprintInProgress,
    setQuestionsInProgress,
    updateBlueprint,
    getReviewHistory,
    appendReviewMessage,
} from "./exam_intent_session.service.js";
import { inngest } from "./inngest/client.js";
import { z } from "zod";
import { ApiError } from "../../common/utils/ApiError.js";

const ConversationTurnRequestZodSchema = z.object({
    // Required to start a new conversation (no sessionId); ignored once a
    // session exists — the DB snapshot from session start is the source of
    // truth from then on.
    examInput: IInputExamZodSchema.optional(),
    sessionId: z.string().optional(),
    // Required to continue an existing session — the teacher's reply.
    message: z.string().optional(),
});

export const conversationTurnHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const parsed = ConversationTurnRequestZodSchema.safeParse(req.body);
        if (!parsed.success) {
            const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
            throw ApiError.badRequest(`Invalid request body: ${issues}`);
        }
        const { examInput, sessionId, message } = parsed.data;
        const userId = req.user!.id;

        let session;
        if (!sessionId) {
            if (!examInput) throw ApiError.badRequest("examInput is required to start a conversation");
            session = await createSession(examInput, userId, req.user?.organisationId);
            console.log(`[generation-agents] started exam intent session ${session.id}`);
        } else {
            session = await getSession(sessionId);
            if (!session) throw ApiError.notFound("Session not found");
            if (session.createdBy !== userId) throw ApiError.forbidden("Not your session");
            if (!message || !message.trim()) throw ApiError.badRequest("message is required to continue a conversation");
            await appendMessage(session.id, "user", message.trim());
        }

        const history = sessionId ? await getSessionHistory(session.id) : [];
        console.log(`[generation-agents] exam intent turn (session ${session.id}, history length: ${history.length})`);

        const result = await examIntentAgentTurn(session.examInput, history, userId);
        await appendMessage(session.id, "assistant", result.message);

        if (result.done && result.summary) {
            await completeSession(session.id, result.summary);
            console.log(`[generation-agents] exam intent session ${session.id} completed`);
        }

        // Fire-and-forget: shadow-trace this turn into Inngest for dashboard
        // visibility, without delaying the chat response on it.
        void inngest.send({
            name: "generation-agent/exam-intent.turn",
            data: {
                sessionId: session.id,
                turn: sessionId ? "continue" : "start",
                historyLength: history.length,
                userMessage: message ?? null,
                agentMessage: result.message,
                done: result.done,
                hasSummary: Boolean(result.summary),
            },
        }).catch((err) => {
            console.warn("[generation-agents] failed to send exam-intent trace event (Inngest dev server down?):", err?.message);
        });

        res.status(200).json({ success: true, data: { sessionId: session.id, ...result } });
    } catch (error) {
        next(error);
    }
};

const QuickStartSessionRequestZodSchema = z.object({
    examInput: IInputExamZodSchema,
    globalInstructions: z.array(z.string()).optional(),
});

// Creates and completes an Exam Intent session in one shot, with no chat
// turns — for callers (like a legacy one-shot config form) that already have
// their own instructions/topics UI and have nothing for the agent to ask
// about. The rest of the pipeline (blueprint generation, review, question
// generation) works exactly the same from here on as a chat-completed session.
export const quickStartSessionHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const parsed = QuickStartSessionRequestZodSchema.safeParse(req.body);
        if (!parsed.success) {
            const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
            throw ApiError.badRequest(`Invalid request body: ${issues}`);
        }
        const { examInput, globalInstructions } = parsed.data;
        const userId = req.user!.id;

        const session = await createSession(examInput, userId, req.user?.organisationId);
        await completeSession(session.id, { globalInstructions: globalInstructions || [], topicSpecificInstructions: [] });
        console.log(`[generation-agents] quick-started session ${session.id} (no intent chat, ${examInput.sections.length} section(s))`);

        res.status(201).json({ success: true, data: { sessionId: session.id } });
    } catch (error) {
        next(error);
    }
};

export const triggerBlueprintGenerationHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { sessionId } = req.body || {};
        if (!sessionId || typeof sessionId !== "string") throw ApiError.badRequest("sessionId is required");

        const session = await getSession(sessionId);
        if (!session) throw ApiError.notFound("Session not found");
        if (session.createdBy !== req.user!.id) throw ApiError.forbidden("Not your session");
        if (session.status !== "completed") throw ApiError.badRequest("Intent conversation is not complete yet");

        await setBlueprintInProgress(session.id);
        try {
            await inngest.send({ name: "generation-agent/blueprint.generate", data: { sessionId: session.id } });
        } catch (sendError) {
            throw ApiError.internal("Could not reach the background job service (Inngest) — is it running?");
        }
        console.log(`[generation-agents] triggered blueprint generation for session ${session.id}`);

        res.status(202).json({ success: true, data: { sessionId: session.id, blueprintStatus: "in_progress" } });
    } catch (error) {
        next(error);
    }
};

export const getBlueprintStatusHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const sessionId = String(req.params.sessionId);
        const session = await getSession(sessionId);
        if (!session) throw ApiError.notFound("Session not found");
        if (session.createdBy !== req.user!.id) throw ApiError.forbidden("Not your session");

        res.status(200).json({
            success: true,
            data: {
                sessionId: session.id,
                blueprintStatus: session.blueprintStatus,
                blueprint: session.blueprint,
                blueprintError: session.blueprintError,
            },
        });
    } catch (error) {
        next(error);
    }
};

const BlueprintReviewTurnRequestZodSchema = z.object({
    sessionId: z.string(),
    message: z.string().min(1),
    // Optional override of the section tree to operate on — for a caller
    // (like the legacy tree-editor UI) whose own direct edits haven't been
    // persisted to this session's blueprint yet. When present, this becomes
    // the new source of truth (saved back at the end of the turn either way).
    sections: ExamBlueprintZodSchema.shape.sections.optional(),
});

export const blueprintReviewTurnHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const parsed = BlueprintReviewTurnRequestZodSchema.safeParse(req.body);
        if (!parsed.success) {
            const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
            throw ApiError.badRequest(`Invalid request body: ${issues}`);
        }
        const { sessionId, message, sections: sectionsOverride } = parsed.data;

        const session = await getSession(sessionId);
        if (!session) throw ApiError.notFound("Session not found");
        if (session.createdBy !== req.user!.id) throw ApiError.forbidden("Not your session");
        if (session.blueprintStatus !== "completed" || !session.blueprint) {
            throw ApiError.badRequest("Blueprint is not ready yet");
        }

        const startingSections = sectionsOverride ?? session.blueprint.sections;

        // Reloaded from Postgres every turn — this is what lets the agent
        // remember what was already discussed/changed earlier in this same
        // review conversation, across separate HTTP requests.
        const history = await getReviewHistory(sessionId);
        await appendReviewMessage(sessionId, "user", message);

        const generationContextBySection = buildGenerationContextBySection(session);

        const result = await blueprintReviewAgentTurn(startingSections, generationContextBySection, history, message);

        await appendReviewMessage(sessionId, "assistant", result.message);
        // Persisted every turn (not just when done) so the next turn — or a
        // page refresh — always resumes from the latest tool-call state.
        await updateBlueprint(sessionId, { sections: result.sections });

        console.log(`[generation-agents] blueprint review turn (session ${sessionId}, history length: ${history.length}, done: ${result.done})`);

        res.status(200).json({
            success: true,
            data: {
                sessionId,
                message: result.message,
                sections: result.sections,
                done: result.done,
                changeLog: result.changeLog,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getBlueprintReviewHistoryHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const sessionId = String(req.params.sessionId);
        const session = await getSession(sessionId);
        if (!session) throw ApiError.notFound("Session not found");
        if (session.createdBy !== req.user!.id) throw ApiError.forbidden("Not your session");

        const history = await getReviewHistory(sessionId);
        res.status(200).json({
            success: true,
            data: { sessionId, history, blueprint: session.blueprint },
        });
    } catch (error) {
        next(error);
    }
};

const TriggerQuestionGenerationRequestZodSchema = z.object({
    sessionId: z.string(),
    // Optional final override — lets a caller sync last-minute manual edits
    // (e.g. from a direct tree editor) into the blueprint right before
    // generation starts, without a separate round trip.
    sections: ExamBlueprintZodSchema.shape.sections.optional(),
});

export const triggerQuestionGenerationHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const parsed = TriggerQuestionGenerationRequestZodSchema.safeParse(req.body);
        if (!parsed.success) {
            const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
            throw ApiError.badRequest(`Invalid request body: ${issues}`);
        }
        const { sessionId, sections: sectionsOverride } = parsed.data;

        const session = await getSession(sessionId);
        if (!session) throw ApiError.notFound("Session not found");
        if (session.createdBy !== req.user!.id) throw ApiError.forbidden("Not your session");
        if (session.blueprintStatus !== "completed" || !session.blueprint) {
            throw ApiError.badRequest("Blueprint is not ready yet");
        }

        if (sectionsOverride) {
            await updateBlueprint(session.id, { sections: sectionsOverride });
        }

        await setQuestionsInProgress(session.id);
        try {
            await inngest.send({ name: "generation-agent/questions.generate", data: { sessionId: session.id } });
        } catch (sendError) {
            throw ApiError.internal("Could not reach the background job service (Inngest) — is it running?");
        }
        console.log(`[generation-agents] triggered question generation for session ${session.id}`);

        res.status(202).json({ success: true, data: { sessionId: session.id, questionsStatus: "in_progress" } });
    } catch (error) {
        next(error);
    }
};

export const getQuestionsStatusHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const sessionId = String(req.params.sessionId);
        const session = await getSession(sessionId);
        if (!session) throw ApiError.notFound("Session not found");
        if (session.createdBy !== req.user!.id) throw ApiError.forbidden("Not your session");

        res.status(200).json({
            success: true,
            data: {
                sessionId: session.id,
                questionsStatus: session.questionsStatus,
                questions: session.questions,
                questionsError: session.questionsError,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const triggerTestPipelineHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ids } = await inngest.send({
            name: "generation-agent/pipeline.test",
            data: req.body || {},
        });
        console.log("[generation-agents] fired test pipeline event:", ids);
        res.status(202).json({ success: true, data: { eventIds: ids } });
    } catch (error) {
        next(error);
    }
};
