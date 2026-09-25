import { Router } from "express";
import {
  createQueue,
  getBranchQueues,
  updateQueue,
  deleteQueue,
} from "../../controllers/queue.controller.js";
import {
  createQueueValidator,
  updateQueueValidator,
} from "../../validators/queue.validator.js";
import validate from "../../middlewares/validate.js";
import { requireScope } from "../../middlewares/apiKey.middleware.js";

/**
 * V1 Queue Routes — API-key only.
 * Scope wiring (WP5): branches:read covers queue CRUD (part of the
 * branch/queue/counter/board read umbrella). bankScope isolates by bank.
 */

const queueRouter = Router();

queueRouter.get("/", requireScope("branches:read"), getBranchQueues);
queueRouter.post(
  "/",
  requireScope("branches:read"),
  createQueueValidator,
  validate,
  createQueue,
);
queueRouter.put(
  "/:id",
  requireScope("branches:read"),
  updateQueueValidator,
  validate,
  updateQueue,
);
queueRouter.delete("/:id", requireScope("branches:read"), deleteQueue);

export default queueRouter;
