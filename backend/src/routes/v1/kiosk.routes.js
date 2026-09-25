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
import { requireScope } from "../../middlewares/apiKey.middleware.js";

/**
 * V1 Kiosk Routes — API-key only.
 * Scope wiring (WP5): create/cancel need tickets:write;
 * status lookup needs tickets:read.
 * (Unauthenticated kiosk flow lives on /api/kiosk with rate limiters.)
 */

const kioskRouter = Router();

kioskRouter.post(
  "/tickets",
  requireScope("tickets:write"),
  createKioskTicketValidator,
  validate,
  createKioskTicket,
);
kioskRouter.get(
  "/tickets/:kioskId",
  requireScope("tickets:read"),
  kioskIdParamValidator,
  validate,
  getKioskTicket,
);
kioskRouter.patch(
  "/tickets/:kioskId/cancel",
  requireScope("tickets:write"),
  kioskIdParamValidator,
  validate,
  cancelKioskTicket,
);

export default kioskRouter;
