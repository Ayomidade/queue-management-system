import Branch from "../models/branch.model.js";
import Queue from "../models/queue.model.js";
import Counter from "../models/counter.model.js";
import Ticket from "../models/ticket.model.js";
import { sendSuccess } from "../utils/response.js";

export const createBranch = async (req, res, next) => {
  try {
    const { name, location } = req.body;
    const branch = await Branch.create({ name, location });
    return sendSuccess(res, {
      statusCode: 201,
      message: "Branch created successfully",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find({ isActive: true }).sort({
      createdAt: -1,
    });
    return sendSuccess(res, {
      statusCode: 200,
      message: "Branches fetched successfully",
      data: branches,
    });
  } catch (error) {
    next(error);
  }
};

export const getSingleBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);

    if (!branch) {
      const error = new Error("Branch not found");
      error.statusCode = 404;
      return next(error);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Branch fetched successfully",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);

    if (!branch) {
      const error = new Error("Branch not found");
      error.statusCode = 404;
      return next(error);
    }

    await branch.deleteOne();
    return sendSuccess(res, {
      statusCode: 200,
      message: "Branch deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicBranch = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const branch = await Branch.findById(branchId).select("name location isActive");

    if (!branch || !branch.isActive) {
      const error = new Error("Branch not found");
      error.statusCode = 404;
      return next(error);
    }

    const [queues, counters, waitingCounts] = await Promise.all([
      Queue.find({ branch: branchId, isActive: true }).select("serviceName lastTicketNumber"),
      Counter.find({ branch: branchId }).select("label isOpen"),
      Ticket.aggregate([
        { $match: { branch: branch._id, status: "waiting" } },
        { $group: { _id: "$queue", waiting: { $sum: 1 } } },
      ]),
    ]);

    const waitingMap = waitingCounts.reduce(
      (map, w) => ({ ...map, [w._id.toString()]: w.waiting }),
      {},
    );

    return sendSuccess(res, {
      statusCode: 200,
      message: "Branch info fetched successfully",
      data: {
        branch: {
          id: branch._id,
          name: branch.name,
          location: branch.location,
        },
        queues: queues.map((q) => ({
          id: q._id,
          serviceName: q.serviceName,
          waiting: waitingMap[q._id.toString()] || 0,
        })),
        counters: {
          total: counters.length,
          open: counters.filter((c) => c.isOpen).length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
