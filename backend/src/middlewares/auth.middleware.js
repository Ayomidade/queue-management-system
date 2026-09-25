import jwt from "jsonwebtoken";
import Staff from "../models/staff.model.js";
import Admin from "../models/admin.model.js";
import Manager from "../models/manager.model.js";
import Superadmin from "../models/superadmin.model.js";
import { sendError } from "../utils/response.js";

/**
 * Identity kinds — which collection a JWT's `id` belongs to.
 *
 * After the four-model split (Phase 13 / WP1), every login issues a JWT
 * with a `kind` claim ("staff" | "admin" | "manager" | "superadmin").
 * `protect` uses that claim to pick the right Mongoose model — it never
 * has to guess by probing four collections.
 */
export const KIND_MODELS = {
  staff: Staff,
  admin: Admin,
  manager: Manager,
  superadmin: Superadmin,
};

/**
 * Resolve which model a decoded JWT payload refers to.
 * Prefers the signed `kind` claim; falls back to `role` for tokens
 * issued before the split (same string values).
 * Returns null when the kind is unknown/missing.
 */
export const modelForToken = (decoded) => {
  if (!decoded) return null;
  const kind = decoded.kind || decoded.role;
  return (kind && KIND_MODELS[kind]) || null;
};

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, {
        statusCode: 401,
        message: "Not authorized, no token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const Model = modelForToken(decoded);
    if (!Model) {
      return sendError(res, { statusCode: 401, message: "Invalid or expired token" });
    }

    const account = await Model.findById(decoded.id).select("-password");

    // Inactive accounts must not maintain an authenticated session —
    // this check was missing before the split (only login checked isActive).
    if (!account || account.isActive === false) {
      return sendError(res, {
        statusCode: 401,
        message: "Account associated with token no longer exists",
      });
    }

    if (decoded.ver !== undefined && decoded.ver !== (account.tokenVersion || 0)) {
      return sendError(res, {
        statusCode: 401,
        message: "Session has been revoked",
      });
    }

    const passwordChangeAllowed = [
      "/api/auth/me",
      "/api/auth/change-password",
    ].some((path) => req.originalUrl === path || req.originalUrl.startsWith(`${path}?`));
    if (account.mustChangePassword && !passwordChangeAllowed) {
      return sendError(res, {
        statusCode: 403,
        message: "Password change required before using this account",
        errors: ["PASSWORD_CHANGE_REQUIRED"],
      });
    }

    req.user = account;
    // role comes from the signed token (kind === role for our JWTs).
    req.role = decoded.role || decoded.kind;
    req.kind = decoded.kind || decoded.role;
    next();
  } catch (error) {
    return sendError(res, { statusCode: 401, message: "Invalid or expired token" });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, { statusCode: 401, message: "Not authenticated" });
    }
    if (!roles.includes(req.role)) {
      return sendError(res, {
        statusCode: 403,
        message: "Access denied: insufficient permissions",
      });
    }
    next();
  };
};

/**
 * Staff-only serving guard (Phase 13 / WP5).
 *
 * Locked decision: only Staff may serve tickets. Managers oversee the
 * branch (create staff, counters, close/open day) but do NOT serve;
 * admins are bank-scoped operators and also do not serve.
 * `Ticket.servedBy` stays `ref: "Staff"` for the same reason.
 *
 * Use on every serve action (call-next, call, complete, skip) so a
 * manager/admin JWT gets a clear 403 even if a route mis-wires authorize().
 */
export const requireStaffServing = (req, res, next) => {
  const kind = req.kind || req.role;
  if (kind === "staff") {
    return next();
  }
  if (kind === "manager") {
    return sendError(res, {
      statusCode: 403,
      message: "Managers cannot serve tickets",
    });
  }
  return sendError(res, {
    statusCode: 403,
    message: "Only staff can serve tickets",
  });
};
