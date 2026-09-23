import { Router } from "express";
import {
  getPublicTicket,
  createTicket,
  cancelTicket,
} from "../../controllers/ticket.controller.js";
import { getBranchQueues } from "../../controllers/queue.controller.js";
import {
  createTicketValidator,
  ticketIdParamValidator,
} from "../../validators/ticket.validator.js";
import validate from "../../middlewares/validate.js";

/**
 * Public V1 Routes
 *
 * These endpoints are mounted under /api/v1 WITHOUT authentication.
 * They serve the guest ticket flow — customers create tickets,
 * check status, and cancel without logging in.
 *
 * Mounted before the authenticated v1Router in app.js.
 */
const publicRouter = Router();

publicRouter.get("/queues", getBranchQueues);

publicRouter.post(
  "/tickets",
  createTicketValidator,
  validate,
  createTicket,
);

publicRouter.get(
  "/tickets/public/:id",
  ticketIdParamValidator,
  validate,
  getPublicTicket,
);

publicRouter.patch(
  "/tickets/:id/cancel",
  ticketIdParamValidator,
  validate,
  cancelTicket,
);

export default publicRouter;
