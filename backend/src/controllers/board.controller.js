import mongoose from "mongoose";
import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";
import Branch from "../models/branch.model.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const getBranchBoard = async (req, res, next) => {
  try {
    const { branchId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return sendError(res, { statusCode: 400, message: "Invalid branch ID" });
    }

    const branch = await Branch.findById(branchId).select("name");
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
        .limit(8)
        .select("ticketNumber queue status"),

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

    return sendSuccess(res, {
      statusCode: 200,
      message: "Branch board fetched successfully",
      data: {
        branch: { id: branch._id, name: branch.name },
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
