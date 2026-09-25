import { Router } from "express";
import { getAdminOverview } from "../controllers/admin.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

/**
 * JWT admin overview (Phase 13 WP6).
 *
 * Dashboard surface — bank scope comes from Admin.bank (no API key).
 * Parallel to GET /api/v1/admin (API-key integration path).
 */
const router = Router();

router.get("/overview", protect, authorize("admin"), getAdminOverview);

export default router;
