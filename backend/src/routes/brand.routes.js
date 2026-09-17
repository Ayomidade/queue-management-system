import { Router } from "express";
import { getBrandConfig } from "../controllers/brand.controller.js";

/**
 * Brand Routes
 *
 * GET /api/brand — Returns brand config from environment variables.
 * No PATCH endpoint — branding is configured via .env, not at runtime.
 */

const brandRouter = Router();

brandRouter.get("/", getBrandConfig);

export default brandRouter;
