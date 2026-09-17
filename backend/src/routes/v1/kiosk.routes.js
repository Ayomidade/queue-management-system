import { Router } from "express";
import {
  createKioskTicket,
  getKioskTicket,
  cancelKioskTicket,
} from "../../controllers/kiosk.controller.js";
import {
  createKioskTicketValidator,
  kioskIdParamValidator,
} from "../../validators/kiosk.validator.js";
import validate from "../../middlewares/validate.js";

/**
 * V1 Kiosk Routes
 *
 * Uses the original kiosk controller with optional bank-scoping.
 * The controller validates branch ownership when req.bankName is set.
 */

const kioskRouter = Router();

kioskRouter.post("/tickets", createKioskTicketValidator, validate, createKioskTicket);
kioskRouter.get("/tickets/:kioskId", kioskIdParamValidator, validate, getKioskTicket);
kioskRouter.patch("/tickets/:kioskId/cancel", kioskIdParamValidator, validate, cancelKioskTicket);

export default kioskRouter;
