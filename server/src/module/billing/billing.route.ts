import { Router } from "express";
import * as controller from "./billing.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import { assignPlanSchema, purchasePlanSchema } from "./dto/billing.dto.js";

const router = Router();

// Plans are visible to any authenticated user (needed for purchase UI).
router.get("/plans", authenticate, controller.listPlans);

// system_admin assigns plans to any organisation.
router.post("/assign", authenticate, authorize("system_admin"), validate(assignPlanSchema), controller.assignPlan);
router.get("/subscriptions/:orgId", authenticate, authorize("system_admin"), controller.getSubscriptionByOrg);
router.get("/usage/:orgId", authenticate, authorize("system_admin"), controller.getOrgUsage);

// Manager self-service: view/purchase their own org's plan (Razorpay later).
router.get("/subscriptions/mine", authenticate, authorize("manager"), controller.getMySubscription);
router.post("/purchase", authenticate, authorize("manager"), validate(purchasePlanSchema), controller.purchasePlan);
router.get("/usage/mine", authenticate, authorize("manager"), controller.getMyUsage);

export default router;