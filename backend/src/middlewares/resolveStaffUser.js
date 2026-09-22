import Staff from "../models/staff.model.js";
import { sendError } from "../utils/response.js";

/**
 * Resolve Staff User Middleware
 *
 * After API key authentication, resolves the staff member making the request.
 * Uses X-Staff-Id header (from the bank's system) or the API key's defaultStaffId.
 * Sets req.user and req.role so controllers work unchanged.
 */
export const resolveStaffUser = async (req, res, next) => {
  try {
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

    const account = await Staff.findById(userId).select("-password");
    if (!account) {
      return sendError(res, {
        statusCode: 401,
        message: "Staff member not found or inactive",
      });
    }

    req.user = account;
    req.role = account.role;
    next();
  } catch (error) {
    next(error);
  }
};
