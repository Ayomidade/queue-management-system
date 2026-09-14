import crypto from "crypto";
import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";
import Branch from "../models/branch.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { emitToBranch } from "../socket.js";

const SLOT_MINUTES = 30;

const parseTime = (str) => {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
};

const formatTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const getAvailableSlots = async (req, res, next) => {
  try {
    const { branchId, serviceId, date } = req.query;

    if (!branchId || !serviceId || !date) {
      return sendError(res, {
        statusCode: 400,
        message: "branchId, serviceId, and date are required",
      });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return sendError(res, { statusCode: 404, message: "Branch not found" });
    }

    const dayOfWeek = new Date(date).toLocaleDateString("en-US", {
      weekday: "lowercase",
    });
    const hours = branch.operatingHours?.get(dayOfWeek);
    const openMin = hours ? parseTime(hours.open) : parseTime("09:00");
    const closeMin = hours ? parseTime(hours.close) : parseTime("17:00");

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existingAppointments = await Ticket.find({
      branch: branchId,
      queue: serviceId,
      isAppointment: true,
      status: { $in: ["waiting", "called"] },
      scheduledFor: { $gte: dayStart, $lte: dayEnd },
    }).select("scheduledFor");

    const countsBySlot = {};
    existingAppointments.forEach((t) => {
      const slotDate = new Date(t.scheduledFor);
      const slotMin =
        slotDate.getHours() * 60 + slotDate.getMinutes();
      countsBySlot[slotMin] = (countsBySlot[slotMin] || 0) + 1;
    });

    const maxPerSlot = branch.maxAppointmentsPerSlot || 5;
    const now = new Date();
    const isToday = dayStart.toDateString() === now.toDateString();

    const slots = [];
    for (let min = openMin; min < closeMin; min += SLOT_MINUTES) {
      if (isToday) {
        const slotTime = new Date(date);
        slotTime.setHours(Math.floor(min / 60), min % 60, 0, 0);
        if (slotTime <= now) continue;
      }

      const count = countsBySlot[min] || 0;
      slots.push({
        time: formatTime(min),
        available: count < maxPerSlot,
        remaining: maxPerSlot - count,
      });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Available slots fetched",
      data: { date, slots },
    });
  } catch (error) {
    next(error);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    const { queueId, branchId, scheduledFor, guestName, guestPhone } = req.body;

    if (!queueId || !branchId || !scheduledFor) {
      return sendError(res, {
        statusCode: 400,
        message: "queueId, branchId, and scheduledFor are required",
      });
    }

    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      return sendError(res, {
        statusCode: 400,
        message: "Invalid scheduledFor date",
      });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return sendError(res, { statusCode: 404, message: "Branch not found" });
    }

    const dayOfWeek = scheduledDate.toLocaleDateString("en-US", {
      weekday: "lowercase",
    });
    const hours = branch.operatingHours?.get(dayOfWeek);
    const openMin = hours ? parseTime(hours.open) : parseTime("09:00");
    const closeMin = hours ? parseTime(hours.close) : parseTime("17:00");
    const slotMin = scheduledDate.getHours() * 60 + scheduledDate.getMinutes();

    if (slotMin < openMin || slotMin >= closeMin) {
      return sendError(res, {
        statusCode: 400,
        message: "Selected time is outside branch operating hours",
      });
    }

    const dayStart = new Date(scheduledDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduledDate);
    dayEnd.setHours(23, 59, 59, 999);

    const slotCount = await Ticket.countDocuments({
      branch: branchId,
      queue: queueId,
      isAppointment: true,
      status: { $in: ["waiting", "called"] },
      scheduledFor: { $gte: dayStart, $lte: dayEnd },
    });

    const maxPerSlot = branch.maxAppointmentsPerSlot || 5;
    if (slotCount >= maxPerSlot) {
      return sendError(res, {
        statusCode: 409,
        message: "This time slot is fully booked",
      });
    }

    const kioskId = "A" + crypto.randomBytes(4).toString("hex").toUpperCase();

    let ticket;
    for (let attempt = 0; attempt < 3; attempt++) {
      const queue = await Queue.findByIdAndUpdate(
        queueId,
        { $inc: { lastTicketNumber: 1 } },
        { returnDocument: "after" },
      );
      if (!queue) {
        return sendError(res, { statusCode: 404, message: "Queue not found" });
      }

      try {
        ticket = await Ticket.create({
          kioskId,
          queue: queueId,
          branch: branchId,
          ticketNumber: queue.lastTicketNumber,
          isAppointment: true,
          scheduledFor: scheduledDate,
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
      reason: "appointment-created",
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Appointment booked",
      data: {
        ticketId: ticket._id,
        kioskId: ticket.kioskId,
        ticketNumber: ticket.ticketNumber,
        scheduledFor: ticket.scheduledFor,
        queue: queue.serviceName,
        branch: branch.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAppointmentTicket = async (req, res, next) => {
  try {
    const { kioskId } = req.params;

    const ticket = await Ticket.findOne({ kioskId, isAppointment: true })
      .populate("queue", "serviceName")
      .populate("branch", "name location");

    if (!ticket) {
      return sendError(res, {
        statusCode: 404,
        message: "Appointment not found",
      });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Appointment fetched",
      data: {
        ticketId: ticket._id,
        kioskId: ticket.kioskId,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        scheduledFor: ticket.scheduledFor,
        queue: ticket.queue?.serviceName,
        branch: ticket.branch?.name,
        createdAt: ticket.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
