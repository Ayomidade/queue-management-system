import express from "express";
import {
  createCounter,
  assignStaffToCounter,
  unassignStaffFromCounter,
  closeCounter,
  openCounter,
  getCounterById,
} from "../controllers/counter.controller.js";
import {
  createCounterValidator,
  assignStaffToCounterValidator,
} from "../validators/counter.validator.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.js";

const counterRouter = express.Router();
counterRouter.use(protect);

counterRouter.post(
  "/",
  authorize("admin", "manager"),
  createCounterValidator,
  validate,
  createCounter,
);
counterRouter.get(
  "/:branchId",
  authorize("admin", "manager", "staff"),
  getCounterById,
);
counterRouter.patch(
  "/:counterId/assign-staff",
  authorize("admin", "manager"),
  assignStaffToCounterValidator,
  validate,
  assignStaffToCounter,
);
counterRouter.patch(
  "/:counterId/unassign-staff",
  authorize("admin", "manager"),
  unassignStaffFromCounter,
);
counterRouter.patch(
  "/:counterId/open",
  authorize("admin", "manager"),
  openCounter,
);
counterRouter.patch(
  "/:counterId/close",
  authorize("admin", "manager", "staff"),
  closeCounter,
);

export default counterRouter;
