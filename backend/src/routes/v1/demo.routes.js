import { Router } from "express";
import { getDemoUsers } from "../../controllers/demo.controller.js";

/**
 * Demo Routes
 *
 * Helper endpoints for the demo frontend.
 * No auth required — these are public demo utilities.
 */

const demoRouter = Router();

demoRouter.get("/users", getDemoUsers);

export default demoRouter;
