import { Router } from "express";
import { getBranchBoard } from "../controllers/board.controller.js";

const router = Router();
router.get("/:branchId", getBranchBoard);

export default router;
