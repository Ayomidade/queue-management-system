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

/**
 * V1 Counter Routes
 *
 * Uses the original counter controller. The bankScope middleware
 * provides req.bankBranchIds for filtering.
 */

const counterRouter = Router();

counterRouter.get("/:branchId", getCounterById);
counterRouter.post("/", createCounterValidator, validate, createCounter);
counterRouter.patch("/:counterId/assign-staff", assignStaffToCounterValidator, validate, assignStaffToCounter);
counterRouter.patch("/:counterId/unassign-staff", unassignStaffFromCounter);
counterRouter.patch("/:counterId/open", openCounter);
counterRouter.patch("/:counterId/close", closeCounter);

export default counterRouter;
