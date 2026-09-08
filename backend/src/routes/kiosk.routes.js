import { Router } from "express";
import {
  createKioskTicket,
  getKioskTicket,
  cancelKioskTicket,
} from "../controllers/kiosk.controller.js";
import {
  createKioskTicketValidator,
  kioskIdParamValidator,
} from "../validators/kiosk.validator.js";
import validate from "../middlewares/validate.js";
import { publicReadLimiter, publicWriteLimiter } from "../middlewares/rateLimiter.js";

const kioskRouter = Router();

kioskRouter.post("/tickets", publicWriteLimiter, createKioskTicketValidator, validate, createKioskTicket);
kioskRouter.get("/tickets/:kioskId", publicReadLimiter, kioskIdParamValidator, validate, getKioskTicket);
kioskRouter.patch("/tickets/:kioskId/cancel", publicWriteLimiter, kioskIdParamValidator, validate, cancelKioskTicket);

export default kioskRouter;
