import { Router } from "express";
import * as controller from "./exam.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import { createExamSchema, updateExamSchema } from "./dto/exam.dto.js";

const router = Router();

router.post("/", authenticate, authorize("teacher", "manager"), validate(createExamSchema), controller.createExam);
router.post("/save-generated", authenticate, authorize("teacher", "manager"), controller.saveGeneratedExam);
router.get("/overview/stats", authenticate, authorize("teacher"), controller.getOverviewStats);
router.get("/", authenticate, authorize("teacher"), controller.getExams);
router.get("/me", authenticate, authorize("student"), controller.getMyExams);
router.get("/classroom/:classroomId", authenticate, authorize("teacher", "manager"), controller.listExamsForClassroom);
router.get("/:id", authenticate, authorize("teacher", "manager"), controller.getExamById);
router.patch("/:id", authenticate, authorize("teacher", "manager"), validate(updateExamSchema), controller.updateExam);
router.delete("/:id", authenticate, authorize("teacher", "manager"), controller.deleteExam);

export default router;
