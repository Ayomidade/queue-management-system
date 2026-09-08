import Queue from "../models/queue.model.js";
import { sendSuccess } from "../utils/response.js";
import { parsePagination, paginatedResponse } from "../utils/pagination.js";

export const createQueue = async (req, res, next) => {
  try {
    const { serviceName, branch } = req.body;
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

    // Admin sees all queues; manager/staff see only their branch
    if (req.role === "manager" || req.role === "staff") {
      filter.branch = req.user.branch;
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
    // FIX: was Queue.findByIdUpdate — not a real Mongoose method, threw on every call
    const queue = await Queue.findByIdAndUpdate(id, req.body, {
      new: true,
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

    if (!queue) {
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
