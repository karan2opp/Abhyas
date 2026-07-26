import { Router } from "express";
import * as controller from "./assignment.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import {
    createAssignmentSchema,
    updateAssignmentSchema,
    createAssignmentQuestionSchema,
    updateAssignmentQuestionSchema,
    saveAssignmentAnswerSchema,
    gradeAssignmentSubmissionSchema,
} from "./dto/assignment.dto.js";

const router = Router();

// teacher: assignment CRUD
router.post("/", authenticate, authorize("teacher"), validate(createAssignmentSchema), controller.createAssignment);
router.get("/classroom/:classroomId", authenticate, authorize("teacher"), controller.listAssignmentsForClassroom);

// teacher: questions
router.post("/questions", authenticate, authorize("teacher"), validate(createAssignmentQuestionSchema), controller.createQuestion);
router.patch("/questions/:id", authenticate, authorize("teacher"), validate(updateAssignmentQuestionSchema), controller.updateQuestion);
router.delete("/questions/:id", authenticate, authorize("teacher"), controller.deleteQuestion);

// student: own answers/submission
router.post("/answers", authenticate, authorize("student"), validate(saveAssignmentAnswerSchema), controller.saveAnswer);

// teacher: grading
router.get("/submissions/:id", authenticate, authorize("teacher"), controller.getSubmissionById);
router.post("/submissions/:id/grade", authenticate, authorize("teacher"), validate(gradeAssignmentSubmissionSchema), controller.gradeSubmission);

// student: finalize submission
router.patch("/submissions/:id/submit", authenticate, authorize("student"), controller.submitAssignment);

// student: assignments visible to me
router.get("/me", authenticate, authorize("student"), controller.getMyAssignments);

// shared: assignment detail / questions (role-branches inside controller)
router.get("/:id", authenticate, authorize("teacher", "student"), controller.getAssignmentById);
router.patch("/:id", authenticate, authorize("teacher"), validate(updateAssignmentSchema), controller.updateAssignment);
router.delete("/:id", authenticate, authorize("teacher"), controller.deleteAssignment);
router.get("/:id/questions", authenticate, authorize("teacher", "student"), controller.getQuestions);

// student: start assignment, view own submission
router.post("/:id/start", authenticate, authorize("student"), controller.startAssignment);
router.get("/:id/my-submission", authenticate, authorize("student"), controller.getMySubmission);

// teacher: submissions list for an assignment
router.get("/:id/submissions", authenticate, authorize("teacher"), controller.getSubmissionsForAssignment);

export default router;
