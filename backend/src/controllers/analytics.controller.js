import mongoose from "mongoose";
import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";
import Counter from "../models/counter.model.js";
import Staff from "../models/staff.model.js";
import { sendSuccess, sendError } from "../utils/response.js";

const canAccessBranch = (req, branchId) => {
  if (req.role === "admin") return true;
  return String(req.user.branch) === branchId;
};

const getDayRange = (dateInput) => {
  const start = dateInput ? new Date(dateInput) : new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getStaffPerformance = async (branchObjectId, start, end) => {
  const staffAgg = await Ticket.aggregate([
    {
      $match: {
        branch: branchObjectId,
        status: "completed",
        servedBy: { $ne: null },
        createdAt: { $gte: start, $lte: end },
      },
    },
    { $group: { _id: "$servedBy", ticketsServed: { $sum: 1 } } },
    { $sort: { ticketsServed: -1 } },
  ]);

  const staffDocs = await Staff.find({
    _id: { $in: staffAgg.map((e) => e._id) },
  }).select("name");
  const nameById = staffDocs.reduce(
    (map, s) => ({ ...map, [s._id.toString()]: s.name }),
    {},
  );

  return staffAgg.map((entry) => ({
    staffId: entry._id,
    name: nameById[entry._id.toString()] || "Unknown",
    ticketsServed: entry.ticketsServed,
  }));
};

// Live dashboard: current queue lengths, today's counts, average wait, counter status
export const getBranchAnalytics = async (req, res, next) => {
  try {
    const { branchId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return sendError(res, { statusCode: 400, message: "Invalid branch ID" });
    }
    if (!canAccessBranch(req, branchId)) {
      return sendError(res, {
        statusCode: 403,
        message: "You can only view analytics for your own branch",
      });
    }

    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    const { start, end } = getDayRange();

    const [queueCounts, statusCounts, waitAgg, counters] = await Promise.all([
      Ticket.aggregate([
        { $match: { branch: branchObjectId, status: "waiting" } },
        { $group: { _id: "$queue", waiting: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        {
          $match: {
            branch: branchObjectId,
            createdAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        {
          $match: {
            branch: branchObjectId,
            createdAt: { $gte: start, $lte: end },
            calledAt: { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            avgWaitMs: { $avg: { $subtract: ["$calledAt", "$createdAt"] } },
          },
        },
      ]),
      Counter.find({ branch: branchId }),
    ]);

    const queueDocs = await Queue.find({
      _id: { $in: queueCounts.map((e) => e._id) },
    }).select("serviceName");
    const serviceNameById = queueDocs.reduce(
      (map, q) => ({ ...map, [q._id.toString()]: q.serviceName }),
      {},
    );

    const queueLengths = queueCounts.map((entry) => ({
      queueId: entry._id,
      serviceName: serviceNameById[entry._id.toString()] || "Unknown",
      waiting: entry.waiting,
    }));

    const counts = statusCounts.reduce(
      (acc, entry) => ({ ...acc, [entry._id]: entry.count }),
      {},
    );

    return sendSuccess(res, {
      statusCode: 200,
      message: "Branch analytics fetched successfully",
      data: {
        queueLengths,
        ticketsToday: {
          waiting: counts.waiting || 0,
          called: counts.called || 0,
          completed: counts.completed || 0,
          skipped: counts.skipped || 0,
          cancelled: counts.cancelled || 0,
        },
        averageWaitMinutes: waitAgg.length
          ? Math.round(waitAgg[0].avgWaitMs / 60000)
          : 0,
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

// End-of-day summary for a branch and date (defaults to today)
export const getBranchDailyReport = async (req, res, next) => {
  try {
    const { branchId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return sendError(res, { statusCode: 400, message: "Invalid branch ID" });
    }
    if (!canAccessBranch(req, branchId)) {
      return sendError(res, {
        statusCode: 403,
        message: "You can only view reports for your own branch",
      });
    }

    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    const { start, end } = getDayRange(req.query.date);

    const [statusCounts, busiestQueueAgg, staffPerformance] = await Promise.all(
      [
        Ticket.aggregate([
          {
            $match: {
              branch: branchObjectId,
              createdAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Ticket.aggregate([
          {
            $match: {
              branch: branchObjectId,
              createdAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: "$queue", total: { $sum: 1 } } },
          { $sort: { total: -1 } },
          { $limit: 1 },
        ]),
        getStaffPerformance(branchObjectId, start, end),
      ],
    );

    const counts = statusCounts.reduce(
      (acc, entry) => ({ ...acc, [entry._id]: entry.count }),
      {},
    );

    let busiestService = null;
    if (busiestQueueAgg.length) {
      const queueDoc = await Queue.findById(busiestQueueAgg[0]._id).select(
        "serviceName",
      );
      busiestService = {
        serviceName: queueDoc ? queueDoc.serviceName : "Unknown",
        ticketCount: busiestQueueAgg[0].total,
      };
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Daily branch report generated successfully",
      data: {
        date: start.toISOString().slice(0, 10),
        ticketsIssued: Object.values(counts).reduce((sum, n) => sum + n, 0),
        completed: counts.completed || 0,
        noShows: counts.skipped || 0,
        cancelled: counts.cancelled || 0,
        busiestService,
        staffPerformance,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Dedicated staff performance lookup, defaults to today
export const getBranchStaffPerformance = async (req, res, next) => {
  try {
    const { branchId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return sendError(res, { statusCode: 400, message: "Invalid branch ID" });
    }
    if (!canAccessBranch(req, branchId)) {
      return sendError(res, {
        statusCode: 403,
        message: "You can only view staff performance for your own branch",
      });
    }

    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    const { start, end } = getDayRange(req.query.date);
    const staffPerformance = await getStaffPerformance(
      branchObjectId,
      start,
      end,
    );

    return sendSuccess(res, {
      statusCode: 200,
      message: "Staff performance fetched successfully",
      data: { date: start.toISOString().slice(0, 10), staffPerformance },
    });
  } catch (error) {
    next(error);
  }
};
 