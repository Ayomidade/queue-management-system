import { Router } from "express";
import {
  getBranchAnalytics,
  getBranchDailyReport,
  getBranchStaffPerformance,
} from "../controllers/analytics.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const analyticsRouter = Router();
analyticsRouter.use(protect);
analyticsRouter.use(authorize("admin", "manager"));

analyticsRouter.get("/branch/:branchId", getBranchAnalytics);
analyticsRouter.get("/branch/:branchId/daily-report", getBranchDailyReport);
analyticsRouter.get(
  "/branch/:branchId/staff-performance",
  getBranchStaffPerformance,
);

export default analyticsRouter;
