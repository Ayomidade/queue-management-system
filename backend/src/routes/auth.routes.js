import express from "express";
import {
  loginStaff,
  loginManager,
  loginAdmin,
  registerAdmin,
  createManagerInvite,
  createStaffInvite,
  registerWithInvite,
  getAuthMe,
  changePassword,
} from "../controllers/auth.controller.js";
import {
  loginStaffValidator,
  loginManagerValidator,
  loginAdminValidator,
  registerAdminValidator,
  createManagerInviteValidator,
  createStaffInviteValidator,
  registerWithInviteValidator,
  changePasswordValidator,
} from "../validators/auth.validator.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { authLimiter, registerLimiter } from "../middlewares/rateLimiter.js";
import validate from "../middlewares/validate.js";

/**
 * Auth routes — Phase 13 WP3.
 *
 * One public login endpoint per collection (kind). Superadmin login
 * stays on POST /api/platform/login.
 *
 * Public:
 *   POST /api/auth/login/{staff,manager,admin}
 *   POST /api/auth/register/admin          (onboarding-secret protected)
 *   POST /api/auth/register/{manager,staff} (redeem invite token)
 *
 * Protected:
 *   POST /api/auth/invites/{manager,staff}
 *   GET  /api/auth/me
 *   POST /api/auth/change-password
 */
const router = express.Router();

// ── Login (one endpoint per kind) ──────────────────────────────
router.post(
  "/login/staff",
  authLimiter,
  loginStaffValidator,
  validate,
  loginStaff,
);
router.post(
  "/login/manager",
  authLimiter,
  loginManagerValidator,
  validate,
  loginManager,
);
router.post(
  "/login/admin",
  authLimiter,
  loginAdminValidator,
  validate,
  loginAdmin,
);

// ── Public bank-admin self-registration ────────────────────────
// Open, instant, bankName required. Stricter rate limit than logins.
router.post(
  "/register/admin",
  registerLimiter,
  registerAdminValidator,
  validate,
  registerAdmin,
);

// ── Invite redemption (public — token proves the invitation) ───
router.post(
  "/register/manager",
  registerLimiter,
  registerWithInviteValidator,
  validate,
  registerWithInvite("manager"),
);
router.post(
  "/register/staff",
  registerLimiter,
  registerWithInviteValidator,
  validate,
  registerWithInvite("staff"),
);

// Everything below requires a JWT (any kind that passes authorize).
router.use(protect);

// ── Invite issuance ────────────────────────────────────────────
// Manager invites: admin only (bank-scoped from Admin.bank).
router.post(
  "/invites/manager",
  authorize("admin"),
  createManagerInviteValidator,
  validate,
  createManagerInvite,
);
// Staff invites: admin (any branch in their bank) or manager (own branch).
router.post(
  "/invites/staff",
  authorize("admin", "manager"),
  createStaffInviteValidator,
  validate,
  createStaffInvite,
);

// ── Identity helpers ───────────────────────────────────────────
router.get("/me", getAuthMe);
router.post(
  "/change-password",
  changePasswordValidator,
  validate,
  changePassword,
);

export default router;
