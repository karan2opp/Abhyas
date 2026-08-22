import { Router } from "express";
import * as controller from "./sections.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import { createSectionSchema, updateSectionSchema } from "./dto/section.dto.js";

const router = Router();

router.post("/", authenticate, authorize("teacher", "manager"), validate(createSectionSchema), controller.createSection);
router.get("/:examId", authenticate, authorize("teacher", "manager"), controller.getSectionsByExam);
router.get("/:examId/details", authenticate, authorize("teacher", "manager"), controller.getSectionsWithDetails);
router.patch("/:id", authenticate, authorize("teacher", "manager"), validate(updateSectionSchema), controller.updateSection);
router.delete("/:id", authenticate, authorize("teacher", "manager"), controller.deleteSection);

export default router;