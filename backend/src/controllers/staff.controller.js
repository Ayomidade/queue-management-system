import Staff from "../models/staff.model.js";
import Queue from "../models/queue.model.js";
import Branch from "../models/branch.model.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../services/email.service.js";
import { getBrandSync } from "../config/brand.config.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { parsePagination, paginatedResponse } from "../utils/pagination.js";
import { generateTempPassword } from "../utils/password.js";

/**
 * Staff controller — JWT /api/staff surface (dashboard, not v1).
 * After the four-model split, this collection holds staff only.
 *
 * Provisioning paths (Phase 13 WP4):
 *   - Creator supplies password → used as-is (mustChangePassword false)
 *   - Creator omits password → server generates temp password, returns
 *     it ONCE as `tempPassword`, mustChangePassword true
 *   - Invite link → invitee sets own password (auth.controller)
 *
 * Bank scoping: managers → own branch; admins → branches where
 * Branch.bank === Admin.bank (403 otherwise).
 */

/** Resolve a safe branch id for createStaff + validate tenant ownership. */
const resolveBranchForCreate = async (req, res) => {
  // Manager: always own branch (never trust body).
  if (req.role === "manager") {
    if (!req.user.branch) {
      sendError(res, {
        statusCode: 400,
        message: "Manager has no branch assigned",
      });
      return null;
    }
    return { branchId: req.user.branch };
  }

  // Admin (or other privileged roles on this router): body.branch required.
  const branchId = req.body.branch;
  if (!branchId) {
    sendError(res, { statusCode: 400, message: "branch is required" });
    return null;
  }

  const branch = await Branch.findById(branchId);
  if (!branch || branch.isActive === false) {
    sendError(res, { statusCode: 404, message: "Branch not found" });
    return null;
  }

  // Admin may only create staff inside their own bank's branches.
  if (req.role === "admin" && req.user.bank && branch.bank !== req.user.bank) {
    sendError(res, {
      statusCode: 403,
      message: "Branch does not belong to your bank",
    });
    return null;
  }

  return { branchId: branch._id };
};

/** Bank filter for list/read ops. Returns null when no scoping applies. */
const bankBranchFilter = async (req) => {
  if (req.role === "manager") {
    return req.user.branch ? { branch: req.user.branch } : { branch: null };
  }
  if (req.role === "admin" && req.user.bank) {
    const branches = await Branch.find({ bank: req.user.bank }).select("_id");
    return { branch: { $in: branches.map((b) => b._id) } };
  }
  return null;
};

/**
 * POST /api/staff — admin or manager creates a staff member.
 * Dual path: body.password if provided; else server temp password
 * returned once in `tempPassword`.
 */
