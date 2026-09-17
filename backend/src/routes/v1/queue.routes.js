import { Router } from "express";
import {
  createQueue,
  getBranchQueues,
  updateQueue,
  deleteQueue,
} from "../../controllers/queue.controller.js";
import { createQueueValidator, updateQueueValidator } from "../../validators/queue.validator.js";
import validate from "../../middlewares/validate.js";

/**
 * V1 Queue Routes
 *
 * Uses the original queue controller. The bankScope middleware
 * provides req.bankBranchIds for filtering.
 */

const queueRouter = Router();

queueRouter.get("/", getBranchQueues);
queueRouter.post("/", createQueueValidator, validate, createQueue);
queueRouter.put("/:id", updateQueueValidator, validate, updateQueue);
queueRouter.delete("/:id", deleteQueue);

export default queueRouter;
