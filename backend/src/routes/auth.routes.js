import { Router } from "express";
import {
  loginUser,
  registerUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import { validateRegistration } from "../validators/auth.validator.js";
import validate from "../middlewares/validate.js";
import { authLimiter } from "../middlewares/rateLimiter.js";

const auth_router = Router();

auth_router.post(
  "/register",
  authLimiter,
  validateRegistration,
  validate,
  registerUser,
);
auth_router.post("/login", authLimiter, loginUser);
auth_router.post("/verify-email", verifyEmail);
auth_router.post("/resend-verification", resendVerification);
auth_router.post("/forgot-password", authLimiter, forgotPassword);
auth_router.post("/reset-password", resetPassword);

export default auth_router;
