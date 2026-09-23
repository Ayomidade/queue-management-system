import jwt from "jsonwebtoken";
import Staff from "../../models/staff.model.js";
import { sendSuccess, sendError } from "../../utils/response.js";

/**
 * Platform auth controller — superadmin JWT login for /platform.
 *
 * Superadmin is the only persona who authenticates with email/password.
 * They never use the demo API-key user switcher.
 */

/**
 * POST /api/platform/login
 * Body: { email, password }
 * Issues a JWT only if the account exists, is active, and role is superadmin.
 */
export const loginSuperadmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, {
        statusCode: 400,
        message: "Email and password are required",
      });
    }

    const staff = await Staff.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );

    // Same generic error for missing account and bad password (no user enumeration).
    if (!staff || !staff.isActive) {
      return sendError(res, { statusCode: 401, message: "Invalid credentials" });
    }

    // Only the superadmin role may use the platform login.
    if (staff.role !== "superadmin") {
      return sendError(res, {
        statusCode: 403,
        message: "Access denied: superadmin only",
      });
    }

    const isMatch = await staff.comparePassword(password);
    if (!isMatch) {
      return sendError(res, { statusCode: 401, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: staff._id, role: staff.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
    );

    return sendSuccess(res, {
      statusCode: 200,
      message: "Login successful",
      data: {
        staff: {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/platform/me
 * Returns the authenticated superadmin's profile (set by protect middleware).
 */
export const getPlatformMe = async (req, res, next) => {
  try {
    return sendSuccess(res, {
      statusCode: 200,
      message: "Superadmin profile",
      data: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
