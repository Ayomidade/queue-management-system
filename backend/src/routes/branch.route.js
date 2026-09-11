import { Router } from "express";
import {
  createBranch,
  updateBranch,
  getAllBranches,
  getSingleBranch,
  deleteBranch,
  getPublicBranch,
  getNearestBranches,
} from "../controllers/branch.controller.js";
import {
  createBranchValidator,
  updateBranchValidator,
} from "../validators/branch.validator.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.js";
import { publicReadLimiter } from "../middlewares/rateLimiter.js";

const branchRouter = Router();

branchRouter.get("/public/:branchId", publicReadLimiter, getPublicBranch);
branchRouter.get("/nearest", publicReadLimiter, getNearestBranches);

branchRouter.use(protect);

branchRouter.post(
  "/",
  authorize("admin"),
  createBranchValidator,
  validate,
  createBranch,
);
branchRouter.put(
  "/:id",
  authorize("admin", "manager"),
  updateBranchValidator,
  validate,
  updateBranch,
);
branchRouter.get("/", authorize("admin"), getAllBranches);
branchRouter.get("/:id", authorize("admin"), getSingleBranch);
branchRouter.delete("/:id", authorize("admin"), deleteBranch);

export default branchRouter;
