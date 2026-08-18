import Staff from "../models/staff.model.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../services/email.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const createStaff = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Manager can only create plain "staff" in their own branch; admin can set both freely
    const role = req.role === "manager" ? "staff" : req.body.role;
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

    const staff = await Staff.create({ name, email, password, role, branch });

    await sendEmail({
      to: staff.email,
      subject: "Staff Account Created",
      html: `<h2>Welcome to the Queue System</h2><p>Your staff account has been created.</p><p><b>Email:</b> ${staff.email}</p><p><b>Role:</b> ${staff.role}</p><p><b>Branch:</b> ${staff.branch}</p><p>Please log in and change your password.</p>`,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Staff account created successfully",
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
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

    const token = jwt.sign(
      { id: staff._id, role: staff.role },
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
          role: staff.role,
          branch: staff.branch,
          counter: staff.counter,
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
    const filter = { isActive: true };
    if (req.role === "manager") {
      filter.branch = req.user.branch;
    }

    const staffs = await Staff.find(filter).populate("branch", "name location");
    return sendSuccess(res, {
      statusCode: 200,
      message: "Staff fetched successfully",
      data: staffs,
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
      { new: true },
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
      if (target.role === "manager") {
        return sendError(res, {
          statusCode: 403,
          message: "Managers cannot deactivate other managers",
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
