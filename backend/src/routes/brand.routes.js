import { Router } from "express";
import { getBrandConfig, updateBrandConfig } from "../controllers/brand.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const brandRouter = Router();

brandRouter.get("/", getBrandConfig);
brandRouter.patch("/", protect, authorize("admin"), updateBrandConfig);

export default brandRouter;
