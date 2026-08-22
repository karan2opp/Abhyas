import { Router } from "express";
import { 
    generateBlueprintHandler, 
    verifyBlueprintHandler, 
    enqueueGenerateFromBlueprintHandler 
} from "./generation.controller.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";

const router = Router();

router.post(
    "/blueprint",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    generateBlueprintHandler
);

router.post(
    "/verify-blueprint",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    verifyBlueprintHandler
);

router.post(
    "/generate-from-blueprint/async",
    authenticate,
    authorize("system_admin", "teacher", "manager"),
    enqueueGenerateFromBlueprintHandler
);

export const generationRouter = router;
export default router;
