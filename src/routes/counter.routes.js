import express from "express";
import {
  createCounter,
  assignStaffToCounter,
  closeCounter,
  getCounterById,
} from "../controllers/counter.controller.js";
import {
  createCounterValidator,
  assignStaffToCounterValidator,
} from "../validators/counter.validator.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.js";

const counterRouter = express.Router();

counterRouter.post(
  "/",
  protect,
  authorize("admin"),
  createCounterValidator,
  validate,
  createCounter,
);

counterRouter.get(
  "/:branchId",
  protect,
  authorize("admin", "staff"),
  getCounterById,
);

counterRouter.patch(
  "/:counterId/assign-staff",
  protect,
  authorize("admin"),
  assignStaffToCounterValidator,
  validate,
  assignStaffToCounter,
);

counterRouter.patch(
  "/:counterId/close",
  protect,
  authorize("staff"),
  closeCounter,
);

export default counterRouter;
