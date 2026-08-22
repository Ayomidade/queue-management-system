import mongoose from "mongoose";
import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";
import Branch from "../models/branch.model.js";
import Counter from "../models/counter.model.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const getAllBoards = async (req, res, next) => {
  try {
    const branches = await Branch.find({ isActive: true })
      .select("name location")
      .sort({ name: 1 });

    if (branches.length === 0) {
      return sendSuccess(res, {
        statusCode: 200,
        message: "No active branches",
        data: [],
      });
    }

    const branchIds = branches.map((b) => b._id);

    const [waitingCounts, counterCounts, calledCounts] = await Promise.all([
      Ticket.aggregate([
        { $match: { branch: { $in: branchIds }, status: "waiting" } },
        { $group: { _id: { branch: "$branch", queue: "$queue" }, waiting: { $sum: 1 } } },
      ]),
      Counter.aggregate([
        { $match: { branch: { $in: branchIds } } },
        {
          $group: {
            _id: "$branch",
            total: { $sum: 1 },
            open: { $sum: { $cond: ["$isOpen", 1, 0] } },
          },
        },
      ]),
      Ticket.aggregate([
        { $match: { branch: { $in: branchIds }, status: "called" } },
        { $group: { _id: "$branch", called: { $sum: 1 } } },
      ]),
    ]);

    const queueIds = [
      ...new Set(waitingCounts.map((w) => String(w._id.queue))),
    ];
    const queueDocs = await Queue.find({ _id: { $in: queueIds } }).select(
      "serviceName",
    );
    const serviceNameById = queueDocs.reduce(
      (map, q) => ({ ...map, [q._id.toString()]: q.serviceName }),
      {},
    );

    // Build per-branch summaries
    const waitingByBranch = {};
    waitingCounts.forEach((w) => {
      const branchId = String(w._id.branch);
      if (!waitingByBranch[branchId]) waitingByBranch[branchId] = [];
      waitingByBranch[branchId].push({
        serviceName: serviceNameById[String(w._id.queue)] || "Unknown",
        waiting: w.waiting,
      });
    });

    const counterMap = counterCounts.reduce(
      (map, c) => ({ ...map, [String(c._id)]: c }),
      {},
    );
    const calledMap = calledCounts.reduce(
      (map, c) => ({ ...map, [String(c._id)]: c.called }),
      {},
    );

    const boards = branches.map((b) => {
      const id = String(b._id);
      const queues = waitingByBranch[id] || [];
      const totalWaiting = queues.reduce((sum, q) => sum + q.waiting, 0);
      const counters = counterMap[id] || { total: 0, open: 0 };

      return {
        branch: { id: b._id, name: b.name, location: b.location },
        totalWaiting,
        called: calledMap[id] || 0,
        queues,
        counters: { total: counters.total, open: counters.open },
      };
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "All boards fetched successfully",
      data: boards,
    });
  } catch (error) {
    next(error);
  }
};

export const getBranchBoard = async (req, res, next) => {
  try {
    const { branchId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return sendError(res, { statusCode: 400, message: "Invalid branch ID" });
    }

    const branch = await Branch.findById(branchId).select("name dayOpen lastOpenedAt lastClosedAt");
    if (!branch) {
      const error = new Error("Branch not found");
      error.statusCode = 404;
      return next(error);
    }

    const branchObjectId = new mongoose.Types.ObjectId(branchId);

    const [calledTickets, recentTickets, waitingCounts] = await Promise.all([
      Ticket.find({ branch: branchId, status: "called" })
        .sort({ calledAt: -1 })
        .limit(12)
        .populate({
          path: "servedBy",
          select: "counter",
          populate: { path: "counter", select: "label" },
        })
        .select("ticketNumber queue calledAt priority servedBy"),

      Ticket.find({
        branch: branchId,
        status: { $in: ["completed", "skipped"] },
      })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select("ticketNumber queue status updatedAt"),

      Ticket.aggregate([
        { $match: { branch: branchObjectId, status: "waiting" } },
        { $group: { _id: "$queue", waiting: { $sum: 1 } } },
      ]),
    ]);

    const queueIds = [
      ...new Set([
        ...calledTickets.map((t) => String(t.queue)),
        ...recentTickets.map((t) => String(t.queue)),
        ...waitingCounts.map((w) => String(w._id)),
      ]),
    ];
    const queueDocs = await Queue.find({ _id: { $in: queueIds } }).select(
      "serviceName",
    );
    const serviceNameById = queueDocs.reduce(
      (map, q) => ({ ...map, [q._id.toString()]: q.serviceName }),
      {},
    );

    const totalWaiting = waitingCounts.reduce((sum, w) => sum + w.waiting, 0);

    return sendSuccess(res, {
      statusCode: 200,
      message: "Branch board fetched successfully",
      data: {
        branch: {
          id: branch._id,
          name: branch.name,
          dayOpen: branch.dayOpen,
          lastOpenedAt: branch.lastOpenedAt,
          lastClosedAt: branch.lastClosedAt,
        },
        totalWaiting,
        nowServing: calledTickets.map((t) => ({
          ticketNumber: t.ticketNumber,
          serviceName: serviceNameById[String(t.queue)] || "Unknown",
          priority: t.priority,
          counterLabel: t.servedBy?.counter?.label || null,
        })),
        recentlyServed: recentTickets.map((t) => ({
          ticketNumber: t.ticketNumber,
          serviceName: serviceNameById[String(t.queue)] || "Unknown",
          status: t.status,
        })),
        queueLengths: waitingCounts.map((w) => ({
          serviceName: serviceNameById[String(w._id)] || "Unknown",
          waiting: w.waiting,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
