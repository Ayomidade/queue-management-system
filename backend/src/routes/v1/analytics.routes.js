import { Router } from "express";
import {
  getBranchAnalytics,
  getBranchStaffPerformance,
} from "../../controllers/analytics.controller.js";
import { requireScope } from "../../middlewares/apiKey.middleware.js";
import { validateBranchOwnership } from "../../middlewares/bankScope.middleware.js";

/**
 * V1 Analytics Routes — API-key only.
 * Scope wiring (WP5): analytics:read for all report endpoints.
 * Role authorize() removed — resolveStaffUser always sets role "staff",
 * which would block every API-key request. Dashboard keeps JWT
 * authorize("admin","manager") on /api/analytics.
 */

const analyticsRouter = Router();

analyticsRouter.get(
  "/branch/:branchId",
  requireScope("analytics:read"),
  validateBranchOwnership,
  getBranchAnalytics,
);
analyticsRouter.get(
  "/branch/:branchId/staff-performance",
  requireScope("analytics:read"),
  validateBranchOwnership,
  getBranchStaffPerformance,
);

export default analyticsRouter;
