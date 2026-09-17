import crypto from "crypto";
import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";
import Branch from "../models/branch.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { emitToBranch } from "../socket.js";

const generateKioskId = () => {
  return "K" + crypto.randomBytes(4).toString("hex").toUpperCase();
};

export const createKioskTicket = async (req, res, next) => {
  try {
    const { queueId, branchId, guestName, guestPhone } = req.body;

    if (!queueId || !branchId) {
      return sendError(res, {
        statusCode: 400,
        message: "queueId and branchId are required",
      });
    }

    // Optional bank-scoping: validate branch belongs to this bank if in v1 mode
    if (req.bankName) {
      const branch = await Branch.findOne({ _id: branchId, bank: req.bankName, isActive: true });
      if (!branch) {
        return sendError(res, { statusCode: 404, message: "Branch not found" });
      }
      // Also validate queue belongs to this branch
      const queueExists = await Queue.findOne({ _id: queueId, branch: branchId });
      if (!queueExists) {
        return sendError(res, { statusCode: 404, message: "Queue not found" });
      }
    }

    let ticket;
    let kioskId;
    for (let attempt = 0; attempt < 3; attempt++) {
      const queue = await Queue.findByIdAndUpdate(
        queueId,
        { $inc: { lastTicketNumber: 1 } },
        { returnDocument: "after" },
      );
      if (!queue) {
        return sendError(res, { statusCode: 404, message: "Queue not found" });
      }

      kioskId = generateKioskId();

      try {
        ticket = await Ticket.create({
          kioskId,
          queue: queueId,
          branch: branchId,
          ticketNumber: queue.lastTicketNumber,
          guestName: guestName || null,
          guestPhone: guestPhone || null,
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

    return sendSuccess(res, {
      statusCode: 201,
      message: "Kiosk ticket created",
      data: {
        ticketId: ticket._id,
        kioskId: ticket.kioskId,
        ticketNumber: ticket.ticketNumber,
        queue: queue.serviceName,
        branch: branchId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getKioskTicket = async (req, res, next) => {
  try {
    const { kioskId } = req.params;

    if (!kioskId) {
      return sendError(res, {
        statusCode: 400,
        message: "kioskId is required",
      });
    }

    const ticket = await Ticket.findOne({ kioskId })
      .populate("queue", "serviceName")
      .populate("branch", "name location bank");

    if (!ticket) {
      return sendError(res, {
        statusCode: 404,
        message: "Ticket not found",
      });
    }

    // Optional bank-scoping: validate ticket's branch belongs to this bank
    if (req.bankName && ticket.branch?.bank !== req.bankName) {
      return sendError(res, {
        statusCode: 404,
        message: "Ticket not found",
      });
    }

    let position = 0;
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
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Ticket fetched",
      data: {
        ticketId: ticket._id,
        kioskId: ticket.kioskId,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        priority: ticket.priority,
        queue: ticket.queue?.serviceName,
        branch: ticket.branch?.name,
        position,
        createdAt: ticket.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelKioskTicket = async (req, res, next) => {
  try {
    const { kioskId } = req.params;

    const ticket = await Ticket.findOne({ kioskId }).populate("branch", "bank");
    if (!ticket) {
      return sendError(res, {
        statusCode: 404,
        message: "Ticket not found",
      });
    }

    // Optional bank-scoping: validate ticket's branch belongs to this bank
    if (req.bankName && ticket.branch?.bank !== req.bankName) {
      return sendError(res, {
        statusCode: 404,
        message: "Ticket not found",
      });
    }

    if (ticket.status !== "waiting") {
      return sendError(res, {
        statusCode: 400,
        message: "Only waiting tickets can be cancelled",
      });
    }

    ticket.status = "cancelled";
    ticket.cancelledAt = new Date();
    await ticket.save();

    emitToBranch(String(ticket.branch), "ticket:cancelled", {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Ticket cancelled",
    });
  } catch (error) {
    next(error);
  }
};
