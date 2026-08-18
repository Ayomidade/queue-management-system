import { Router } from "express";
import {
  createBranch,
  getAllBranches,
  getSingleBranch,
  deleteBranch,
} from "../controllers/branch.controller.js";
import { createBranchValidator } from "../validators/branch.validator.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.js";

const branchRouter = Router();

branchRouter.post(
  "/",
  protect,
  authorize("admin"),
  createBranchValidator,
  validate,
  createBranch,
);
branchRouter.get("/", protect, authorize("admin"), getAllBranches);
branchRouter.get("/:id", protect, authorize("admin"), getSingleBranch);
branchRouter.delete("/:id", protect, authorize("admin"), deleteBranch);

export default branchRouter;
