import { Router } from "express";
import * as controller from "./admin.controller.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import validate from "../../common/middleware/validate.middleware.js";
import { manageTeacherSchema, searchUserSchema } from "./dto/admin.dto.js";

const router = Router();

router.get("/teachers", authenticate, authorize("admin"), controller.getTeachers);
router.post("/assign-teacher", authenticate, authorize("admin"), validate(manageTeacherSchema), controller.assignTeacher);
router.post("/revoke-teacher", authenticate, authorize("admin"), validate(manageTeacherSchema), controller.revokeTeacher);
router.post("/search-user", authenticate, authorize("admin"), validate(searchUserSchema), controller.searchUser);

export default router;
