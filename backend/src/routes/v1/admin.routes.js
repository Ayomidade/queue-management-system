import { Router } from "express";
import { getAdminOverview } from "../../controllers/admin.controller.js";
import { authorize } from "../../middlewares/auth.middleware.js";

/**
 * V1 Admin Routes
 *
 * Admin-only endpoints for cross-branch oversight.
 * The bankScope middleware (applied at v1Router level) provides
 * req.bankBranchIds for tenant isolation.
 */

const adminRouter = Router();

adminRouter.use(authorize("admin"));

adminRouter.get("/", getAdminOverview);

export default adminRouter;
