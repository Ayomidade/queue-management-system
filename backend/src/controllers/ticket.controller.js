import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";
import { sendEmail } from "../services/email.service.js";
import User from "../models/user.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { emitToBranch, emitToUser } from "../socket.js";
import mongoose from "mongoose";

export const createTicket = async (req, res, next) => {
  try {
    const { queueId, branchId } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    const queue = await Queue.findByIdAndUpdate(
      queueId,
      { $inc: { lastTicketNumber: 1 } },
      { new: true },
    );
    if (!queue) {
      const error = new Error("Queue not found");
      error.statusCode = 404;
      return next(error);
    }

    const ticket = await Ticket.create({
      user: userId,
      queue: queueId,
      branch: branchId,
      ticketNumber: queue.lastTicketNumber,
    });

    // await sendEmail({
    //   to: user.email,
    //   subject: "Your Queue Ticket",
    //   html: `<h2>Ticket Created</h2><p>Your queue ticket has been created successfully.</p><p>Your ticket number is <b>${ticket.ticketNumber}</b></p>`,
    // });

    emitToBranch(branchId, "queue:updated", {
      queueId,
      reason: "ticket-created",
    });

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
    const options = { new: true, sort: { ticketNumber: 1 } };

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

    // await sendEmail({
    //   to: ticket.user.email,
    //   subject: "Your Ticket is Being Served",
    //   html: `<h2>Your Ticket is Being Called</h2><p>Ticket Number: <b>${ticket.ticketNumber}</b></p><p>Please proceed to the counter.</p>`,
    // });

    notifyTicketChange(ticket, "ticket:called");

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

    // await sendEmail({
    //   to: ticket.user.email,
    //   subject: "Your Ticket is Being Served",
    //   html: `<h2>Your Ticket is Being Called</h2><p>Ticket Number: <b>${ticket.ticketNumber}</b></p><p>Please proceed to the counter.</p>`,
    // });

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
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!ticket) {
      const error = new Error("Ticket not found");
      error.statusCode = 404;
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

    return sendSuccess(res, {
      statusCode: 200,
      message: "Ticket priority updated",
      data: ticket,
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
    const tickets = await Ticket.find({
      servedBy: req.user.id,
      status: { $in: ["completed", "skipped"] },
    })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate("queue", "serviceName")
      .populate("user", "email name");

    return sendSuccess(res, {
      statusCode: 200,
      message: "Recent tickets fetched successfully",
      data: tickets,
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

    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("queue", "serviceName")
      .populate("user", "email");

    return sendSuccess(res, {
      statusCode: 200,
      message: "Branch tickets fetched successfully",
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};
