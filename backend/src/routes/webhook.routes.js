import { Router } from "express";
import {
  createWebhook,
  listWebhooks,
  deleteWebhook,
  toggleWebhook,
} from "../controllers/webhook.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const webhookRouter = Router();
webhookRouter.use(protect);

webhookRouter.post("/", authorize("admin", "manager"), createWebhook);
webhookRouter.get("/", authorize("admin", "manager"), listWebhooks);
webhookRouter.delete("/:id", authorize("admin"), deleteWebhook);
webhookRouter.patch("/:id/toggle", authorize("admin"), toggleWebhook);

export default webhookRouter;
