import { Router } from "express";
import { getAdminOverview } from "../../controllers/admin.controller.js";
import { requireScope } from "../../middlewares/apiKey.middleware.js";

/**
 * V1 Admin Routes — API-key only (bank-scoped overview).
 *
 * Scope wiring (WP5): analytics:read gates the cross-branch summary.
 * Role authorize() removed — resolveStaffUser always sets role "staff",
 * so authorize("admin") would 403 every API-key request. The controller
 * accepts either role "admin" (JWT path) or an authenticated API key
 * (integration path); bank isolation still comes from req.bankName.
 */

const adminRouter = Router();

adminRouter.get("/", requireScope("analytics:read"), getAdminOverview);

export default adminRouter;
