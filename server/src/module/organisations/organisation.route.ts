import { Router } from "express";
import * as controller from "./organisation.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import { createOrganisationSchema, assignUserSchema, assignManagerSchema, assignTeacherSchema } from "./dto/organisation.dto.js";

const router = Router();

router.post("/", authenticate, authorize("system_admin"), validate(createOrganisationSchema), controller.createOrganisation);
router.get("/", authenticate, authorize("system_admin"), controller.listOrganisations);
router.patch("/users/:userId/assign", authenticate, authorize("system_admin"), validate(assignUserSchema), controller.assignUser);

router.get("/:id/managers", authenticate, authorize("system_admin"), controller.getOrganisationManagers);
router.post("/:id/managers", authenticate, authorize("system_admin"), validate(assignManagerSchema), controller.assignManager);
router.delete("/:id/managers/:userId", authenticate, authorize("system_admin"), controller.revokeManager);

// Manager-scoped: manage teachers within their own organisation (implicit via req.user.organisationId)
router.get("/mine/teachers", authenticate, authorize("manager"), controller.getMyOrganisationTeachers);
router.post("/mine/teachers", authenticate, authorize("manager"), validate(assignTeacherSchema), controller.assignTeacherToMyOrganisation);
router.delete("/mine/teachers/:userId", authenticate, authorize("manager"), controller.removeTeacherFromMyOrganisation);

export default router;
