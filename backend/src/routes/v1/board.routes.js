import { Router } from "express";
import { getAllBoards, getBranchBoard } from "../../controllers/board.controller.js";
import { validateBranchOwnership } from "../../middlewares/bankScope.middleware.js";

/**
 * V1 Board Routes
 *
 * Uses the original board controller with optional bank-scoping.
 * The bankScope middleware (applied in v1/index.js) sets req.bankName,
 * and the controller checks it to filter branches by bank.
 */

const boardRouter = Router();

boardRouter.get("/", getAllBoards);
boardRouter.get("/:branchId", validateBranchOwnership, getBranchBoard);

export default boardRouter;
