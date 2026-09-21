import Staff from "../models/staff.model.js";
import { sendError } from "../utils/response.js";

/**
 * Resolve Staff User Middleware
 *
 * After API key authentication, resolves the staff member making the request.
 * Uses X-Staff-Id header (from the bank's system) or the API key's defaultStaffId.
 * Sets req.user and req.role so legacy controllers work unchanged.
 */
export const resolveStaffUser = async (req, res, next) => {
  try {
    // Only runs when API key auth was used (no req.user from JWT)
    if (req.user) {
      return next();
    }

    const staffId = req.headers["x-staff-id"] || req.apiKey?.defaultStaffId;

    if (!staffId) {
      return sendError(res, {
        statusCode: 400,
        message:
          "No staff identity. Pass X-Staff-Id header or configure a default on the API key.",
      });
    }

    const staff = await Staff.findById(staffId).select("-password");
    if (!staff || !staff.isActive) {
      return sendError(res, {
        statusCode: 401,
        message: "Staff member not found or inactive",
      });
    }

    req.user = staff;
    req.role = staff.role;
    next();
  } catch (error) {
    next(error);
  }
};
