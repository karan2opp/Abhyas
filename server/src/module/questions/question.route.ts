import { Router } from "express";
import * as controller from "./question.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import { createQuestionSchema, updateQuestionSchema } from "./dto/question.dto.js";
import { upload } from "../../common/middleware/multer.middleware.js";
const router = Router();
router.post("/",
    authenticate,
    authorize("teacher", "manager"),
    upload.array("images", 1),   // max 1 image per question
    validate(createQuestionSchema),
    controller.createQuestion
);
router.get("/section/:sectionId", authenticate, authorize("teacher", "manager"), controller.getQuestionsBySection);
router.get("/:id", authenticate, authorize("teacher", "manager"), controller.getQuestionById);
router.patch("/:id", authenticate, authorize("teacher", "manager"), upload.array("images", 1), validate(updateQuestionSchema), controller.updateQuestion);
router.delete("/:id", authenticate, authorize("teacher", "manager"), controller.deleteQuestion);

export default router;