import { Router } from "express";
import {
  getAllStaff,
  createStaff,
  deactivateStaff,
  assignQueuesToStaff,
} from "../../controllers/staff.controller.js";
import { requireScope } from "../../middlewares/apiKey.middleware.js";
import { createStaffValidator } from "../../validators/staff.validator.js";
import validate from "../../middlewares/validate.js";

/**
 * V1 Staff Routes — API-key only (external bank systems).
 *
 * Scope wiring (WP5): the only bank-requestable staff scope is
 * `staff:read` — it covers list + provision/retire operations the same
 * way `branches:read` covers branch CRUD (no staff:write exists).
 *
 * Role-based authorize() is intentionally NOT used here: resolveStaffUser
 * always loads Staff (role "staff"), so manager/admin authorize() would
 * 403 every API-key request. Dashboard role checks live on the JWT
 * /api/staff surface instead.
 *
 * bankScope still isolates by key.bankName; managers are scoped to their
 * branch inside the controller when a JWT identity is present.
 */

const staffRouter = Router();

staffRouter.get("/", requireScope("staff:read"), getAllStaff);
staffRouter.post(
  "/",
  requireScope("staff:write"),
  createStaffValidator,
  validate,
  createStaff,
);
staffRouter.patch(
  "/:staffId/queues",
  requireScope("staff:write"),
  assignQueuesToStaff,
);
staffRouter.delete(
  "/:staffId",
  requireScope("staff:write"),
  deactivateStaff,
);

export default staffRouter;
