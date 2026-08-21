import { Router } from "express";
import {
  createBranch,
  getAllBranches,
  getSingleBranch,
  deleteBranch,
  getPublicBranch,
} from "../controllers/branch.controller.js";
import { createBranchValidator } from "../validators/branch.validator.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.js";

const branchRouter = Router();

branchRouter.get("/public/:branchId", getPublicBranch);

branchRouter.use(protect);

branchRouter.post(
  "/",
  authorize("admin"),
  createBranchValidator,
  validate,
  createBranch,
);
branchRouter.get("/", authorize("admin"), getAllBranches);
branchRouter.get("/:id", authorize("admin"), getSingleBranch);
branchRouter.delete("/:id", authorize("admin"), deleteBranch);

export default branchRouter;
