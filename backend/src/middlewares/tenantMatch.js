import { sendError } from "../utils/response.js";

/**
 * Tenant-match middleware — enforces that a bank admin's own `bank`
 * field matches the bank attached to the API key on the same request.
 *
 * Why: after the four-model split, Admin carries a denormalized `bank`,
 * while runtime scoping still comes from the API key (`req.bankName`).
 * If both are present and they disagree, the request is ambiguous
 * (admin logged into bank A but using bank B's key) — refuse it.
 *
 * When only one identity is present, there's nothing to compare:
 *   - API key only (external bank system) → scoped by key.bankName
 *   - JWT only (dashboard, no X-API-Key)  → scoped by admin.bank
 *
 * Mounted on the authenticated v1 chain (after resolveStaffUser) so any
 * future dual-auth request hits this guard.
 */
export const tenantMatch = (req, res, next) => {
  const adminBank = req.user?.bank;
  const keyBank = req.bankName;

  // Only admins carry a `bank` field; other kinds have nothing to compare.
  if (req.role !== "admin" || !adminBank || !keyBank) {
    return next();
  }

  if (adminBank !== keyBank) {
    return sendError(res, {
      statusCode: 403,
      message: "Admin bank does not match API key bank",
    });
  }

  next();
};
