import { Router } from "express";
import { getBranchBoard, getAllBoards } from "../controllers/board.controller.js";

const router = Router();
router.get("/", getAllBoards);
router.get("/:branchId", getBranchBoard);

export default router;
