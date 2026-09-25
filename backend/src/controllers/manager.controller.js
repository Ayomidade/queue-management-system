import Manager from "../models/manager.model.js";
import Branch from "../models/branch.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { parsePagination, paginatedResponse } from "../utils/pagination.js";
import { generateTempPassword } from "../utils/password.js";

/**
 * Manager controller — Phase 13 WP4.
 *
 * Managers live in their own collection (no `role` field). Creation paths:
 *   1. Admin creates with a body password → used as-is.
 *   2. Admin omits password → server generates Cue-XXXXXX-XXXXXX,
 *      returns it ONCE as `tempPassword`, sets mustChangePassword: true.
 *   3. Admin issues an invite link → invitee sets their own password (auth.controller).
 *
 * Bank is always denormalized from Branch.bank (never taken from the body).
 * Admins may only manage branches inside their own bank.
 */

/** Load branch + enforce it belongs to the admin's bank (admins only). */
const assertBranchInAdminBank = async (branchId, req) => {
  const branch = await Branch.findById(branchId);
  if (!branch || branch.isActive === false) {
    return { error: "Branch not found", statusCode: 404 };
  }
  if (req.user.bank && branch.bank !== req.user.bank) {
    return { error: "Branch does not belong to your bank", statusCode: 403 };
  }
  return { branch };
};

/**
 * POST /api/managers — admin only (route already authorize("admin")).
 * Body: { name, email, password?, branch }
 */
export const createManager = async (req, res, next) => {
  try {
    const { name, email, password, branch } = req.body;

    const check = await assertBranchInAdminBank(branch, req);
    if (check.error) {
      return sendError(res, {
        statusCode: check.statusCode,
        message: check.error,
      });
    }

    const existing = await Manager.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendError(res, {
        statusCode: 400,
        message: "Manager with this email already exists",
      });
    }

    // Dual path: explicit password (legacy UI) vs server-generated temp password.
    let finalPassword = password;
    let tempPassword = null;
    let mustChange = false;
    if (!finalPassword) {
      tempPassword = generateTempPassword();
      finalPassword = tempPassword;
      mustChange = true;
    }

    const manager = await Manager.create({
      name,
      email,
      password: finalPassword,
      branch: check.branch._id,
      // Denormalized tenant — same value Branch.bank holds.
      bank: check.branch.bank,
      mustChangePassword: mustChange,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: tempPassword
        ? "Manager created — share the temporary password once"
        : "Manager created successfully",
      data: {
        id: manager._id,
        name: manager.name,
        email: manager.email,
        role: "manager",
        branch: manager.branch,
        bank: manager.bank,
        mustChangePassword: manager.mustChangePassword,
        // Returned ONLY when the server generated it — never stored in plain text.
        tempPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/managers — admin only; bank-scoped to the admin's tenant.
 */
export const getAllManagers = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { isActive: true };
    // Admin bank scoping (Manager.bank is denormalized at creation).
    if (req.user.bank) {
      filter.bank = req.user.bank;
    }

    const [total, managers] = await Promise.all([
      Manager.countDocuments(filter),
      Manager.find(filter)
        .populate("branch", "name location")
        .skip(skip)
        .limit(limit),
    ]);

    const items = managers.map((m) => ({
      ...(typeof m.toObject === "function" ? m.toObject() : m),
      role: "manager",
    }));

    return sendSuccess(res, {
      statusCode: 200,
      message: "Managers fetched successfully",
      ...paginatedResponse(items, total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/managers/:managerId/branch — admin reassigns branch.
 * Body: { branchId }
 * Bank is re-denormalized from the new branch.
 */
export const assignManagerBranch = async (req, res, next) => {
  try {
    const { branchId } = req.body;
    const { managerId } = req.params;

    const check = await assertBranchInAdminBank(branchId, req);
    if (check.error) {
      return sendError(res, {
        statusCode: check.statusCode,
        message: check.error,
      });
    }

    const manager = await Manager.findById(managerId);
    if (!manager) {
      return sendError(res, { statusCode: 404, message: "Manager not found" });
    }
    // Cross-bank guard: admin cannot touch another bank's manager.
    if (req.user.bank && manager.bank !== req.user.bank) {
      return sendError(res, {
        statusCode: 403,
        message: "Manager does not belong to your bank",
      });
    }

    manager.branch = check.branch._id;
    manager.bank = check.branch.bank;
    await manager.save();
    await manager.populate("branch", "name location");

    return sendSuccess(res, {
      statusCode: 200,
      message: "Manager assigned to branch successfully",
      data: {
        id: manager._id,
        name: manager.name,
        branch: manager.branch,
        bank: manager.bank,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/managers/:managerId — soft-deactivate (admin).
 */
export const deactivateManager = async (req, res, next) => {
  try {
    const { managerId } = req.params;
    const target = await Manager.findById(managerId);

    if (!target) {
      return sendError(res, { statusCode: 404, message: "Manager not found" });
    }
    if (req.user.bank && target.bank !== req.user.bank) {
      return sendError(res, {
        statusCode: 403,
        message: "Manager does not belong to your bank",
      });
    }

    target.isActive = false;
    await target.save();

    return sendSuccess(res, {
      statusCode: 200,
      message: "Manager deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
};
