import Staff from "../models/staff.model.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../services/email.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const createStaff = async (req, res, next) => {
  try {
    const { name, email, password, role, branch } = req.body;

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
      html: `<h2>Welcome to the Queue System</h2>
      <p>Your staff account has been created.</p>
      <p><b>Email:</b> ${staff.email}</p>
      <p><b>Role:</b> ${staff.role}</p>`,
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
    const staffs = await Staff.find({ isActive: true }).populate(
      "branch",
      "name location",
    );
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
    const staff = await Staff.findByIdAndUpdate(
      staffId,
      { isActive: false },
      { new: true },
    );

    if (!staff) {
      const error = new Error("Staff not found");
      error.statusCode = 404;
      return next(error);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Staff account deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
};
