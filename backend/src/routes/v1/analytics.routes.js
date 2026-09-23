import { Router } from "express";
import {
  getBranchAnalytics,
  getBranchStaffPerformance,
} from "../../controllers/analytics.controller.js";
import { authorize } from "../../middlewares/auth.middleware.js";
import { validateBranchOwnership } from "../../middlewares/bankScope.middleware.js";

/**
 * V1 Analytics Routes
 *
 * Reuses the existing analytics controller but with API key auth.
 * The bankScope middleware ensures branch ownership validation.
 * Admin and manager roles can access branch analytics.
 */

const analyticsRouter = Router();

analyticsRouter.use(authorize("admin", "manager"));

analyticsRouter.get(
  "/branch/:branchId",
  validateBranchOwnership,
  getBranchAnalytics,
);
analyticsRouter.get(
  "/branch/:branchId/staff-performance",
  validateBranchOwnership,
  getBranchStaffPerformance,
);

export default analyticsRouter;
