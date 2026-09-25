import { Router } from "express";
import {
  createBranch,
  updateBranch,
  getAllBranches,
  getSingleBranch,
  deleteBranch,
  getPublicBranch,
} from "../../controllers/branch.controller.js";
import {
  createBranchValidator,
  updateBranchValidator,
} from "../../validators/branch.validator.js";
import validate from "../../middlewares/validate.js";
import { requireScope } from "../../middlewares/apiKey.middleware.js";

/**
 * V1 Branch Routes — API-key only.
 * Scope wiring (WP5): reads need branches:read; mutations need
 * branches:read too (same umbrella — there is no branches:write scope).
 * bankScope already isolates by key.bankName.
 */

const branchRouter = Router();

branchRouter.get("/", requireScope("branches:read"), getAllBranches);
branchRouter.get(
  "/public/:branchId",
  requireScope("branches:read"),
  getPublicBranch,
);
branchRouter.get("/:id", requireScope("branches:read"), getSingleBranch);
branchRouter.post(
  "/",
  requireScope("branches:read"),
  createBranchValidator,
  validate,
  createBranch,
);
branchRouter.put(
  "/:id",
  requireScope("branches:read"),
  updateBranchValidator,
  validate,
  updateBranch,
);
branchRouter.delete("/:id", requireScope("branches:read"), deleteBranch);

export default branchRouter;
