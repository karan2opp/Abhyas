import { Router } from "express";
import * as controller from "./superadmin.controller.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import validate from "../../common/middleware/validate.middleware.js";
import { manageAdminSchema, searchUserSchema } from "./dto/superadmin.dto.js";

const router = Router();

router.get("/admins", authenticate, authorize("system_admin"), controller.getAdmins);
router.post("/assign-admin", authenticate, authorize("system_admin"), validate(manageAdminSchema), controller.assignAdmin);
router.post("/revoke-admin", authenticate, authorize("system_admin"), validate(manageAdminSchema), controller.revokeAdmin);
router.post("/search-user", authenticate, authorize("system_admin"), validate(searchUserSchema), controller.searchUser);

export default router;
