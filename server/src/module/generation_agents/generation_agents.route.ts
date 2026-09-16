import { Router } from "express";
import {
    conversationTurnHandler,
    triggerBlueprintGenerationHandler,
    getBlueprintStatusHandler,
    blueprintReviewTurnHandler,
    getBlueprintReviewHistoryHandler,
    triggerQuestionGenerationHandler,
    getQuestionsStatusHandler,
    questionReviewTurnHandler,
    getQuestionReviewHistoryHandler,
} from "./generation_agents.controller.js";
import {
    createRealtimeSessionHandler,
    executeIntentRealtimeToolHandler,
    executeReviewRealtimeToolHandler,
    executeQuestionReviewRealtimeToolHandler,
    logIntentTurnHandler,
    logReviewTurnHandler,
} from "./realtime_agents.controller.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";

const router = Router();

router.post(
    "/conversation",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    conversationTurnHandler
);

router.post(
    "/blueprint/generate",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    triggerBlueprintGenerationHandler
);

router.get(
    "/blueprint/:sessionId",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    getBlueprintStatusHandler
);

router.post(
    "/review/turn",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    blueprintReviewTurnHandler
);

router.get(
    "/review/:sessionId",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    getBlueprintReviewHistoryHandler
);

// Text counterpart of /realtime/question-review/tool, for plans without voice.
router.post(
    "/question-review/turn",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    questionReviewTurnHandler
);

router.get(
    "/question-review/:examId",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    getQuestionReviewHistoryHandler
);

router.post(
    "/questions/generate",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    triggerQuestionGenerationHandler
);

router.get(
    "/questions/:sessionId",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    getQuestionsStatusHandler
);

router.post(
    "/realtime/session",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    createRealtimeSessionHandler
);

router.post(
    "/realtime/intent/tool",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    executeIntentRealtimeToolHandler
);

router.post(
    "/realtime/review/tool",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    executeReviewRealtimeToolHandler
);

router.post(
    "/realtime/question-review/tool",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    executeQuestionReviewRealtimeToolHandler
);

router.post(
    "/realtime/intent/log",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    logIntentTurnHandler
);

router.post(
    "/realtime/review/log",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    logReviewTurnHandler
);

export const generationAgentsRouter = router;
export default router;
