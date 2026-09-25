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
import { requireScope } from "../../middlewares/apiKey.middleware.js";

/**
 * V1 Appointment Routes — API-key only.
 * Scope wiring (WP5): slot listing / ticket lookup need tickets:read;
 * booking needs tickets:write.
 * (Unauthenticated appointment flow lives on /api/appointments.)
 */

const appointmentRouter = Router();

appointmentRouter.get(
  "/slots",
  requireScope("tickets:read"),
  getSlotsValidator,
  validate,
  getAvailableSlots,
);
appointmentRouter.post(
  "/",
  requireScope("tickets:write"),
  createAppointmentValidator,
  validate,
  createAppointment,
);
appointmentRouter.get(
  "/:kioskId",
  requireScope("tickets:read"),
  appointmentIdParamValidator,
  validate,
  getAppointmentTicket,
);

export default appointmentRouter;
