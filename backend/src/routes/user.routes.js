import { Router } from "express";
import { getMyProfile, adminOnlyPing } from "../controllers/user.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/profile", protect, getMyProfile);
router.get("/admin-only", protect, authorize("admin"), adminOnlyPing);

export default router;
  