import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";
import { sendEmail } from "../services/email.service.js";
import User from "../models/user.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { emitToBranch, emitToUser } from "../socket.js";
import mongoose from "mongoose";
import Branch from "../models/branch.model.js";
import { parsePagination, paginatedResponse } from "../utils/pagination.js";
import { dispatchWebhook } from "../services/webhook.service.js";
import { sendNotification, buildTicketCalledMessage, buildDayClosedMessage, buildDayOpenedMessage } from "../services/notification.service.js";
import { sendPushNotification, sendPushToBranch } from "../services/push.service.js";

export const createTicket = async (req, res, next) => {
  try {
    const { queueId, branchId } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    let ticket;
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

      try {
        ticket = await Ticket.create({
          user: userId,
          queue: queueId,
          branch: branchId,
          ticketNumber: queue.lastTicketNumber,
        });
        break;
      } catch (err) {
        if (err.code === 11000 && attempt < 2) continue;
        throw err;
      }
    }

    sendEmail({
      to: user.email,
      subject: `Your Ticket #${ticket.ticketNumber} is Confirmed`,
      html: `<h2>Ticket Confirmed</h2><p>Your queue ticket has been created.</p><p>Ticket number: <b>#${String(ticket.ticketNumber).padStart(4, "0")}</b></p><p>We'll notify you when it's your turn.</p>`,
    }).catch(() => {});

    emitToBranch(branchId, "queue:updated", {
      queueId,
      reason: "ticket-created",
    });

    const queueAfter = await Queue.findById(queueId);
    if (queueAfter) {
      const waitingCount = await Ticket.countDocuments({
        queue: queueId,
        status: "waiting",
      });
      // Threshold: 10, then every 5 more (15, 20, 25...)
      const thresholds = [10, 15, 20, 25, 30, 35, 40, 45, 50];
      const currentThreshold = thresholds.findLast((t) => waitingCount >= t);
      const lastNotified = queueAfter.lastNotifiedThreshold || 0;

      if (currentThreshold && currentThreshold > lastNotified) {
        await Queue.findByIdAndUpdate(queueId, {
          lastNotifiedThreshold: currentThreshold,
        });

        const branchDoc = await Branch.findById(branchId).select("name notificationWebhooks");
        const queueName = queueAfter.serviceName;
        const branchName = branchDoc?.name || "Branch";
        const alertMsg = `**Queue alert:** ${branchName} — ${queueName} queue has reached **${waitingCount}** waiting customers`;

        if (branchDoc?.notificationWebhooks?.slack) {
          sendNotification({ webhookUrl: branchDoc.notificationWebhooks.slack, message: alertMsg });
        }
        if (branchDoc?.notificationWebhooks?.discord) {
          sendNotification({ webhookUrl: branchDoc.notificationWebhooks.discord, message: alertMsg });
        }

        sendPushToBranch(branchId, "manager", {
          title: "Queue Alert",
          body: `${branchName} — ${queueName}: ${waitingCount} waiting customers`,
          icon: "/favicon.svg",
          tag: `queue-threshold-${queueId}`,
        }).catch(() => {});
      }
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: "Ticket created successfully",
      data: ticket,
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

export const getMyTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({
      user: req.user.id,
      status: { $in: ["waiting", "called"] },
    });

    if (!ticket) {
      const error = new Error("No active ticket found");
      error.statusCode = 404;
      return next(error);
    }

    let position = 0;
    let estimatedWaitMinutes = null;

    if (ticket.status === "waiting") {
      position = await countTicketsAhead(
        ticket.queue,
        ticket.ticketNumber,
        ticket.priority,
      );
      const avgMinutes = await getAverageHandlingMinutes(ticket.queue);
      estimatedWaitMinutes =
        avgMinutes !== null ? Math.round(position * avgMinutes) : null;
    }

    await ticket.populate("queue", "serviceName");
    await ticket.populate("branch", "name location");

    return sendSuccess(res, {
      statusCode: 200,
      message: "Active ticket fetched successfully",
      data: { ...ticket.toObject(), position, estimatedWaitMinutes },
    });
  } catch (error) {
    next(error);
  }
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
  emitToUser(String(ticket.user), event, {
    ticketId: ticket._id,
    ticketNumber: ticket.ticketNumber,
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

    await ticket.populate("user", "email");

    sendEmail({
      to: ticket.user.email,
      subject: `Ticket #${ticket.ticketNumber} — Please Proceed`,
      html: `<h2>Your Ticket is Being Called</h2><p>Ticket number: <b>#${String(ticket.ticketNumber).padStart(4, "0")}</b></p><p>Please proceed to the counter now.</p>`,
    }).catch(() => {});

    notifyTicketChange(ticket, "ticket:called");

    if (ticket.user) {
      sendPushNotification(ticket.user._id, "User", {
        title: "Ticket Called",
        body: `Ticket #${String(ticket.ticketNumber).padStart(4, "0")} — please proceed to the counter now.`,
        icon: "/favicon.svg",
        tag: `ticket-${ticket._id}`,
      }).catch(() => {});
    }

    const branchDoc = await Branch.findById(queue.branch).select("name notificationWebhooks");
    dispatchWebhook("ticket.called", {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      queue: queue.serviceName,
      branch: queue.branch.toString(),
    }, String(queue.branch));

    if (branchDoc?.notificationWebhooks?.slack) {
      sendNotification({
        webhookUrl: branchDoc.notificationWebhooks.slack,
        message: buildTicketCalledMessage(ticket.ticketNumber, branchDoc?.name || "Branch", queue.serviceName),
      });
    }
    if (branchDoc?.notificationWebhooks?.discord) {
      sendNotification({
        webhookUrl: branchDoc.notificationWebhooks.discord,
        message: buildTicketCalledMessage(ticket.ticketNumber, branchDoc?.name || "Branch", queue.serviceName),
      });
    }

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
    await ticket.populate("user", "email");

    sendEmail({
      to: ticket.user.email,
      subject: `Ticket #${ticket.ticketNumber} — Please Proceed`,
      html: `<h2>Your Ticket is Being Called</h2><p>Ticket number: <b>#${String(ticket.ticketNumber).padStart(4, "0")}</b></p><p>Please proceed to the counter now.</p>`,
    }).catch(() => {});

    notifyTicketChange(ticket, "ticket:called");

    if (ticket.user) {
      sendPushNotification(ticket.user._id, "User", {
        title: "Ticket Called",
        body: `Ticket #${String(ticket.ticketNumber).padStart(4, "0")} — please proceed to the counter now.`,
        icon: "/favicon.svg",
        tag: `ticket-${ticket._id}`,
      }).catch(() => {});
    }

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
    await ticket.populate("user", "email name");

    notifyTicketChange(ticket, "ticket:completed");

    if (ticket.user?.email) {
      sendEmail({
        to: ticket.user.email,
        subject: `Ticket #${ticket.ticketNumber} — Completed`,
        html: `<h2>Ticket Completed</h2><p>Your ticket <b>#${String(ticket.ticketNumber).padStart(4, "0")}</b> has been completed. Thank you for visiting Cue!</p>`,
      }).catch(() => {});
    }

    if (ticket.user) {
      sendPushNotification(ticket.user._id, "User", {
        title: "Ticket Completed",
        body: `Your ticket #${String(ticket.ticketNumber).padStart(4, "0")} has been completed.`,
        icon: "/favicon.svg",
        tag: `ticket-${ticket._id}`,
      }).catch(() => {});
    }

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
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("user", "email name");

    if (!ticket) {
      const error = new Error("Ticket not found");
      error.statusCode = 404;
      return next(error);
    }

    ticket.status = "cancelled";
    ticket.cancelledAt = new Date();
    await ticket.save();

    notifyTicketChange(ticket, "ticket:cancelled");

    if (ticket.user?.email) {
      sendEmail({
        to: ticket.user.email,
        subject: `Ticket #${ticket.ticketNumber} — Cancelled`,
        html: `<h2>Ticket Cancelled</h2><p>Your ticket <b>#${String(ticket.ticketNumber).padStart(4, "0")}</b> has been cancelled.</p>`,
      }).catch(() => {});
    }

    sendPushNotification(ticket.user._id, "User", {
      title: "Ticket Cancelled",
      body: `Your ticket #${String(ticket.ticketNumber).padStart(4, "0")} has been cancelled.`,
      icon: "/favicon.svg",
      tag: `ticket-${ticket._id}`,
    }).catch(() => {});

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

    // Mark all waiting and called tickets as completed
    const result = await Ticket.updateMany(
      { branch: branchId, status: { $in: ["waiting", "called"] } },
      { status: "completed", completedAt: now },
    );

    // Update branch day status
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

    const branchDoc = await Branch.findById(branchId).select("name notificationWebhooks");
    if (branchDoc?.notificationWebhooks?.slack) {
      sendNotification({
        webhookUrl: branchDoc.notificationWebhooks.slack,
        message: buildDayClosedMessage(branchDoc.name, result.modifiedCount),
      });
    }
    if (branchDoc?.notificationWebhooks?.discord) {
      sendNotification({
        webhookUrl: branchDoc.notificationWebhooks.discord,
        message: buildDayClosedMessage(branchDoc.name, result.modifiedCount),
      });
    }

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

    // Update branch day status
    await Branch.findByIdAndUpdate(branchId, {
      dayOpen: true,
      lastOpenedAt: now,
    });

    emitToBranch(String(branchId), "day:opened", {
      openedBy: req.user.id,
      timestamp: now,
    });

    dispatchWebhook("day.opened", { branchId }, String(branchId));

    const branchDoc = await Branch.findById(branchId).select("name notificationWebhooks");
    if (branchDoc?.notificationWebhooks?.slack) {
      sendNotification({
        webhookUrl: branchDoc.notificationWebhooks.slack,
        message: buildDayOpenedMessage(branchDoc.name),
      });
    }
    if (branchDoc?.notificationWebhooks?.discord) {
      sendNotification({
        webhookUrl: branchDoc.notificationWebhooks.discord,
        message: buildDayOpenedMessage(branchDoc.name),
      });
    }

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
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
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
        .populate("queue", "serviceName")
        .populate("user", "email name"),
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
        .populate("queue", "serviceName")
        .populate("user", "email"),
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
