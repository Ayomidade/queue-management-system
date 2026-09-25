import jwt from "jsonwebtoken";
import Staff from "../models/staff.model.js";
import Admin from "../models/admin.model.js";
import Manager from "../models/manager.model.js";
import Superadmin from "../models/superadmin.model.js";
import Invite from "../models/invite.model.js";
import Branch from "../models/branch.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { validationResult } from "express-validator";

/**
 * Auth controller — Phase 13 WP3.
 *
 * One login endpoint per collection (kind), public admin self-registration,
 * invite issue/redeem for managers and staff, /me, and change-password.
 *
 * JWT payload (all kinds): { id, kind, role } where kind === role.
 * Superadmin login stays at POST /api/platform/login.
 */

const JWT_EXPIRES = () => process.env.JWT_EXPIRES_IN || "1d";

const issueToken = (doc, kind) =>
  jwt.sign(
    { id: doc._id, kind, role: kind },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES() },
  );

/** Safe identity shape returned to the client (no password). */
const identity = (doc, kind, extras = {}) => {
  const base = {
    id: doc._id,
    name: doc.name,
    email: doc.email,
    role: kind,
    kind,
    mustChangePassword: !!doc.mustChangePassword,
  };
  if (kind === "staff") {
    base.branch = doc.branch ?? null;
    base.counter = doc.counter ?? null;
  }
  if (kind === "manager") {
    base.branch = doc.branch ?? null;
    base.bank = doc.bank ?? null;
  }
  if (kind === "admin") {
    base.bank = doc.bank ?? null;
  }
  return { ...base, ...extras };
};

const runValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, {
      statusCode: 400,
      message: "Validation failed",
      errors: errors.array().map((e) => e.msg),
    });
    return false;
  }
  return true;
};

/**
 * Shared login against one collection.
 * Generic 401 for missing account / bad password / inactive (no enumeration).
 */
