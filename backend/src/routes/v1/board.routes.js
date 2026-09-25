import { Router } from "express";
import { getAllBoards, getBranchBoard } from "../../controllers/board.controller.js";
import { validateBranchOwnership } from "../../middlewares/bankScope.middleware.js";
import { requireScope } from "../../middlewares/apiKey.middleware.js";

/**
 * V1 Board Routes — API-key only.
 * Scope wiring (WP5): branches:read covers public board data
 * (branch/queue/counter/board umbrella).
 */

const boardRouter = Router();

boardRouter.get("/", requireScope("branches:read"), getAllBoards);
boardRouter.get(
  "/:branchId",
  requireScope("branches:read"),
  validateBranchOwnership,
  getBranchBoard,
);

export default boardRouter;
