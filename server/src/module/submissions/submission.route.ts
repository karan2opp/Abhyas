import { Router } from "express";
import * as controller from "./submission.controller.js";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import { authorize } from "../../common/middleware/auth.middleware.js";
import validate from "../../common/middleware/validate.middleware.js";
import { joinCodeLimiter } from "../../common/middleware/rate_limit.middleware.js";
import { joinExamSchema, gradeExamSubmissionSchema, evaluateWithAiSchema } from "./dto/submission.dto.js";

const router = Router();

// student routes
router.post("/join", authenticate, authorize("student"), joinCodeLimiter, validate(joinExamSchema), controller.joinExam);
router.post("/start/:examId", authenticate, authorize("student"), controller.startScopedExam);
router.get("/me", authenticate, authorize("student"), controller.getMySubmissions);
router.get("/upcoming", authenticate, authorize("student"), controller.getUpcomingExams);
router.get("/:id/exam", authenticate, authorize("student", "teacher", "manager"), controller.getExamForSubmission);
router.patch("/:id/begin", authenticate, authorize("student"), controller.beginSubmission);
router.patch("/:id/submit", authenticate, authorize("student"), controller.submitExam);
router.get("/:id", authenticate, authorize("student", "teacher", "manager"), controller.getSubmissionById);
router.delete("/:id", authenticate, authorize("student"), controller.deleteSubmission);
router.get("/verify/:joinCode", authenticate, authorize("student"), joinCodeLimiter, controller.verifyJoinCode);

// teacher/manager routes
router.get("/exam/:examId", authenticate, authorize("teacher", "manager"), controller.getSubmissionsByExam);
router.patch("/:id/grade", authenticate, authorize("teacher", "manager"), validate(gradeExamSubmissionSchema), controller.gradeExamSubmission);
router.post("/:id/evaluate-ai", authenticate, authorize("teacher", "manager"), validate(evaluateWithAiSchema), controller.evaluateSubmissionWithAI);

// leaderboard route
router.get("/exam/:examId/leaderboard", authenticate, authorize("teacher", "manager", "student"), controller.getExamLeaderboard);

export default router;
