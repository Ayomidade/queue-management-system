import { Router } from "express";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import authRoutes from "./auth.routes.js";
import apiKeyRoutes from "./apiKey.routes.js";
import usageRoutes from "./usage.routes.js";
import keyRequestRoutes from "./keyRequest.routes.js";
import { getPlatformOverview } from "../../controllers/platform/platformUsage.controller.js";

/**
 * Platform router — superadmin-only, JWT-protected.
 *
 * Mounted at /api/platform in app.js (BEFORE the v1 API-key pipeline).
 * These routes are intentionally NOT under /api/v1 and do NOT go through
 * bankScope — the superadmin is a platform operator, not bank-scoped.
 *
 * Auth model:
 *   POST /api/platform/login  → open (rate-limited) → issues JWT
 *   everything else           → protect + authorize("superadmin")
 *
 * Scope (v1): API keys + usage monitoring only.
 * No bank/branch/staff management — that stays with bank-scoped admins.
 */
const platformRouter = Router();

// Open login route (self-protects with authLimiter + role check).
// GET /me under authRoutes also applies protect + authorize("superadmin").
platformRouter.use("/", authRoutes);

// Everything mounted below this line requires a valid superadmin JWT.
platformRouter.use(protect);
platformRouter.use(authorize("superadmin"));

platformRouter.use("/api-keys", apiKeyRoutes);
platformRouter.use("/usage", usageRoutes);
platformRouter.use("/key-requests", keyRequestRoutes);

// GET /api/platform/overview — high-level platform stats.
platformRouter.get("/overview", getPlatformOverview);

export default platformRouter;
