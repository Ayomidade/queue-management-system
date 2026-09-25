import Staff from "../models/staff.model.js";
import { sendError } from "../utils/response.js";

/**
 * Resolve Staff User Middleware
 *
 * After API key authentication, resolves the staff member making the
 * request. Used by bank integrations that pass
 * an explicit identity — the bank's system says WHO is acting.
 *
 * Identity sources (in order):
 *   1. X-Staff-Id header (always a Staff id — managers/admins don't
 *      call the integration API as themselves)
 *   2. The API key's defaultStaffId (fallback for server-to-server)
 *
 * Sets req.user and req.role ("staff" — the Staff collection has no
 * role field after the four-model split; the collection IS the role).
 * Skipped entirely when protect() already set req.user (JWT path).
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

    const account = await Staff.findById(userId)
      .populate("branch", "bank")
      .select("-password");
    if (!account || account.isActive === false) {
      return sendError(res, {
        statusCode: 401,
        message: "Staff member not found or inactive",
      });
    }

    if (req.apiKey?.bankName && String(account.branch?.bank) !== String(req.apiKey.bankName)) {
      return sendError(res, {
        statusCode: 403,
        message: "Staff identity does not belong to the API key bank",
      });
    }

    req.user = account;
    // Staff collection = staff role (no role field on the document).
    req.role = "staff";
    req.kind = "staff";
    next();
  } catch (error) {
    next(error);
  }
};
