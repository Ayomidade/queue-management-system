import mongoose from "mongoose";
import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";
import Staff from "../models/staff.model.js";
import Branch from "../models/branch.model.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const getPeakHours = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { days = 7 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return sendError(res, { statusCode: 400, message: "Invalid branch ID" });
    }

    if (req.role === "manager" && String(req.user.branch) !== branchId) {
      return sendError(res, { statusCode: 403, message: "Access denied" });
    }

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const heatmap = await Ticket.aggregate([
      {
        $match: {
          branch: new mongoose.Types.ObjectId(branchId),
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            day: { $dayOfWeek: "$createdAt" },
            hour: { $hour: "$createdAt" },
          },
          count: { $sum: 1 },
          avgWaitMs: {
            $avg: {
              $cond: [
                { $ne: ["$calledAt", null] },
                { $subtract: ["$calledAt", "$createdAt"] },
                null,
              ],
            },
          },
        },
      },
      { $sort: { "_id.day": 1, "_id.hour": 1 } },
    ]);

    const grid = {};
    for (let d = 1; d <= 7; d++) {
      grid[d] = {};
      for (let h = 0; h < 24; h++) {
        grid[d][h] = { count: 0, avgWaitMinutes: 0 };
      }
    }

    for (const entry of heatmap) {
      const day = entry._id.day;
      const hour = entry._id.hour;
      grid[day][hour] = {
        count: entry.count,
        avgWaitMinutes: entry.avgWaitMs
          ? Math.round(entry.avgWaitMs / 60000)
          : 0,
      };
    }

    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return sendSuccess(res, {
      statusCode: 200,
      message: "Peak hours heatmap fetched",
      data: {
        days: parseInt(days),
        heatmap: Object.entries(grid).map(([day, hours]) => ({
          day: parseInt(day),
          dayName: DAY_NAMES[parseInt(day) - 1],
          hours: Object.entries(hours).map(([hour, data]) => ({
            hour: parseInt(hour),
            ...data,
          })),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getStaffLeaderboard = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { period = "today" } = req.query;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return sendError(res, { statusCode: 400, message: "Invalid branch ID" });
    }

    if (req.role === "manager" && String(req.user.branch) !== branchId) {
      return sendError(res, { statusCode: 403, message: "Access denied" });
    }

    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    let startDate = new Date();

    if (period === "week") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }

    const [ticketStats, avgHandleTimes] = await Promise.all([
      Ticket.aggregate([
        {
          $match: {
            branch: branchObjectId,
            status: "completed",
            servedBy: { $ne: null },
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: "$servedBy",
            ticketsServed: { $sum: 1 },
            avgHandleMs: {
              $avg: {
                $cond: [
                  { $ne: ["$completedAt", null] },
                  { $subtract: ["$completedAt", "$calledAt"] },
                  null,
                ],
              },
            },
          },
        },
        { $sort: { ticketsServed: -1 } },
      ]),
      Ticket.aggregate([
        {
          $match: {
            branch: branchObjectId,
            status: "completed",
            servedBy: { $ne: null },
            calledAt: { $ne: null },
            completedAt: { $ne: null },
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: "$servedBy",
            avgMs: { $avg: { $subtract: ["$completedAt", "$calledAt"] } },
          },
        },
      ]),
    ]);

    const staffDocs = await Staff.find({
      _id: { $in: ticketStats.map((e) => e._id) },
    }).select("name");
    const nameMap = Object.fromEntries(
      staffDocs.map((s) => [s._id.toString(), s.name]),
    );

    const handleMap = Object.fromEntries(
      avgHandleTimes.map((e) => [
        e._id.toString(),
        e.avgMs ? Math.round(e.avgMs / 60000) : null,
      ]),
    );

    const leaderboard = ticketStats.map((entry, idx) => ({
      rank: idx + 1,
      staffId: entry._id.toString(),
      name: nameMap[entry._id.toString()] || "Unknown",
      ticketsServed: entry.ticketsServed,
      avgHandleMinutes: handleMap[entry._id.toString()] || null,
    }));

    return sendSuccess(res, {
      statusCode: 200,
      message: "Staff leaderboard fetched",
      data: {
        period,
        since: startDate.toISOString(),
        leaderboard,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getServiceWaitTargets = async (req, res, next) => {
  try {
    const { branchId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return sendError(res, { statusCode: 400, message: "Invalid branch ID" });
    }

    const branch = await Branch.findById(branchId).select(
      "name waitTimeTargets",
    );
    if (!branch) {
      return sendError(res, { statusCode: 404, message: "Branch not found" });
    }

    const queues = await Queue.find({ branch: branchId, isActive: true });

    const liveData = await Promise.all(
      queues.map(async (q) => {
        const recent = await Ticket.find({
          queue: q._id,
          status: "completed",
          calledAt: { $ne: null },
          completedAt: { $ne: null },
        })
          .sort({ completedAt: -1 })
          .limit(20)
          .select("calledAt completedAt");

        const avgMs = recent.length
          ? recent.reduce((s, t) => s + (t.completedAt - t.calledAt), 0) /
            recent.length
          : null;

        const waiting = await Ticket.countDocuments({
          queue: q._id,
          status: "waiting",
        });

        const target = branch.waitTimeTargets?.get?.(q.serviceName) || null;

        return {
          queueId: q._id.toString(),
          service: q.serviceName,
          currentAvgHandleMinutes: avgMs ? Math.round(avgMs / 60000) : null,
          targetMinutes: target,
          waiting,
          onTarget:
            target !== null && avgMs !== null
              ? Math.round(avgMs / 60000) <= target
              : null,
        };
      }),
    );

    return sendSuccess(res, {
      statusCode: 200,
      message: "Service wait targets fetched",
      data: { branch: branch.name, services: liveData },
    });
  } catch (error) {
    next(error);
  }
};

export const updateServiceWaitTargets = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { targets } = req.body;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return sendError(res, { statusCode: 400, message: "Invalid branch ID" });
    }

    if (req.role === "manager" && String(req.user.branch) !== branchId) {
      return sendError(res, { statusCode: 403, message: "Access denied" });
    }

    if (!targets || typeof targets !== "object") {
      return sendError(res, {
        statusCode: 400,
        message: "targets object is required (service name → minutes)",
      });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return sendError(res, { statusCode: 404, message: "Branch not found" });
    }

    if (!branch.waitTimeTargets) {
      branch.waitTimeTargets = new Map();
    }

    for (const [service, minutes] of Object.entries(targets)) {
      if (minutes === null || minutes === undefined) {
        branch.waitTimeTargets.delete(service);
      } else {
        branch.waitTimeTargets.set(service, Number(minutes));
      }
    }

    await branch.save();

    return sendSuccess(res, {
      statusCode: 200,
      message: "Wait time targets updated",
      data: { targets: Object.fromEntries(branch.waitTimeTargets) },
    });
  } catch (error) {
    next(error);
  }
};
