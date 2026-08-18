import Queue from "../models/queue.model.js";
import { sendSuccess } from "../utils/response.js";

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
    const queues = await Queue.find({ isActive: true }).populate(
      "branch",
      "name location",
    );
    return sendSuccess(res, {
      statusCode: 200,
      message: "Queues fetched successfully",
      data: queues,
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
