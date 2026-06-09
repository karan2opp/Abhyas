import { Router } from "express";
import * as controller from "./submission.controller.js";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import { authorize } from "../../common/middleware/auth.middleware.js";
import validate from "../../common/middleware/validate.middleware.js";
import { joinExamSchema } from "./dto/submission.dto.js";

const router = Router();

// student routes
router.post("/join", authenticate, authorize("student"), validate(joinExamSchema), controller.joinExam);
router.patch("/:id/submit", authenticate, authorize("student"), controller.submitExam);
router.get("/:id", authenticate, authorize("student"), controller.getSubmissionById);
router.delete("/:id", authenticate, authorize("student"), controller.deleteSubmission);

// teacher routes
router.get("/exam/:examId", authenticate, authorize("teacher"), controller.getSubmissionsByExam);

export default router;