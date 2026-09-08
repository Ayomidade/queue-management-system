import { Router } from "express";
import {
  getAvailableSlots,
  createAppointment,
  getAppointmentTicket,
} from "../controllers/appointment.controller.js";
import {
  getSlotsValidator,
  createAppointmentValidator,
  appointmentIdParamValidator,
} from "../validators/appointment.validator.js";
import validate from "../middlewares/validate.js";
import { publicReadLimiter, publicWriteLimiter } from "../middlewares/rateLimiter.js";

const appointmentRouter = Router();

appointmentRouter.get("/slots", publicReadLimiter, getSlotsValidator, validate, getAvailableSlots);
appointmentRouter.post("/", publicWriteLimiter, createAppointmentValidator, validate, createAppointment);
appointmentRouter.get("/:kioskId", publicReadLimiter, appointmentIdParamValidator, validate, getAppointmentTicket);

export default appointmentRouter;
