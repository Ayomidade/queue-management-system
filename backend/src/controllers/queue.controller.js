import Queue from "../models/queue.model.js";
import Branch from "../models/branch.model.js";
import { sendSuccess } from "../utils/response.js";
import { parsePagination, paginatedResponse } from "../utils/pagination.js";

const branchAllowed = async (req, branchId) => {
  if (req.bankName) {
    return (req.bankBranchIds || []).some(
      (branch) => String(branch._id || branch) === String(branchId),
    );
  }
  if (req.role === "admin" && req.user?.bank) {
    return Boolean(await Branch.exists({ _id: branchId, bank: req.user.bank }));
  }
  if (req.role === "manager") {
    return String(req.user.branch) === String(branchId);
  }
  return true;
};

export const createQueue = async (req, res, next) => {
  try {
    const { serviceName, branch } = req.body;
    if (!(await branchAllowed(req, branch))) {
      return sendError(res, { statusCode: 403, message: "Branch is outside your tenant" });
    }
    const queue = await Queue.create({ serviceName, branch });
    return sendSuccess(res, {
      statusCode: 201,
      message: "Queue created successfully",
      data: queue,
    });
  } catch (error) {
    next(error);
  }
};

export const getBranchQueues = async (req, res, next) => {
  try {
    const filter = { isActive: true };

    if (req.bankName) {
      filter.branch = { $in: (req.bankBranchIds || []).map((branch) => branch._id || branch) };
    } else if (req.role === "manager" || req.role === "staff") {
      filter.branch = req.user.branch;
    } else if (req.role === "admin" && req.user?.bank) {
      const branches = await Branch.find({ bank: req.user.bank }).select("_id");
      filter.branch = { $in: branches.map((branch) => branch._id) };
    } else if (req.query.branchId) {
      filter.branch = req.query.branchId;
    }

    const { page, limit, skip } = parsePagination(req.query);
    const [total, queues] = await Promise.all([
      Queue.countDocuments(filter),
      Queue.find(filter).populate("branch", "name location").skip(skip).limit(limit),
    ]);
    return sendSuccess(res, {
      statusCode: 200,
      message: "Queues fetched successfully",
      ...paginatedResponse(queues, total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

export const updateQueue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await Queue.findById(id);
    if (!existing || !(await branchAllowed(req, existing.branch))) {
      const error = new Error("Queue not found");
      error.statusCode = 404;
      return next(error);
    }
    const updates = {};
    if (req.body.serviceName !== undefined) updates.serviceName = req.body.serviceName;
    if (Object.keys(updates).length === 0) {
      const error = new Error("No valid fields provided for update");
      error.statusCode = 400;
      return next(error);
    }
    const queue = await Queue.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!queue) {
      const error = new Error("Queue not found");
      error.statusCode = 404;
      return next(error);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Queue updated successfully",
      data: queue,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQueue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const queue = await Queue.findById(id);

    if (!queue || !(await branchAllowed(req, queue.branch))) {
      const error = new Error("Queue not found");
      error.statusCode = 404;
      return next(error);
    }

    await queue.deleteOne();
    return sendSuccess(res, {
      statusCode: 200,
      message: "Queue deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
