import express from "express";
import {
  createStaff,
  loginStaff,
  getAllStaff,
  assignStaffToBranch,
  deactivateStaff,
} from "../controllers/staff.controller.js";
import {
  createStaffValidator,
  assignStaffValidator,
} from "../validators/staff.validator.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
import validate from "../middlewares/validate.js";

const router = express.Router();

router.post("/login", authLimiter, loginStaff);

router.use(protect);
router.use(authorize("admin"));

router.post("/", createStaffValidator, validate, createStaff);
router.get("/", getAllStaff);
router.patch(
  "/:staffId/assign",
  assignStaffValidator,
  validate,
  assignStaffToBranch,
);
router.delete("/:staffId", deactivateStaff);

export default router;
