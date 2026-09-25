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
  requireScope("branches:read"),
  getCounterById,
);
counterRouter.post(
  "/",
  requireScope("branches:read"),
  createCounterValidator,
  validate,
  createCounter,
);
counterRouter.patch(
  "/:counterId/assign-staff",
  requireScope("branches:read"),
  assignStaffToCounterValidator,
  validate,
  assignStaffToCounter,
);
counterRouter.patch(
  "/:counterId/unassign-staff",
  requireScope("branches:read"),
  unassignStaffFromCounter,
);
counterRouter.patch("/:counterId/open", requireScope("branches:read"), openCounter);
counterRouter.patch(
  "/:counterId/close",
  requireScope("branches:read"),
  closeCounter,
);

export default counterRouter;
