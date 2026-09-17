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

/**
 * V1 Branch Routes
 *
 * Uses the original branch controller with optional bank-scoping.
 * The bankScope middleware sets req.bankName, and the controller
 * automatically sets the bank field when creating branches.
 */

const branchRouter = Router();

branchRouter.get("/", getAllBranches);
branchRouter.get("/public/:branchId", getPublicBranch);
branchRouter.get("/:id", getSingleBranch);
branchRouter.post("/", createBranchValidator, validate, createBranch);
branchRouter.put("/:id", updateBranchValidator, validate, updateBranch);
branchRouter.delete("/:id", deleteBranch);

export default branchRouter;
