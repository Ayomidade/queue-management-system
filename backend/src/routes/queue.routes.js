import express from "express";
import { createQueue, getBranchQueues, updateQueue, deleteQueue } from "../controllers/queue.controller.js";
import { createQueueValidator, updateQueueValidator } from "../validators/queue.validator.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.js";

const router = express.Router();

// Public queue list for the guest ticket form (no auth — customer pulls
// a ticket without signing in). Same controller as the JWT path; without
// req.role it returns all active queues.
router.get("/public", getBranchQueues);

router.use(protect);

router.post("/", authorize("admin"), createQueueValidator, validate, createQueue);
router.get("/", getBranchQueues);
router.put("/:id", authorize("admin"), updateQueueValidator, validate, updateQueue);
router.delete("/:id", authorize("admin"), deleteQueue);

export default router;