import Counter from "../models/counter.model.js";
import Branch from "../models/branch.model.js";
import Staff from "../models/staff.model.js";
import { sendSuccess, sendError } from "../utils/response.js";

const canManageBranchCounter = (req, counter) => {
  if (req.role === "admin") return true;
  if (req.role === "manager")
    return String(counter.branch) === String(req.user.branch);
  return false;
};

export const createCounter = async (req, res, next) => {
  try {
    const { label } = req.body;
    const branch = req.role === "manager" ? req.user.branch : req.body.branch;

    if (!branch) {
      return sendError(res, { statusCode: 400, message: "branch is required" });
    }

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

    if (req.role === "manager" && String(req.user.branch) !== branchId) {
      return sendError(res, {
        statusCode: 403,
        message: "You can only view counters in your own branch",
      });
    }

    const counters = await Counter.find({ branch: branchId }).populate(
      "assignedStaff",
      "name email",
    );
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

    const staffMember = await Staff.findById(staffId);
    if (!staffMember) {
      const error = new Error("Staff not found.");
      error.statusCode = 404;
      return next(error);
    }

    const counter = await Counter.findById(counterId);
    if (!counter) {
      const error = new Error("Counter not found");
      error.statusCode = 404;
      return next(error);
    }

    const managerCanTouchStaff =
      req.role !== "manager" ||
      String(staffMember.branch) === String(req.user.branch);
    if (!canManageBranchCounter(req, counter) || !managerCanTouchStaff) {
      return sendError(res, {
        statusCode: 403,
        message: "You can only manage counters and staff in your own branch",
      });
    }

    const existingAssignment = await Counter.findOne({
      assignedStaff: staffId,
      _id: { $ne: counterId },
    });
    if (existingAssignment) {
      const error = new Error("Staff already assigned to another counter");
      error.statusCode = 400;
      return next(error);
    }

    counter.assignedStaff = staffId;
    counter.isOpen = true;
    await counter.save();
    await counter.populate("assignedStaff", "name email");

    return sendSuccess(res, {
      statusCode: 200,
      message: "Staff assigned to counter successfully",
      data: counter,
    });
  } catch (error) {
    next(error);
  }
};

// Pull a staff member off a counter without assigning a replacement
export const unassignStaffFromCounter = async (req, res, next) => {
  try {
    const counter = await Counter.findById(req.params.counterId);
    if (!counter) {
      const error = new Error("Counter not found");
      error.statusCode = 404;
      return next(error);
    }
    if (!canManageBranchCounter(req, counter)) {
      return sendError(res, {
        statusCode: 403,
        message: "You can only manage counters in your own branch",
      });
    }

    counter.assignedStaff = null;
    await counter.save();

    return sendSuccess(res, {
      statusCode: 200,
      message: "Staff unassigned from counter",
      data: counter,
    });
  } catch (error) {
    next(error);
  }
};

export const closeCounter = async (req, res, next) => {
  try {
    const counter = await Counter.findById(req.params.counterId);
    if (!counter) {
      const error = new Error("Counter not found");
      error.statusCode = 404;
      return next(error);
    }

    // FIX: previously any staff member could close any counter by ID
    const isOwnCounter =
      req.role === "staff" &&
      String(req.user.counter) === String(req.params.counterId);
    if (!isOwnCounter && !canManageBranchCounter(req, counter)) {
      return sendError(res, {
        statusCode: 403,
        message: "You can only close your own assigned counter",
      });
    }

    counter.isOpen = false;
    await counter.save();

    return sendSuccess(res, {
      statusCode: 200,
      message: "Counter closed successfully",
      data: counter,
    });
  } catch (error) {
    next(error);
  }
};

// Manager/admin only — reopen a counter without needing to reassign staff
export const openCounter = async (req, res, next) => {
  try {
    const counter = await Counter.findById(req.params.counterId);
    if (!counter) {
      const error = new Error("Counter not found");
      error.statusCode = 404;
      return next(error);
    }
    if (!canManageBranchCounter(req, counter)) {
      return sendError(res, {
        statusCode: 403,
        message: "You can only manage counters in your own branch",
      });
    }

    counter.isOpen = true;
    await counter.save();

    return sendSuccess(res, {
      statusCode: 200,
      message: "Counter opened successfully",
      data: counter,
    });
  } catch (error) {
    next(error);
  }
};
