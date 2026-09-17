import { Router } from "express";
import {
  getAvailableSlots,
  createAppointment,
  getAppointmentTicket,
} from "../../controllers/appointment.controller.js";
import {
  getSlotsValidator,
  createAppointmentValidator,
  appointmentIdParamValidator,
} from "../../validators/appointment.validator.js";
import validate from "../../middlewares/validate.js";

/**
 * V1 Appointment Routes
 *
 * Uses the original appointment controller with optional bank-scoping.
 * The controller validates branch ownership when req.bankName is set.
 */

const appointmentRouter = Router();

appointmentRouter.get("/slots", getSlotsValidator, validate, getAvailableSlots);
appointmentRouter.post("/", createAppointmentValidator, validate, createAppointment);
appointmentRouter.get("/:kioskId", appointmentIdParamValidator, validate, getAppointmentTicket);

export default appointmentRouter;
