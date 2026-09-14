import { Router } from "express";
import { exportAnalyticsCSV, exportAnalyticsPDF } from "../controllers/export.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const exportRouter = Router();
exportRouter.use(protect);

exportRouter.get(
  "/branch/:branchId/csv",
  authorize("manager", "admin"),
  exportAnalyticsCSV,
);
exportRouter.get(
  "/branch/:branchId/pdf",
  authorize("manager", "admin"),
  exportAnalyticsPDF,
);

export default exportRouter;