const loginAgainst = async (Model, kind, req, res, next) => {
  try {
    if (!runValidation(req, res)) return;

    const { email, password } = req.body;
    const doc = await Model.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );

    if (!doc || doc.isActive === false) {
      return sendError(res, { statusCode: 401, message: "Invalid credentials" });
    }

    const isMatch = await doc.comparePassword(password);
    if (!isMatch) {
      return sendError(res, { statusCode: 401, message: "Invalid credentials" });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Login successful",
      data: {
        user: identity(doc, kind),
        token: issueToken(doc, kind),
      },
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/auth/login/staff */
export const loginStaff = (req, res, next) =>
  loginAgainst(Staff, "staff", req, res, next);

/** POST /api/auth/login/manager */
export const loginManager = (req, res, next) =>
  loginAgainst(Manager, "manager", req, res, next);

/** POST /api/auth/login/admin */
export const loginAdmin = (req, res, next) =>
  loginAgainst(Admin, "admin", req, res, next);

/**
 * POST /api/auth/register/admin — PUBLIC, instant.
 * Body: { name, email, password, bankName }
 * Creates an Admin and logs them in immediately (mustChangePassword: false —
 * they chose their own password).
 */
export const registerAdmin = async (req, res, next) => {
  try {
    if (!runValidation(req, res)) return;

    const { name, email, password, bankName } = req.body;

    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendError(res, {
        statusCode: 400,
        message: "An account with this email already exists",
      });
    }

    const admin = await Admin.create({
      name,
      email,
      password,
      bank: bankName,
      mustChangePassword: false,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Bank admin account created",
      data: {
        user: identity(admin, "admin"),
        token: issueToken(admin, "admin"),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/invites/manager — admin only.
 * Issues a bank-scoped single-use invite for a new Manager.
 * bank is forced from the admin's JWT identity (never from the body).
 */
export const createManagerInvite = async (req, res, next) => {
  try {
    if (!runValidation(req, res)) return;

    const bank = req.user.bank;
    if (!bank) {
      return sendError(res, {
        statusCode: 400,
        message: "Admin has no bank — cannot issue manager invites",
      });
    }

    const expiresInDays = req.body.expiresInDays || 7;
    const raw = Invite.generateRawToken();
    const invite = await Invite.create({
      tokenHash: Invite.hashToken(raw),
      kind: "manager",
      bank,
      invitedBy: req.user._id,
      invitedByModel: "Admin",
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Manager invite created — share the link once",
      data: {
        id: invite._id,
        kind: invite.kind,
        bank: invite.bank,
        expiresAt: invite.expiresAt,
        // Raw token returned ONCE — only in this response.
        token: raw,
        path: `/register/manager?token=${raw}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/invites/staff — admin or manager.
 * Manager: branch forced to own. Admin: body.branch required, must be
 * one of the admin's bank branches.
 */
export const createStaffInvite = async (req, res, next) => {
  try {
    if (!runValidation(req, res)) return;

    let branchId;
    let bank = null;

    if (req.role === "manager") {
      branchId = req.user.branch;
      bank = req.user.bank || null;
      if (!branchId) {
        return sendError(res, {
          statusCode: 400,
          message: "Manager has no branch — cannot issue staff invites",
        });
      }
    } else {
      branchId = req.body.branch;
      if (!branchId) {
        return sendError(res, {
          statusCode: 400,
          message: "branch is required",
        });
      }
      const branch = await Branch.findById(branchId);
      if (!branch || branch.isActive === false) {
        return sendError(res, {
          statusCode: 404,
          message: "Branch not found",
        });
      }
      // Admin may only invite into their own bank's branches.
      if (req.user.bank && branch.bank !== req.user.bank) {
        return sendError(res, {
          statusCode: 403,
          message: "Branch does not belong to your bank",
        });
      }
      bank = branch.bank;
    }

    const expiresInDays = req.body.expiresInDays || 7;
    const raw = Invite.generateRawToken();
    const invite = await Invite.create({
      tokenHash: Invite.hashToken(raw),
      kind: "staff",
      bank,
      branch: branchId,
      invitedBy: req.user._id,
      invitedByModel: req.role === "manager" ? "Manager" : "Admin",
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Staff invite created — share the link once",
      data: {
        id: invite._id,
        kind: invite.kind,
        branch: invite.branch,
        expiresAt: invite.expiresAt,
        token: raw,
        path: `/register/staff?token=${raw}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register/manager|staff — redeem invite.
 * `kind` is passed by the route so the path and invite kind must match.
 */
export const registerWithInvite = (kind) => async (req, res, next) => {
  try {
    if (!runValidation(req, res)) return;

    const { token, name, email, password } = req.body;
    const tokenHash = Invite.hashToken(token);

    const invite = await Invite.findOne({ tokenHash });
    if (!invite || invite.usedAt) {
      return sendError(res, {
        statusCode: 400,
        message: "Invite is invalid or already used",
      });
    }
    if (invite.expiresAt < new Date()) {
      return sendError(res, {
        statusCode: 400,
        message: "Invite has expired — ask for a new one",
      });
    }
    if (invite.kind !== kind) {
      return sendError(res, {
        statusCode: 400,
        message: `This invite is for a ${invite.kind}, not a ${kind}`,
      });
    }

    const Model = kind === "manager" ? Manager : Staff;
    const existing = await Model.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendError(res, {
        statusCode: 400,
        message: "An account with this email already exists",
      });
    }

    if (kind === "manager") {
      if (!invite.bank || !invite.branch) {
        return sendError(res, {
          statusCode: 400,
          message: "Manager invite is incomplete (missing bank/branch)",
        });
      }
      const created = await Manager.create({
        name,
        email,
        password,
        branch: invite.branch,
        bank: invite.bank,
        // Invitee chose their own password — no forced rotation.
        mustChangePassword: false,
      });
      invite.usedAt = new Date();
      await invite.save();
      return sendSuccess(res, {
        statusCode: 201,
        message: "Manager account created",
        data: {
          user: identity(created, "manager"),
          token: issueToken(created, "manager"),
        },
      });
    }

    // staff
    if (!invite.branch) {
      return sendError(res, {
        statusCode: 400,
        message: "Staff invite is missing a branch",
      });
    }
    const created = await Staff.create({
      name,
      email,
      password,
      branch: invite.branch,
      mustChangePassword: false,
    });
    invite.usedAt = new Date();
    await invite.save();
    return sendSuccess(res, {
      statusCode: 201,
      message: "Staff account created",
      data: {
        user: identity(created, "staff"),
        token: issueToken(created, "staff"),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me — any kind (protect sets req.user + req.role/kind).
 */
export const getAuthMe = async (req, res, next) => {
  try {
    const kind = req.kind || req.role;
    return sendSuccess(res, {
      statusCode: 200,
      message: "Current identity",
      data: identity(req.user, kind),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-password — any kind (protect first).
 * Clears mustChangePassword after a successful rotation.
 */
export const changePassword = async (req, res, next) => {
  try {
    if (!runValidation(req, res)) return;

    const { currentPassword, newPassword } = req.body;
    if (currentPassword === newPassword) {
      return sendError(res, {
        statusCode: 400,
        message: "New password must be different from current password",
      });
    }

    const kind = req.kind || req.role;
    const Model =
      kind === "admin"
        ? Admin
        : kind === "manager"
          ? Manager
          : kind === "superadmin"
            ? Superadmin
            : Staff;

    const account = await Model.findById(req.user._id).select("+password");
    if (!account) {
      return sendError(res, { statusCode: 404, message: "Account not found" });
    }

    const isMatch = await account.comparePassword(currentPassword);
    if (!isMatch) {
      return sendError(res, {
        statusCode: 400,
        message: "Current password is incorrect",
      });
    }

    account.password = newPassword;
    account.mustChangePassword = false;
    await account.save();

    return sendSuccess(res, {
      statusCode: 200,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};
