import { Router } from "express";
import {
  getPeakHours,
  getStaffLeaderboard,
  getServiceWaitTargets,
  updateServiceWaitTargets,
} from "../controllers/advancedAnalytics.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const advancedAnalyticsRouter = Router();
advancedAnalyticsRouter.use(protect);

advancedAnalyticsRouter.get(
  "/branch/:branchId/peak-hours",
  authorize("manager", "admin"),
  getPeakHours,
);

advancedAnalyticsRouter.get(
  "/branch/:branchId/leaderboard",
  authorize("manager", "admin"),
  getStaffLeaderboard,
);

advancedAnalyticsRouter.get(
  "/branch/:branchId/wait-targets",
  authorize("manager", "admin"),
  getServiceWaitTargets,
);

advancedAnalyticsRouter.put(
  "/branch/:branchId/wait-targets",
  authorize("manager", "admin"),
  updateServiceWaitTargets,
);

export default advancedAnalyticsRouter;
