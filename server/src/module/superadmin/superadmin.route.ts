import { Router } from "express";
import * as controller from "./superadmin.controller.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import validate from "../../common/middleware/validate.middleware.js";
import { manageAdminSchema } from "./dto/superadmin.dto.js";

const router = Router();

router.get("/admins", authenticate, authorize("superadmin"), controller.getAdmins);
router.post("/assign-admin", authenticate, authorize("superadmin"), validate(manageAdminSchema), controller.assignAdmin);
router.post("/revoke-admin", authenticate, authorize("superadmin"), validate(manageAdminSchema), controller.revokeAdmin);

export default router;
