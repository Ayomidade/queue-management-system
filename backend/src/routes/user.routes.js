import { Router } from "express";
import { getMyProfile, changePassword } from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/profile", protect, getMyProfile);
router.patch("/change-password", protect, changePassword);

export default router;
  