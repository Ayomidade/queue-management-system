import jwt from "jsonwebtoken";
import Superadmin from "../../models/superadmin.model.js";
import { sendSuccess, sendError } from "../../utils/response.js";

/**
 * Platform auth controller — superadmin JWT login for /platform.
 *
 * After the four-model split, superadmins live in their own collection
 * (Superadmin), separate from bank Staff/Admin/Manager accounts.
 * The platform login is the only way into that collection.
 */

/**
 * POST /api/platform/login
 * Body: { email, password }
 * Issues a JWT with kind="superadmin" if the account exists and is active.
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

    const superadmin = await Superadmin.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    // Same generic error for missing account and bad password (no user enumeration).
    if (!superadmin || !superadmin.isActive) {
      return sendError(res, { statusCode: 401, message: "Invalid credentials" });
    }

    const isMatch = await superadmin.comparePassword(password);
    if (!isMatch) {
      return sendError(res, { statusCode: 401, message: "Invalid credentials" });
    }

    // kind tells `protect` which collection to load; role stays for authorize().
    const token = jwt.sign(
      { id: superadmin._id, kind: "superadmin", role: "superadmin" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
    );

    // Same identity key as bank logins (`user`) so AuthContext.toAuth
    // and GET /auth/me share one shape. Superadmin has no bank/branch.
    return sendSuccess(res, {
      statusCode: 200,
      message: "Login successful",
      data: {
        user: {
          id: superadmin._id,
          name: superadmin.name,
          email: superadmin.email,
          role: "superadmin",
          kind: "superadmin",
          mustChangePassword: !!superadmin.mustChangePassword,
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
        role: req.role || "superadmin",
      },
    });
  } catch (error) {
    next(error);
  }
};
