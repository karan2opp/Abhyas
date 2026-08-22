import { Router } from "express";
import * as controller from "./group.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import { createGroupSchema, updateGroupSchema, addStudentToGroupSchema } from "./dto/group.dto.js";

const router = Router();

router.post("/", authenticate, authorize("teacher", "manager"), validate(createGroupSchema), controller.createGroup);
router.get("/me", authenticate, authorize("student"), controller.getMyGroups);
router.get("/:classroomId", authenticate, authorize("teacher", "manager"), controller.listGroups);
router.patch("/:id", authenticate, authorize("teacher", "manager"), validate(updateGroupSchema), controller.updateGroup);
router.delete("/:id", authenticate, authorize("teacher", "manager"), controller.deleteGroup);

router.get("/:id/students", authenticate, authorize("teacher", "manager"), controller.getGroupMembers);
router.post("/:id/students", authenticate, authorize("teacher", "manager"), validate(addStudentToGroupSchema), controller.addStudentToGroup);
router.delete("/:id/students/:studentId", authenticate, authorize("teacher", "manager"), controller.removeStudentFromGroup);

export default router;
