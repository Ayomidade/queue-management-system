import express from "express";
import {
  createStaff,
  loginStaff,
  getAllStaff,
  getStaffById,
  assignStaffToBranch,
  deactivateStaff,
  assignQueuesToStaff,
} from "../controllers/staff.controller.js";
import {
  createStaffValidator,
  assignStaffValidator,
} from "../validators/staff.validator.js";
import { loginValidator } from "../validators/auth.validator.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
import validate from "../middlewares/validate.js";

const router = express.Router();

// Legacy staff login path — prefer POST /api/auth/login/staff (WP3).
router.post("/login", authLimiter, loginValidator, validate, loginStaff);

router.use(protect);
router.use(authorize("admin", "manager"));

router.post("/", createStaffValidator, validate, createStaff);
router.get("/", getAllStaff);
router.get("/:staffId", getStaffById);
router.patch(
  "/:staffId/assign",
  authorize("admin"),
  assignStaffValidator,
  validate,
  assignStaffToBranch,
);
router.patch("/:staffId/queues", assignQueuesToStaff);
router.delete("/:staffId", deactivateStaff);

export default router;
