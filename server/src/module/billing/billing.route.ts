import { Router } from "express";
import * as controller from "./billing.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import { assignPlanSchema, purchasePlanSchema } from "./dto/billing.dto.js";

const router = Router();

// Plans are visible to any authenticated user (needed for purchase UI).
router.get("/plans", authenticate, controller.listPlans);

// Feature flags for the current user's organisation. Open to any staff role —
// carries no billing figures, only what is switched on.
router.get("/entitlements/mine", authenticate, authorize("system_admin", "manager", "teacher"), controller.getMyEntitlements);

// Manager self-service routes MUST come before the parameterized routes below,
// otherwise "/usage/mine" matches "/usage/:orgId" (system_admin) first and the
// manager gets 403.
router.get("/subscriptions/mine", authenticate, authorize("manager"), controller.getMySubscription);
router.get("/usage/mine", authenticate, authorize("manager"), controller.getMyUsage);
router.post("/purchase", authenticate, authorize("manager"), validate(purchasePlanSchema), controller.purchasePlan);

// system_admin assigns plans to any organisation.
router.post("/assign", authenticate, authorize("system_admin"), validate(assignPlanSchema), controller.assignPlan);
router.get("/subscriptions/:orgId", authenticate, authorize("system_admin"), controller.getSubscriptionByOrg);
router.get("/usage/:orgId", authenticate, authorize("system_admin"), controller.getOrgUsage);

export default router;