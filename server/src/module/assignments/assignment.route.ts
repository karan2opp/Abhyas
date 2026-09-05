import { Router } from "express";
import * as controller from "./assignment.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import {
    createSeriesSchema,
    updateSeriesSchema,
    createAssignmentSchema,
    updateAssignmentSchema,
    extendAssignmentSchema,
    createAssignmentQuestionSchema,
    updateAssignmentQuestionSchema,
    saveAssignmentAnswerSchema,
    gradeAssignmentSubmissionSchema,
} from "./dto/assignment.dto.js";

const router = Router();

// teacher: assignment series
router.post("/series", authenticate, authorize("teacher", "manager"), validate(createSeriesSchema), controller.createSeries);
router.get("/series/classroom/:classroomId", authenticate, authorize("teacher", "manager"), controller.listSeriesForClassroom);
router.patch("/series/:id", authenticate, authorize("teacher", "manager"), validate(updateSeriesSchema), controller.updateSeries);
router.delete("/series/:id", authenticate, authorize("teacher", "manager"), controller.deleteSeries);

// teacher: assignment CRUD
router.post("/", authenticate, authorize("teacher", "manager"), validate(createAssignmentSchema), controller.createAssignment);
router.get("/classroom/:classroomId", authenticate, authorize("teacher", "manager"), controller.listAssignmentsForClassroom);

// teacher: questions
router.post("/questions", authenticate, authorize("teacher", "manager"), validate(createAssignmentQuestionSchema), controller.createQuestion);
router.patch("/questions/:id", authenticate, authorize("teacher", "manager"), validate(updateAssignmentQuestionSchema), controller.updateQuestion);
router.delete("/questions/:id", authenticate, authorize("teacher", "manager"), controller.deleteQuestion);

// student: own answers/submission
router.post("/answers", authenticate, authorize("student"), validate(saveAssignmentAnswerSchema), controller.saveAnswer);

// teacher: grading
router.get("/submissions/:id", authenticate, authorize("teacher", "manager"), controller.getSubmissionById);
router.post("/submissions/:id/grade", authenticate, authorize("teacher", "manager"), validate(gradeAssignmentSubmissionSchema), controller.gradeSubmission);

// student: finalize submission
router.patch("/submissions/:id/submit", authenticate, authorize("student"), controller.submitAssignment);

// student: assignments visible to me
router.get("/me", authenticate, authorize("student"), controller.getMyAssignments);

// shared: assignment detail / questions (role-branches inside controller)
router.get("/:id", authenticate, authorize("teacher", "manager", "student"), controller.getAssignmentById);
router.patch("/:id", authenticate, authorize("teacher", "manager"), validate(updateAssignmentSchema), controller.updateAssignment);
router.post("/:id/extend", authenticate, authorize("teacher", "manager"), validate(extendAssignmentSchema), controller.extendAssignment);
router.delete("/:id", authenticate, authorize("teacher", "manager"), controller.deleteAssignment);
router.get("/:id/questions", authenticate, authorize("teacher", "manager", "student"), controller.getQuestions);

// student: start assignment, view own submission
router.post("/:id/start", authenticate, authorize("student"), controller.startAssignment);
router.get("/:id/my-submission", authenticate, authorize("student"), controller.getMySubmission);

// teacher: submissions list for an assignment
router.get("/:id/submissions", authenticate, authorize("teacher", "manager"), controller.getSubmissionsForAssignment);

export default router;
