import { Router } from "express";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import * as chatController from "./chat.controller.js";

const router = Router();

router.use(authenticate);
router.use(authorize("teacher"));

router.get("/", chatController.getChats);
router.get("/:id", chatController.getChatById);
router.post("/", chatController.createChat);
router.post("/init", chatController.initChat);
router.post("/:id/message", chatController.addMessageToChat);
router.post("/:id/system-message", chatController.appendSystemMessage);
router.delete("/:id", chatController.deleteChat);

export default router;
