import { Router } from "express";
import {
  createCounter,
  assignStaffToCounter,
  unassignStaffFromCounter,
  closeCounter,
  openCounter,
  getCounterById,
} from "../../controllers/counter.controller.js";
import {
  createCounterValidator,
  assignStaffToCounterValidator,
} from "../../validators/counter.validator.js";
import validate from "../../middlewares/validate.js";
import { requireScope } from "../../middlewares/apiKey.middleware.js";

/**
 * V1 Counter Routes — API-key only.
 * Scope wiring (WP5): branches:read covers counter ops (branch/queue/
 * counter/board umbrella). bankScope isolates by bank.
 */

const counterRouter = Router();

counterRouter.get(
  "/:branchId",
  requireScope("counters:read"),
  getCounterById,
);
counterRouter.post(
  "/",
  requireScope("counters:write"),
  createCounterValidator,
  validate,
  createCounter,
);
counterRouter.patch(
  "/:counterId/assign-staff",
  requireScope("counters:write"),
  assignStaffToCounterValidator,
  validate,
  assignStaffToCounter,
);
counterRouter.patch(
  "/:counterId/unassign-staff",
  requireScope("counters:write"),
  unassignStaffFromCounter,
);
counterRouter.patch("/:counterId/open", requireScope("branches:read"), openCounter);
counterRouter.patch(
  "/:counterId/close",
  requireScope("counters:write"),
  closeCounter,
);

export default counterRouter;
