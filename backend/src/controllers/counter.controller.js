import Counter from "../models/counter.model.js";
import Branch from "../models/branch.model.js";
import Staff from "../models/staff.model.js";
import { sendSuccess } from "../utils/response.js";

export const createCounter = async (req, res, next) => {
  try {
    const { label, branch } = req.body;
    const branchExists = await Branch.findById(branch);

    if (!branchExists) {
      const error = new Error("Branch not found.");
      error.statusCode = 404;
      return next(error);
    }

    const counter = await Counter.create({ label, branch });
    return sendSuccess(res, {
      statusCode: 201,
      message: "Counter created successfully",
      data: counter,
    });
  } catch (error) {
    next(error);
  }
};

export const getCounterById = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const counters = await Counter.find({ branch: branchId });
    return sendSuccess(res, {
      statusCode: 200,
      message: "Counters fetched successfully",
      data: counters,
    });
  } catch (error) {
    next(error);
  }
};

export const assignStaffToCounter = async (req, res, next) => {
  try {
    const { staffId } = req.body;
    const { counterId } = req.params;

    const staffExists = await Staff.findById(staffId);
    if (!staffExists) {
      const error = new Error("Staff not found.");
      error.statusCode = 404;
      return next(error);
    }

    const existingAssignment = await Counter.findOne({
      assignedStaff: staffId,
    });
    if (existingAssignment) {
      const error = new Error("Staff already assigned to another counter");
      error.statusCode = 400;
      return next(error);
    }

    const counter = await Counter.findByIdAndUpdate(
      counterId,
      { assignedStaff: staffId, isOpen: true },
      { new: true },
    ).populate("assignedStaff", "name email");

    if (!counter) {
      const error = new Error("Counter not found");
      error.statusCode = 404;
      return next(error);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Staff assigned to counter successfully",
      data: counter,
    });
  } catch (error) {
    next(error);
  }
};

export const closeCounter = async (req, res, next) => {
  try {
    const { counterId } = req.params;
    const counter = await Counter.findByIdAndUpdate(
      counterId,
      { isOpen: false, assignedStaff: null },
      { new: true },
    );

    if (!counter) {
      const error = new Error("Counter not found");
      error.statusCode = 404;
      return next(error);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Counter closed successfully",
    });
  } catch (error) {
    next(error);
  }
};
