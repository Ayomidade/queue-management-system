import Staff from "../models/staff.model.js";
import User from "../models/user.model.js";
import { sendError } from "../utils/response.js";

/**
 * Resolve Staff User Middleware
 *
 * After API key authentication, resolves the user making the request.
 * Uses X-Staff-Id header (from the bank's system) or the API key's defaultStaffId.
 * Sets req.user and req.role so legacy controllers work unchanged.
 *
 * Looks up Staff first, then falls back to User model (for customer personas).
 */
export const resolveStaffUser = async (req, res, next) => {
  try {
    // Only runs when API key auth was used (no req.user from JWT)
    if (req.user) {
      return next();
    }

    const userId = req.headers["x-staff-id"] || req.apiKey?.defaultStaffId;

    if (!userId) {
      return sendError(res, {
        statusCode: 400,
        message:
          "No user identity. Pass X-Staff-Id header or configure a default on the API key.",
      });
    }

    // Try Staff model first, then fall back to User model
    let account = await Staff.findById(userId).select("-password");
    if (account) {
      req.user = account;
      req.role = account.role;
      return next();
    }

    account = await User.findById(userId).select("-password");
    if (account) {
      req.user = account;
      req.role = account.role;
      return next();
    }

    return sendError(res, {
      statusCode: 401,
      message: "User not found or inactive",
    });
  } catch (error) {
    next(error);
  }
};
