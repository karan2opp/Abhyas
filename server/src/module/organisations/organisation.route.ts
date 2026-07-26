import { Router } from "express";
import * as controller from "./organisation.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import { createOrganisationSchema, assignUserSchema } from "./dto/organisation.dto.js";

const router = Router();

router.post("/", authenticate, authorize("system_admin"), validate(createOrganisationSchema), controller.createOrganisation);
router.get("/", authenticate, authorize("system_admin"), controller.listOrganisations);
router.patch("/users/:userId/assign", authenticate, authorize("system_admin"), validate(assignUserSchema), controller.assignUser);

export default router;
