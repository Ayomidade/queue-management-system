import { chat, getToolsForRole } from "../services/groq.service.js";
import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";
import Branch from "../models/branch.model.js";
import Counter from "../models/counter.model.js";
import Staff from "../models/staff.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import mongoose from "mongoose";

const buildToolExecutors = (user, role) => ({
  get_my_ticket: async () => {
    const ticket = await Ticket.findOne({
      user: user._id,
      status: { $in: ["waiting", "called"] },
    })
      .populate("queue", "serviceName")
      .populate("branch", "name location");

    if (!ticket) return { active: false, message: "No active ticket found" };

    let position = 0;
    let estimatedWaitMinutes = null;

    if (ticket.status === "waiting") {
      const priorityAhead = await Ticket.countDocuments({
        queue: ticket.queue._id,
        status: "waiting",
        priority: "priority",
      });
      const normalAhead = await Ticket.countDocuments({
        queue: ticket.queue._id,
        status: "waiting",
        priority: "normal",
        ticketNumber: { $lt: ticket.ticketNumber },
      });
      position = priorityAhead + normalAhead;

      const recent = await Ticket.find({
        queue: ticket.queue._id,
        status: "completed",
        calledAt: { $ne: null },
        completedAt: { $ne: null },
      })
        .sort({ completedAt: -1 })
        .limit(20)
        .select("calledAt completedAt");

      if (recent.length) {
        const avgMs =
          recent.reduce((s, t) => s + (t.completedAt - t.calledAt), 0) /
          recent.length;
        estimatedWaitMinutes = Math.round(position * (avgMs / 60000));
      }
    }

    return {
      active: true,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      priority: ticket.priority,
      service: ticket.queue?.serviceName,
      branch: ticket.branch?.name,
      position,
      estimatedWaitMinutes,
    };
  },

  get_branch_queues: async ({ branchId }) => {
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return { error: "Invalid branch ID" };
    }
    const branch = await Branch.findById(branchId).select("name location");
    if (!branch) return { error: "Branch not found" };

    const queueCounts = await Ticket.aggregate([
      { $match: { branch: new mongoose.Types.ObjectId(branchId), status: "waiting" } },
      { $group: { _id: "$queue", waiting: { $sum: 1 } } },
    ]);

    const queueDocs = await Queue.find({
      _id: { $in: queueCounts.map((e) => e._id) },
    }).select("serviceName");
    const nameMap = Object.fromEntries(
      queueDocs.map((q) => [q._id.toString(), q.serviceName]),
    );

    const queues = queueCounts.map((e) => ({
      service: nameMap[e._id.toString()] || "Unknown",
      waiting: e.waiting,
    }));

    const counters = await Counter.find({ branch: branchId });
    const openCounters = counters.filter((c) => c.isOpen).length;

    return {
      branch: branch.name,
      location: branch.location,
      queues,
      counters: { total: counters.length, open: openCounters },
    };
  },

  list_branches: async () => {
    const branches = await Branch.find({ isActive: true }).select(
      "name location",
    );

    const results = await Promise.all(
      branches.map(async (b) => {
        const waiting = await Ticket.countDocuments({
          branch: b._id,
          status: "waiting",
        });
        return {
          id: b._id.toString(),
          name: b.name,
          location: b.location,
          waiting,
        };
      }),
    );

    return { branches: results };
  },

  get_branch_analytics: async ({ branchId }) => {
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return { error: "Invalid branch ID" };
    }
    if (
      (role === "staff" || role === "manager") &&
      String(user.branch) !== branchId
    ) {
      return { error: "Access denied: not your branch" };
    }

    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [queueCounts, statusCounts, waitAgg, counters] = await Promise.all([
      Ticket.aggregate([
        { $match: { branch: branchObjectId, status: "waiting" } },
        { $group: { _id: "$queue", waiting: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        { $match: { branch: branchObjectId, createdAt: { $gte: start, $lte: end } } },
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
        { $group: { _id: null, avgWaitMs: { $avg: { $subtract: ["$calledAt", "$createdAt"] } } } },
      ]),
      Counter.find({ branch: branchId }),
    ]);

    const queueDocs = await Queue.find({
      _id: { $in: queueCounts.map((e) => e._id) },
    }).select("serviceName");
    const nameMap = Object.fromEntries(
      queueDocs.map((q) => [q._id.toString(), q.serviceName]),
    );

    const counts = Object.fromEntries(
      statusCounts.map((e) => [e._id, e.count]),
    );

    return {
      queueLengths: queueCounts.map((e) => ({
        service: nameMap[e._id.toString()] || "Unknown",
        waiting: e.waiting,
      })),
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
    };
  },

  get_daily_report: async ({ branchId, date }) => {
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return { error: "Invalid branch ID" };
    }
    if (
      (role === "staff" || role === "manager") &&
      String(user.branch) !== branchId
    ) {
      return { error: "Access denied: not your branch" };
    }

    const dayStart = date ? new Date(date) : new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const branchObjectId = new mongoose.Types.ObjectId(branchId);

    const [statusCounts, busiestQueueAgg, staffPerf] = await Promise.all([
      Ticket.aggregate([
        { $match: { branch: branchObjectId, createdAt: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        { $match: { branch: branchObjectId, createdAt: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: "$queue", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 1 },
      ]),
      (async () => {
        const agg = await Ticket.aggregate([
          {
            $match: {
              branch: branchObjectId,
              status: "completed",
              servedBy: { $ne: null },
              createdAt: { $gte: dayStart, $lte: dayEnd },
            },
          },
          { $group: { _id: "$servedBy", ticketsServed: { $sum: 1 } } },
          { $sort: { ticketsServed: -1 } },
        ]);
        const staffDocs = await Staff.find({
          _id: { $in: agg.map((e) => e._id) },
        }).select("name");
        const nameMap = Object.fromEntries(
          staffDocs.map((s) => [s._id.toString(), s.name]),
        );
        return agg.map((e) => ({
          name: nameMap[e._id.toString()] || "Unknown",
          ticketsServed: e.ticketsServed,
        }));
      })(),
    ]);

    const counts = Object.fromEntries(
      statusCounts.map((e) => [e._id, e.count]),
    );

    let busiestService = null;
    if (busiestQueueAgg.length) {
      const qDoc = await Queue.findById(busiestQueueAgg[0]._id).select("serviceName");
      busiestService = {
        service: qDoc?.serviceName || "Unknown",
        tickets: busiestQueueAgg[0].total,
      };
    }

    return {
      date: dayStart.toISOString().slice(0, 10),
      totalIssued: Object.values(counts).reduce((s, n) => s + n, 0),
      completed: counts.completed || 0,
      noShows: counts.skipped || 0,
      cancelled: counts.cancelled || 0,
      busiestService,
      staffPerformance: staffPerf,
    };
  },

  get_staff_performance: async ({ branchId }) => {
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return { error: "Invalid branch ID" };
    }
    if (
      (role === "staff" || role === "manager") &&
      String(user.branch) !== branchId
    ) {
      return { error: "Access denied: not your branch" };
    }

    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const agg = await Ticket.aggregate([
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
      _id: { $in: agg.map((e) => e._id) },
    }).select("name");
    const nameMap = Object.fromEntries(
      staffDocs.map((s) => [s._id.toString(), s.name]),
    );

    return {
      date: start.toISOString().slice(0, 10),
      performance: agg.map((e) => ({
        name: nameMap[e._id.toString()] || "Unknown",
        ticketsServed: e.ticketsServed,
      })),
    };
  },

  list_all_branches: async () => {
    if (role !== "admin") return { error: "Admin access required" };

    const branches = await Branch.find({}).select("name location isActive dayOpen");
    const results = await Promise.all(
      branches.map(async (b) => {
        const waiting = await Ticket.countDocuments({
          branch: b._id,
          status: "waiting",
        });
        return {
          id: b._id.toString(),
          name: b.name,
          location: b.location,
          active: b.isActive,
          dayOpen: b.dayOpen,
          waiting,
        };
      }),
    );

    return { branches: results };
  },
});

export const sendMessage = async (req, res, next) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return sendError(res, {
        statusCode: 400,
        message: "messages array is required and must not be empty",
      });
    }

    const role = req.role;
    const tools = getToolsForRole(role);
    const toolExecutors = buildToolExecutors(req.user, role);

    const result = await chat({ messages, tools, toolExecutors });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Response generated",
      data: {
        content: result.content,
        toolCalls: result.toolCalls,
      },
    });
  } catch (error) {
    if (error?.message?.includes("GROQ_API_KEY")) {
      return sendError(res, {
        statusCode: 503,
        message: "AI service not configured",
      });
    }
    next(error);
  }
};
