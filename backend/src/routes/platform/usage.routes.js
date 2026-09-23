import { Router } from "express";
import { getPlatformUsage } from "../../controllers/platform/platformUsage.controller.js";

/**
 * Platform usage routes — API usage monitoring for superadmin.
 * Mounted at /usage → GET /api/platform/usage?days=7
 * (GET /api/platform/overview is defined on the parent platform router.)
 */
const router = Router();

router.get("/", getPlatformUsage);

export default router;
