import { Router } from "express";
import * as controller from "./organisation.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import { upload } from "../../common/middleware/multer.middleware.js";
import { createOrganisationSchema, assignUserSchema, assignManagerSchema, assignTeacherSchema, updateOrganisationSchema } from "./dto/organisation.dto.js";

const router = Router();

router.post("/", authenticate, authorize("system_admin"), validate(createOrganisationSchema), controller.createOrganisation);
router.get("/", authenticate, authorize("system_admin"), controller.listOrganisations);
router.patch("/users/:userId/assign", authenticate, authorize("system_admin"), validate(assignUserSchema), controller.assignUser);

// Org details: manager manages own org; system_admin manages any org
router.get("/mine", authenticate, authorize("manager"), controller.getMyOrganisation);
router.patch("/mine", authenticate, authorize("manager"), validate(updateOrganisationSchema), controller.updateMyOrganisation);
router.post("/mine/logo", authenticate, authorize("manager"), upload.single("logo"), controller.uploadMyOrganisationLogo);

// Student: read-only view of the student's organisation
router.get("/student-mine", authenticate, authorize("student"), controller.getMyOrganisationForStudent);

router.get("/:id", authenticate, authorize("system_admin"), controller.getOrganisationById);
router.patch("/:id", authenticate, authorize("system_admin"), validate(updateOrganisationSchema), controller.updateOrganisationById);

router.get("/:id/managers", authenticate, authorize("system_admin"), controller.getOrganisationManagers);
router.post("/:id/managers", authenticate, authorize("system_admin"), validate(assignManagerSchema), controller.assignManager);
router.delete("/:id/managers/:userId", authenticate, authorize("system_admin"), controller.revokeManager);

// Manager-scoped: manage teachers within their own organisation (implicit via req.user.organisationId)
router.get("/mine/teachers", authenticate, authorize("manager"), controller.getMyOrganisationTeachers);
router.post("/mine/teachers", authenticate, authorize("manager"), validate(assignTeacherSchema), controller.assignTeacherToMyOrganisation);
router.delete("/mine/teachers/:userId", authenticate, authorize("manager"), controller.removeTeacherFromMyOrganisation);

export default router;
