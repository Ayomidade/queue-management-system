import express from "express";
import {
  createManager,
  getAllManagers,
  assignManagerBranch,
  deactivateManager,
} from "../controllers/manager.controller.js";
import {
  createManagerValidator,
  assignManagerBranchValidator,
} from "../validators/manager.validator.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.js";

/**
 * Manager routes — Phase 13 WP4.
 * JWT-only (dashboard surface); all routes admin-scoped by bank in the controller.
 *
 * Managers do NOT have routes here — they cannot create other managers.
 */
const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.post("/", createManagerValidator, validate, createManager);
router.get("/", getAllManagers);
router.patch(
  "/:managerId/branch",
  assignManagerBranchValidator,
  validate,
  assignManagerBranch,
);
router.delete("/:managerId", deactivateManager);

export default router;
