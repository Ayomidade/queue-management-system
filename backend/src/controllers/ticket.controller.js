import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";
import { sendEmail } from "../services/email.service.js";
import User from "../models/user.model.js";
import { sendSuccess, sendError } from "../utils/response.js";

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

    await sendEmail({
      to: user.email,
      subject: "Your Queue Ticket",
      html: `<h2>Ticket Created</h2><p>Your queue ticket has been created successfully.</p><p>Your ticket number is <b>${ticket.ticketNumber}</b></p><p>Queue: <b>${queue.serviceName}</b></p><p>Branch: <b>${branchId}</b></p><p>Please wait for your turn.</p>`,
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

export const getMyTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({
      user: req.user.id,
      status: { $in: ["waiting", "called"] },
    })
      .populate("queue", "serviceName")
      .populate("branch", "name location");

    if (!ticket) {
      const error = new Error("No active ticket found");
      error.statusCode = 404;
      return next(error);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Active ticket fetched successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// Admin has network-wide access; staff/manager are scoped to their own branch
const findTicketInBranchScope = async (id, req) => {
  const ticket = await Ticket.findById(id);
  if (!ticket) return { ticket: null, forbidden: false };

  const isBranchScoped = req.role === "staff" || req.role === "manager";
  if (isBranchScoped && String(ticket.branch) !== String(req.user.branch)) {
    return { ticket: null, forbidden: true };
  }
  return { ticket, forbidden: false };
};

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

    await sendEmail({
      to: ticket.user.email,
      subject: "Your Ticket is Being Served",
      html: `<h2>Your Ticket is Being Called</h2><p>Ticket Number: <b>${ticket.ticketNumber}</b></p><p>Please proceed to the counter.</p>`,
    });

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
    if (!ticket.servedBy) ticket.servedBy = req.user.id; // covers a manager force-completing a stuck ticket
    await ticket.save();

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
