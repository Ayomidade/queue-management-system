import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";
import { sendEmail } from "../services/email.service.js";
import User from "../models/user.model.js";
import { sendSuccess } from "../utils/response.js";

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
      html: `<h2>Ticket Created</h2><p>Your queue ticket has been created successfully.</p><p>Your ticket number is <b>${ticket.ticketNumber}</b></p>`,
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
      .populate("queue", "serviceName") // FIX: was "name", a field that doesn't exist on Queue
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

export const callTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { status: "called", calledAt: new Date() },
      { new: true },
    ).populate("user", "email");

    if (!ticket) {
      const error = new Error("Ticket not found");
      error.statusCode = 404;
      return next(error);
    }

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
    const { id } = req.params;
    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { status: "completed", completedAt: new Date() },
      { new: true },
    );

    if (!ticket) {
      const error = new Error("Ticket not found");
      error.statusCode = 404;
      return next(error);
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
    const { id } = req.params;
    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { status: "skipped" },
      { new: true },
    );

    if (!ticket) {
      const error = new Error("Ticket not found");
      error.statusCode = 404;
      return next(error);
    }

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
    const { id } = req.params;
    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { status: "cancelled", cancelledAt: new Date() },
      { new: true },
    );

    if (!ticket) {
      const error = new Error("Ticket not found");
      error.statusCode = 404;
      return next(error);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Ticket cancelled successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};
