import { Router } from "express";
import {
  getAllStaff,
  createStaff,
  deactivateStaff,
  assignQueuesToStaff,
} from "../../controllers/staff.controller.js";
import { authorize } from "../../middlewares/auth.middleware.js";
import { createStaffValidator } from "../../validators/staff.validator.js";
import validate from "../../middlewares/validate.js";

/**
 * V1 Staff Routes
 *
 * Manages staff members. Manager/admin only.
 * The bankScope middleware (applied at v1Router level) ensures
 * managers can only see/manage staff in their own branch.
 */

const staffRouter = Router();

// All staff routes require admin or manager role
staffRouter.use(authorize("admin", "manager"));

staffRouter.get("/", getAllStaff);
staffRouter.post("/", createStaffValidator, validate, createStaff);
staffRouter.patch("/:staffId/queues", assignQueuesToStaff);
staffRouter.delete("/:staffId", deactivateStaff);

export default staffRouter;
