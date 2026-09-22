import { Router } from "express";
import {
  createTicket,
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
import {
  createTicketValidator,
  callNextValidator,
  ticketIdParamValidator,
  setPriorityValidator,
  branchIdParamValidator,
} from "../../validators/ticket.validator.js";
import { auditLog } from "../../middlewares/audit.middleware.js";

/**
 * V1 Ticket Routes
 *
 * Ticket management endpoints scoped to the requesting bank.
 *
 * In the integration model, the bank's system creates tickets on behalf
 * of customers. The bank's staff calls tickets at counters.
 *
 * Important: These routes still use the legacy controllers which expect
 * req.user and req.role from JWT auth. For the v1 API, we use API key
 * auth instead. The bank's system should use these endpoints to:
 * - Create tickets for customers (POST /)
 * - Call next ticket (POST /call-next)
 * - Complete/skip tickets (PATCH /:id/complete, /:id/skip)
 * - View branch tickets (GET /branch/:branchId)
 *
 * All routes require API key authentication.
 * Write operations require tickets:write scope.
 */

const ticketRouter = Router();

// POST /api/v1/tickets — Create a ticket for a customer
ticketRouter.post("/", createTicketValidator, validate, createTicket);

// GET /api/v1/tickets/my-ticket — Get active ticket (requires user context)
// NOTE: In v1, this endpoint requires the bank to pass a userId query param
// or use a different identification mechanism. For now, it uses JWT auth.
// ticketRouter.get("/my-ticket", getMyTicket);

// GET /api/v1/tickets/my-stats — Get tickets served today (requires user context)
ticketRouter.get("/my-stats", getMyStats);

// PATCH /api/v1/tickets/:id/cancel — Cancel a ticket
ticketRouter.patch("/:id/cancel", ticketIdParamValidator, validate, cancelTicket);

// POST /api/v1/tickets/call-next — Call next ticket in queue
ticketRouter.post("/call-next", callNextValidator, validate, auditLog({ action: "call-next", resource: "ticket" }), callNextTicket);

// PATCH /api/v1/tickets/:id/call — Call a specific ticket
ticketRouter.patch("/:id/call", ticketIdParamValidator, validate, auditLog({ action: "call-ticket", resource: "ticket" }), callTicket);

// PATCH /api/v1/tickets/:id/complete — Mark ticket as completed
ticketRouter.patch("/:id/complete", ticketIdParamValidator, validate, auditLog({ action: "complete-ticket", resource: "ticket" }), completeTicket);

// PATCH /api/v1/tickets/:id/skip — Skip a ticket
ticketRouter.patch("/:id/skip", ticketIdParamValidator, validate, auditLog({ action: "skip-ticket", resource: "ticket" }), skipTicket);

// GET /api/v1/tickets/branch/:branchId — List tickets for a branch
ticketRouter.get("/branch/:branchId", branchIdParamValidator, validate, getBranchTickets);

// PATCH /api/v1/tickets/:id/recall — Recall a skipped ticket
ticketRouter.patch("/:id/recall", ticketIdParamValidator, validate, recallTicket);

// GET /api/v1/tickets/my-history — Recent served/skipped tickets
ticketRouter.get("/my-history", getMyRecentTickets);

// PATCH /api/v1/tickets/:id/priority — Set ticket priority
ticketRouter.patch("/:id/priority", setPriorityValidator, validate, setTicketPriority);

// POST /api/v1/tickets/close-day — Close the day
ticketRouter.post("/close-day", closeDay);

// POST /api/v1/tickets/open-day — Open the day
ticketRouter.post("/open-day", openDay);

export default ticketRouter;
