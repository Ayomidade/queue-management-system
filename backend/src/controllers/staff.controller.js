import Staff from "../models/staff.model.js";
import Queue from "../models/queue.model.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../services/email.service.js";
import { getBrandSync } from "../config/brand.config.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { parsePagination, paginatedResponse } from "../utils/pagination.js";

export const createStaff = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Staff collection holds only staff after the four-model split —
    // managers are created via the Manager model (WP4), admins self-register.
    // Branch is forced to the creator's branch for managers; admins pick one.
    const branch = req.role === "manager" ? req.user.branch : req.body.branch;

    if (!branch) {
      return sendError(res, { statusCode: 400, message: "branch is required" });
    }

    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) {
      const error = new Error("Staff with this email already exists");
      error.statusCode = 400;
      return next(error);
    }

    const staff = await Staff.create({ name, email, password, branch });

    await sendEmail({
      to: staff.email,
      subject: `Your ${getBrandSync().name} Staff Account is Ready`,
      html: `<h2>Welcome to ${getBrandSync().name}</h2><p>Your staff account has been created.</p><p><b>Email:</b> ${staff.email}</p><p>Please log in and change your password.</p>`,
    }).catch(() => {});

    return sendSuccess(res, {
      statusCode: 201,
      message: "Staff account created successfully",
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: "staff",
        branch: staff.branch,
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

    const staff = await Staff.findOne({ email }).select("+password");
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

    // Staff collection = staff role after the four-model split.
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
    if (req.role === "manager") {
      filter.branch = req.user.branch;
    }
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

export const assignStaffToBranch = async (req, res, next) => {
  try {
    const { branchId } = req.body;
    const { staffId } = req.params;

    const staff = await Staff.findByIdAndUpdate(
      staffId,
      { branch: branchId },
      { returnDocument: "after" },
    ).populate("branch", "name location");

    if (!staff) {
      const error = new Error("Staff not found");
      error.statusCode = 404;
      return next(error);
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

export const deactivateStaff = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const target = await Staff.findById(staffId);

    if (!target) {
      const error = new Error("Staff not found");
      error.statusCode = 404;
      return next(error);
    }

      if (req.role === "manager") {
        if (String(target.branch) !== String(req.user.branch)) {
          return sendError(res, {
            statusCode: 403,
            message: "You can only deactivate staff in your own branch",
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
 * PATCH /api/v1/staff/:staffId/queues
 * Assign queues to a staff member. Pass `{ queues: [queueId, ...] }`.
 * Managers can only assign queues within their own branch.
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
      const error = new Error("Staff not found");
      error.statusCode = 404;
      return next(error);
    }

    if (req.role === "manager" && String(staff.branch) !== String(req.user.branch)) {
      return sendError(res, {
        statusCode: 403,
        message: "You can only manage staff in your own branch",
      });
    }

    if (queues.length > 0) {
      const validQueues = await Queue.find({
        _id: { $in: queues },
        branch: staff.branch,
      });
      if (validQueues.length !== queues.length) {
        return sendError(res, {
          statusCode: 400,
          message: "One or more queue IDs are invalid or belong to a different branch",
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
