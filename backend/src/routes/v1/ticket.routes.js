import { Router } from "express";
import {
  createTicket,
  getPublicTicket,
  // getMyTicket,
  callNextTicket,
  callTicket,
  completeTicket,
  skipTicket,
  cancelTicket,
  recallTicket,
  setTicketPriority,
  getMyStats,
  getMyRecentTickets,
  getBranchTickets,
  closeDay,
  openDay,
} from "../../controllers/ticket.controller.js";
import validate from "../../middlewares/validate.js";
import { requireScope } from "../../middlewares/apiKey.middleware.js";
import {
  createTicketValidator,
  callNextValidator,
  ticketIdParamValidator,
  setPriorityValidator,
  branchIdParamValidator,
} from "../../validators/ticket.validator.js";
import { auditLog } from "../../middlewares/audit.middleware.js";

/**
 * V1 Ticket Routes — API-key only (external bank systems).
 *
 * Scope wiring (WP5): every route declares the scope(s) the key needs.
 * The "admin" scope still bypasses individual checks inside requireScope.
 *
 * Guest-flow routes (create / public lookup / cancel) live on the
 * unauthenticated public router in public.routes.js and are NOT scoped
 * here — kiosk/customer flows stay open without a key.
 *
 * Serving actions (call-next / call / complete / skip) set
 * `servedBy` from the resolved Staff identity (X-Staff-Id or
 * key.defaultStaffId). resolveStaffUser only ever loads Staff, so a
 * Manager/Admin id on the header cannot reach these handlers.
 */

const ticketRouter = Router();

// POST /api/v1/tickets — Create a ticket for a customer (bank system)
ticketRouter.post(
  "/",
  requireScope("tickets:write"),
  createTicketValidator,
  validate,
  createTicket,
);

// GET /api/v1/tickets/public/:id — Look up a ticket by ID or kioskId
ticketRouter.get(
  "/public/:id",
  requireScope("tickets:read"),
  ticketIdParamValidator,
  validate,
  getPublicTicket,
);

// GET /api/v1/tickets/my-stats — Get tickets served today (staff context)
ticketRouter.get("/my-stats", requireScope("tickets:read"), getMyStats);

// PATCH /api/v1/tickets/:id/cancel — Cancel a ticket
ticketRouter.patch(
  "/:id/cancel",
  requireScope("tickets:write"),
  ticketIdParamValidator,
  validate,
  cancelTicket,
);

// POST /api/v1/tickets/call-next — Call next ticket in queue
ticketRouter.post(
  "/call-next",
  requireScope("tickets:write"),
  callNextValidator,
  validate,
  auditLog({ action: "call-next", resource: "ticket" }),
  callNextTicket,
);

// PATCH /api/v1/tickets/:id/call — Call a specific ticket
ticketRouter.patch(
  "/:id/call",
  requireScope("tickets:write"),
  ticketIdParamValidator,
  validate,
  auditLog({ action: "call-ticket", resource: "ticket" }),
  callTicket,
);

// PATCH /api/v1/tickets/:id/complete — Mark ticket as completed
ticketRouter.patch(
  "/:id/complete",
  requireScope("tickets:write"),
  ticketIdParamValidator,
  validate,
  auditLog({ action: "complete-ticket", resource: "ticket" }),
  completeTicket,
);

// PATCH /api/v1/tickets/:id/skip — Skip a ticket
ticketRouter.patch(
  "/:id/skip",
  requireScope("tickets:write"),
  ticketIdParamValidator,
  validate,
  auditLog({ action: "skip-ticket", resource: "ticket" }),
  skipTicket,
);

// GET /api/v1/tickets/branch/:branchId — List tickets for a branch
ticketRouter.get(
  "/branch/:branchId",
  requireScope("tickets:read"),
  branchIdParamValidator,
  validate,
  getBranchTickets,
);

// PATCH /api/v1/tickets/:id/recall — Recall a skipped ticket
ticketRouter.patch(
  "/:id/recall",
  requireScope("tickets:write"),
  ticketIdParamValidator,
  validate,
  recallTicket,
);

// GET /api/v1/tickets/my-history — Recent served/skipped tickets
ticketRouter.get("/my-history", requireScope("tickets:read"), getMyRecentTickets);

// PATCH /api/v1/tickets/:id/priority — Set ticket priority
ticketRouter.patch(
  "/:id/priority",
  requireScope("tickets:write"),
  setPriorityValidator,
  validate,
  setTicketPriority,
);

// POST /api/v1/tickets/close-day — Close the day
ticketRouter.post("/close-day", requireScope("tickets:write"), closeDay);

// POST /api/v1/tickets/open-day — Open the day
ticketRouter.post("/open-day", requireScope("tickets:write"), openDay);

export default ticketRouter;