export const createStaff = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const resolved = await resolveBranchForCreate(req, res);
    if (!resolved) return; // sendError already called

    const existingStaff = await Staff.findOne({ email: email.toLowerCase() });
    if (existingStaff) {
      return sendError(res, {
        statusCode: 400,
        message: "Staff with this email already exists",
      });
    }

    // Dual path: explicit password vs server-generated temp password.
    let finalPassword = password;
    let tempPassword = null;
    let mustChange = false;
    if (!finalPassword) {
      tempPassword = generateTempPassword();
      finalPassword = tempPassword;
      mustChange = true;
    }

    const staff = await Staff.create({
      name,
      email,
      password: finalPassword,
      branch: resolved.branchId,
      mustChangePassword: mustChange,
    });

    // Welcome email only — temp password is NEVER emailed (returned once in JSON).
    await sendEmail({
      to: staff.email,
      subject: `Your ${getBrandSync().name} Staff Account is Ready`,
      html: `<h2>Welcome to ${getBrandSync().name}</h2><p>Your staff account has been created for branch <b>${getBrandSync().name}</b>.</p><p><b>Email:</b> ${staff.email}</p><p>Your creator will share your temporary password separately. Please log in and change it.</p>`,
    }).catch(() => {});

    return sendSuccess(res, {
      statusCode: 201,
      message: tempPassword
        ? "Staff created — share the temporary password once"
        : "Staff account created successfully",
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: "staff",
        branch: staff.branch,
        mustChangePassword: staff.mustChangePassword,
        // Only present when the server generated it (one-time display).
        tempPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const loginStaff = async (req, res, next) => {
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
    if (!staff || !staff.isActive) {
      return sendError(res, {
        statusCode: 400,
        message: "Invalid credentials",
      });
    }

    const isMatch = await staff.comparePassword(password);
    if (!isMatch) {
      return sendError(res, {
        statusCode: 400,
        message: "Invalid credentials",
      });
    }

    // kind tells `protect` which collection to load for this token.
    const token = jwt.sign(
      { id: staff._id, kind: "staff", role: "staff" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    return sendSuccess(res, {
      statusCode: 200,
      message: "Login successful",
      data: {
        staff: {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: "staff",
          branch: staff.branch,
          counter: staff.counter,
          isEmailVerified: staff.isEmailVerified,
          mustChangePassword: staff.mustChangePassword,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllStaff = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    // Tenant scoping: manager → own branch; admin → all branches in their bank.
    const scope = await bankBranchFilter(req);
    if (scope) Object.assign(filter, scope);

    filter.isActive = true;

    const [total, staffs] = await Promise.all([
      Staff.countDocuments(filter),
      Staff.find(filter)
        .populate("branch", "name location")
        .populate("counter", "label isOpen")
        .populate("queues", "serviceName")
        .skip(skip)
        .limit(limit),
    ]);
    // Staff docs have no role field — stamp "staff" for API consumers
    // that still read `.role` (frontend list views).
    const items = staffs.map((s) => ({
      ...(typeof s.toObject === "function" ? s.toObject() : s),
      role: "staff",
    }));
    return sendSuccess(res, {
      statusCode: 200,
      message: "Staff fetched successfully",
      ...paginatedResponse(items, total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/staff/:staffId — single staff read with the same tenant guards
 * as the list endpoint (so admins can't fetch another bank's staff).
 */
export const getStaffById = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const staff = await Staff.findById(staffId)
      .populate("branch", "name location")
      .populate("counter", "label isOpen")
      .populate("queues", "serviceName");

    if (!staff) {
      return sendError(res, { statusCode: 404, message: "Staff not found" });
    }

    const scope = await bankBranchFilter(req);
    if (scope) {
      // scope.branch is either an ObjectId or an $in query — match manually.
      const branchId = String(staff.branch?._id ?? staff.branch ?? "");
      let allowed = false;
      if (scope.branch && typeof scope.branch === "object" && scope.branch.$in) {
        allowed = scope.branch.$in.some((id) => String(id) === branchId);
      } else if (scope.branch) {
        allowed = String(scope.branch) === branchId;
      }
      if (!allowed) {
        return sendError(res, {
          statusCode: 404,
          message: "Staff not found",
        });
      }
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Staff fetched successfully",
      data: {
        ...(typeof staff.toObject === "function" ? staff.toObject() : staff),
        role: "staff",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/staff/:staffId/assign — admin only (route enforces).
 * Admin must pick a branch inside their own bank.
 */
export const assignStaffToBranch = async (req, res, next) => {
  try {
    const { branchId } = req.body;
    const { staffId } = req.params;

    if (!branchId) {
      return sendError(res, { statusCode: 400, message: "branchId is required" });
    }

    const branch = await Branch.findById(branchId);
    if (!branch || branch.isActive === false) {
      return sendError(res, { statusCode: 404, message: "Branch not found" });
    }
    if (req.role === "admin" && req.user.bank && branch.bank !== req.user.bank) {
      return sendError(res, {
        statusCode: 403,
        message: "Branch does not belong to your bank",
      });
    }

    const staff = await Staff.findByIdAndUpdate(
      staffId,
      { branch: branch._id },
      { returnDocument: "after" },
    ).populate("branch", "name location");

    if (!staff) {
      return sendError(res, { statusCode: 404, message: "Staff not found" });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Staff assigned to branch successfully",
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/staff/:staffId — soft-deactivate with tenant guards.
 */
export const deactivateStaff = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const target = await Staff.findById(staffId);

    if (!target) {
      return sendError(res, { statusCode: 404, message: "Staff not found" });
    }

    // Manager: own branch only.
    if (req.role === "manager") {
      if (String(target.branch) !== String(req.user.branch)) {
        return sendError(res, {
          statusCode: 403,
          message: "You can only deactivate staff in your own branch",
        });
      }
    }

    // Admin: target must sit in one of their bank's branches.
    if (req.role === "admin" && req.user.bank) {
      const targetBranch = await Branch.findById(target.branch);
      if (!targetBranch || targetBranch.bank !== req.user.bank) {
        return sendError(res, {
          statusCode: 403,
          message: "Staff does not belong to your bank",
        });
      }
    }

    target.isActive = false;
    await target.save();

    return sendSuccess(res, {
      statusCode: 200,
      message: "Staff account deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/staff/:staffId/queues
 * Assign queues to a staff member. Pass `{ queues: [queueId, ...] }`.
 * Managers can only assign queues within their own branch;
 * admins only within their bank's branches.
 */
export const assignQueuesToStaff = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const { queues } = req.body;

    if (!Array.isArray(queues)) {
      return sendError(res, {
        statusCode: 400,
        message: "queues must be an array of queue IDs",
      });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return sendError(res, { statusCode: 404, message: "Staff not found" });
    }

    if (req.role === "manager" && String(staff.branch) !== String(req.user.branch)) {
      return sendError(res, {
        statusCode: 403,
        message: "You can only manage staff in your own branch",
      });
    }

    if (req.role === "admin" && req.user.bank) {
      const staffBranch = await Branch.findById(staff.branch);
      if (!staffBranch || staffBranch.bank !== req.user.bank) {
        return sendError(res, {
          statusCode: 403,
          message: "Staff does not belong to your bank",
        });
      }
    }

    if (queues.length > 0) {
      const validQueues = await Queue.find({
        _id: { $in: queues },
        branch: staff.branch,
      });
      if (validQueues.length !== queues.length) {
        return sendError(res, {
          statusCode: 400,
          message:
            "One or more queue IDs are invalid or belong to a different branch",
        });
      }
    }

    staff.queues = queues;
    await staff.save();
    await staff.populate("queues", "serviceName");

    return sendSuccess(res, {
      statusCode: 200,
      message: "Queues assigned to staff successfully",
      data: {
        id: staff._id,
        name: staff.name,
        queues: staff.queues,
      },
    });
  } catch (error) {
    next(error);
  }
};
