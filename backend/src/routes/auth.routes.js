import { Router } from "express";
import { loginUser, registerUser } from "../controllers/auth.controller.js";
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
export default auth_router;
