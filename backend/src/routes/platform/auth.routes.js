import { Router } from "express";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import { loginSuperadmin, getPlatformMe } from "../../controllers/platform/platformAuth.controller.js";
import { authLimiter } from "../../middlewares/rateLimiter.js";
import { loginValidator } from "../../validators/auth.validator.js";
import validate from "../../middlewares/validate.js";

/**
 * Platform auth routes — superadmin JWT login.
 *
 * POST /api/platform/login is OPEN (but rate-limited) so the superadmin
 * can obtain a token. Everything else under /api/platform/* requires
 * protect + authorize("superadmin") (applied in routes/platform/index.js).
 */
const router = Router();

router.post("/login", authLimiter, loginValidator, validate, loginSuperadmin);
router.get("/me", protect, authorize("superadmin"), getPlatformMe);

export default router;
