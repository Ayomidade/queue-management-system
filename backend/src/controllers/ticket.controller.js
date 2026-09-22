import crypto from "crypto";
import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { emitToBranch } from "../socket.js";
import mongoose from "mongoose";
import Branch from "../models/branch.model.js";
import { parsePagination, paginatedResponse } from "../utils/pagination.js";
import { dispatchWebhook } from "../services/webhook.service.js";

const generateKioskId = () => {
  return "K" + crypto.randomBytes(4).toString("hex").toUpperCase();
};

export const createTicket = async (req, res, next) => {
  try {
    const { queueId, branchId, guestName, guestPhone, guestEmail, purpose } =
      req.body;

    let ticket;
    let kioskId;
    for (let attempt = 0; attempt < 3; attempt++) {
      const queue = await Queue.findByIdAndUpdate(
        queueId,
        { $inc: { lastTicketNumber: 1 } },
        { returnDocument: "after" },
      );
      if (!queue) {
        const error = new Error("Queue not found");
        error.statusCode = 404;
        return next(error);
      }

      kioskId = generateKioskId();

      try {
        ticket = await Ticket.create({
          kioskId,
          queue: queueId,
          branch: branchId,
          ticketNumber: queue.lastTicketNumber,
          guestName: guestName.trim(),
          guestPhone: guestPhone || null,
          guestEmail: guestEmail || null,
          purpose: purpose || null,
        });
        break;
      } catch (err) {
        if (err.code === 11000 && attempt < 2) continue;
        throw err;
      }
    }

    emitToBranch(branchId, "queue:updated", {
      queueId,
      reason: "ticket-created",
    });

    dispatchWebhook("ticket.created", {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      queue: queueId,
      branch: branchId,
      guestName: ticket.guestName,
    }, branchId);

    const queueAfter = await Queue.findById(queueId);
    if (queueAfter) {
      const waitingCount = await Ticket.countDocuments({
        queue: queueId,
        status: "waiting",
      });
      const thresholds = [10, 15, 20, 25, 30, 35, 40, 45, 50];
      const currentThreshold = thresholds.findLast((t) => waitingCount >= t);
      const lastNotified = queueAfter.lastNotifiedThreshold || 0;

      if (currentThreshold && currentThreshold > lastNotified) {
        await Queue.findByIdAndUpdate(queueId, {
          lastNotifiedThreshold: currentThreshold,
        });
      }
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: "Ticket created successfully",
      data: {
        ticketId: ticket._id,
        kioskId: ticket.kioskId,
        ticketNumber: ticket.ticketNumber,
        guestName: ticket.guestName,
        queue: queueId,
        branch: branchId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findOne({
      $or: [{ _id: id }, { kioskId: id }],
    })
      .populate("queue", "serviceName")
      .populate("branch", "name location")
      .populate("servedBy", "name");

    if (!ticket) {
      const error = new Error("Ticket not found");
      error.statusCode = 404;
      return next(error);
    }

    let position = 0;
    let estimatedWaitMinutes = null;

    if (ticket.status === "waiting") {
      position = await countTicketsAhead(
        ticket.queue._id,
        ticket.ticketNumber,
        ticket.priority,
      );
      const avgMinutes = await getAverageHandlingMinutes(ticket.queue._id);
      estimatedWaitMinutes =
        avgMinutes !== null ? Math.round(position * avgMinutes) : null;
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Ticket fetched successfully",
      data: { ...ticket.toObject(), position, estimatedWaitMinutes },
    });
  } catch (error) {
    next(error);
  }
};

// How many waiting tickets sit ahead of this one, priority tickets count as ahead of any normal ticket
const countTicketsAhead = async (queueId, ticketNumber, priority) => {
  if (priority === "priority") {
    return Ticket.countDocuments({
      queue: queueId,
      status: "waiting",
      priority: "priority",
      ticketNumber: { $lt: ticketNumber },
    });
  }

  const priorityAhead = await Ticket.countDocuments({
    queue: queueId,
    status: "waiting",
    priority: "priority",
  });
  const normalAhead = await Ticket.countDocuments({
    queue: queueId,
    status: "waiting",
    priority: "normal",
    ticketNumber: { $lt: ticketNumber },
  });
  return priorityAhead + normalAhead;
};

const getAverageHandlingMinutes = async (queueId) => {
  const recent = await Ticket.find({
    queue: queueId,
    status: "completed",
    calledAt: { $ne: null },
    completedAt: { $ne: null },
  })
    .sort({ completedAt: -1 })
    .limit(20)
    .select("calledAt completedAt");

  if (!recent.length) return null;

  const totalMs = recent.reduce(
    (sum, t) => sum + (t.completedAt - t.calledAt),
    0,
  );
  return totalMs / recent.length / 60000;
};

const findTicketInBranchScope = async (id, req) => {
  const ticket = await Ticket.findById(id);
  if (!ticket) return { ticket: null, forbidden: false };

  const isBranchScoped = req.role === "staff" || req.role === "manager";
  if (isBranchScoped && String(ticket.branch) !== String(req.user.branch)) {
    return { ticket: null, forbidden: true };
  }
  return { ticket, forbidden: false };
};

const notifyTicketChange = (ticket, event) => {
  emitToBranch(String(ticket.branch), event, {
    ticketId: ticket._id,
    ticketNumber: ticket.ticketNumber,
    queueId: ticket.queue,
    status: ticket.status,
  });
};

// Primary counter workflow: pull the next ticket for a queue.
// Priority tickets are always served ahead of the regular line.
export const callNextTicket = async (req, res, next) => {
  try {
    const { queueId } = req.body;

    const queue = await Queue.findById(queueId);
    if (!queue) {
      const error = new Error("Queue not found");
      error.statusCode = 404;
      return next(error);
    }

    const isBranchScoped = req.role === "staff" || req.role === "manager";
    if (isBranchScoped && String(queue.branch) !== String(req.user.branch)) {
      return sendError(res, {
        statusCode: 403,
        message: "This queue belongs to a different branch",
      });
    }

    const update = {
      status: "called",
      calledAt: new Date(),
      servedBy: req.user.id,
    };
    const options = { returnDocument: "after", sort: { ticketNumber: 1 } };

    let ticket = await Ticket.findOneAndUpdate(
      { queue: queueId, status: "waiting", priority: "priority" },
      update,
      options,
    );

    if (!ticket) {
      ticket = await Ticket.findOneAndUpdate(
        { queue: queueId, status: "waiting", priority: "normal" },
        update,
        options,
      );
    }

    if (!ticket) {
      return sendError(res, {
        statusCode: 404,
        message: "No waiting tickets in this queue",
      });
    }

    notifyTicketChange(ticket, "ticket:called");

    dispatchWebhook("ticket.called", {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      queue: queue.serviceName,
      branch: queue.branch.toString(),
    }, String(queue.branch));

    return sendSuccess(res, {
      statusCode: 200,
      message: "Next ticket called successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// Manual override: call one specific ticket by ID, out of the normal order
export const callTicket = async (req, res, next) => {
  try {
    const { ticket, forbidden } = await findTicketInBranchScope(
      req.params.id,
      req,
    );

    if (forbidden) {
      return sendError(res, {
        statusCode: 403,
        message: "This ticket belongs to a different branch",
      });
    }
    if (!ticket) {
      const error = new Error("Ticket not found");
      error.statusCode = 404;
      return next(error);
    }

    ticket.status = "called";
    ticket.calledAt = new Date();
    ticket.servedBy = req.user.id;
    await ticket.save();

    notifyTicketChange(ticket, "ticket:called");

    return sendSuccess(res, {
      statusCode: 200,
      message: "Ticket called successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const completeTicket = async (req, res, next) => {
  try {
    const { ticket, forbidden } = await findTicketInBranchScope(
      req.params.id,
      req,
    );

    if (forbidden) {
      return sendError(res, {
        statusCode: 403,
        message: "This ticket belongs to a different branch",
      });
    }
    if (!ticket) {
      const error = new Error("Ticket not found");
      error.statusCode = 404;
      return next(error);
    }

    ticket.status = "completed";
    ticket.completedAt = new Date();
    if (!ticket.servedBy) ticket.servedBy = req.user.id;
    await ticket.save();

    notifyTicketChange(ticket, "ticket:completed");

    return sendSuccess(res, {
      statusCode: 200,
      message: "Ticket completed successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const skipTicket = async (req, res, next) => {
  try {
    const { ticket, forbidden } = await findTicketInBranchScope(
      req.params.id,
      req,
    );

    if (forbidden) {
      return sendError(res, {
        statusCode: 403,
        message: "This ticket belongs to a different branch",
      });
    }
    if (!ticket) {
      const error = new Error("Ticket not found");
      error.statusCode = 404;
      return next(error);
    }

    ticket.status = "skipped";
    await ticket.save();

    notifyTicketChange(ticket, "ticket:skipped");

    return sendSuccess(res, {
      statusCode: 200,
      message: "Ticket skipped",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      const error = new Error("Ticket not found");
      error.statusCode = 404;
      return next(error);
    }

    if (ticket.status === "completed") {
      const error = new Error("Cannot cancel a completed ticket");
      error.statusCode = 400;
      return next(error);
    }

    if (ticket.status === "cancelled") {
      const error = new Error("Ticket is already cancelled");
      error.statusCode = 400;
      return next(error);
    }

    ticket.status = "cancelled";
    ticket.cancelledAt = new Date();
    await ticket.save();

    notifyTicketChange(ticket, "ticket:cancelled");

    return sendSuccess(res, {
      statusCode: 200,
      message: "Ticket cancelled successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// MANAGER OVERRIDE: recall a skipped ticket back into the queue
export const recallTicket = async (req, res, next) => {
  try {
    const { ticket, forbidden } = await findTicketInBranchScope(
      req.params.id,
      req,
    );

    if (forbidden) {
      return sendError(res, {
        statusCode: 403,
        message: "This ticket belongs to a different branch",
      });
    }
    if (!ticket) {
      const error = new Error("Ticket not found");
      error.statusCode = 404;
      return next(error);
    }
    if (ticket.status !== "skipped") {
      return sendError(res, {
        statusCode: 400,
        message: "Only a skipped ticket can be recalled",
      });
    }

    ticket.status = "waiting";
    ticket.calledAt = undefined;
    ticket.servedBy = null;
    await ticket.save();

    notifyTicketChange(ticket, "ticket:recalled");

    return sendSuccess(res, {
      statusCode: 200,
      message: "Ticket recalled into the queue",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// MANAGER OVERRIDE: flag a ticket as priority (elderly, disabled, VIP)
export const setTicketPriority = async (req, res, next) => {
  try {
    const { priority } = req.body;
    if (!["normal", "priority"].includes(priority)) {
      return sendError(res, {
        statusCode: 400,
        message: "priority must be 'normal' or 'priority'",
      });
    }

    const { ticket, forbidden } = await findTicketInBranchScope(
      req.params.id,
      req,
    );

    if (forbidden) {
      return sendError(res, {
        statusCode: 403,
        message: "This ticket belongs to a different branch",
      });
    }
    if (!ticket) {
      const error = new Error("Ticket not found");
      error.statusCode = 404;
      return next(error);
    }

    ticket.priority = priority;
    await ticket.save();

    notifyTicketChange(ticket, "ticket:priority-updated");

    return sendSuccess(res, {
      statusCode: 200,
      message: "Ticket priority updated",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// MANAGER: close the day — mark all active tickets as completed, reset queue counters
export const closeDay = async (req, res, next) => {
  try {
    const branchId = req.user.branch;
    const now = new Date();

    const result = await Ticket.updateMany(
      { branch: branchId, status: { $in: ["waiting", "called"] } },
      { status: "completed", completedAt: now },
    );

    await Branch.findByIdAndUpdate(branchId, {
      dayOpen: false,
      lastClosedAt: now,
    });

    emitToBranch(String(branchId), "day:closed", {
      closedBy: req.user.id,
      timestamp: now,
    });

    dispatchWebhook("day.closed", {
      branchId,
      ticketsCompleted: result.modifiedCount,
    }, String(branchId));

    return sendSuccess(res, {
      statusCode: 200,
      message: "Day closed successfully",
      data: {
        ticketsCompleted: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// MANAGER: open the day — signal that the branch is ready for new tickets
export const openDay = async (req, res, next) => {
  try {
    const branchId = req.user.branch;
    const now = new Date();

    await Branch.findByIdAndUpdate(branchId, {
      dayOpen: true,
      lastOpenedAt: now,
    });

    emitToBranch(String(branchId), "day:opened", {
      openedBy: req.user.id,
      timestamp: now,
    });

    dispatchWebhook("day.opened", { branchId }, String(branchId));

    return sendSuccess(res, {
      statusCode: 200,
      message: "Day opened successfully",
      data: { branchId },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyStats = async (req, res, next) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const ticketsServedToday = await Ticket.countDocuments({
      servedBy: req.user.id,
      status: "completed",
      completedAt: { $gte: start, $lte: end },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Stats fetched successfully",
      data: { ticketsServedToday },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyRecentTickets = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, {
      defaultLimit: 20,
    });
    const filter = {
      servedBy: req.user.id,
      status: { $in: ["completed", "skipped"] },
    };
    const [total, tickets] = await Promise.all([
      Ticket.countDocuments(filter),
      Ticket.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("queue", "serviceName"),
    ]);

    return sendSuccess(res, {
      statusCode: 200,
      message: "Recent tickets fetched successfully",
      ...paginatedResponse(tickets, total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

export const getBranchTickets = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return sendError(res, { statusCode: 400, message: "Invalid branch ID" });
    }

    if (req.role === "manager" && String(req.user.branch) !== branchId) {
      return sendError(res, {
        statusCode: 403,
        message: "You can only view tickets for your own branch",
      });
    }

    const filter = { branch: branchId };
    if (status) filter.status = status;

    const { page, limit, skip } = parsePagination(req.query);
    const [total, tickets] = await Promise.all([
      Ticket.countDocuments(filter),
      Ticket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("queue", "serviceName"),
    ]);

    return sendSuccess(res, {
      statusCode: 200,
      message: "Branch tickets fetched successfully",
      ...paginatedResponse(tickets, total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};
