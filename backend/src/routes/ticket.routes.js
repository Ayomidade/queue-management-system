import { Router } from "express";
import {
  createTicket,
  getPublicTicket,
  cancelTicket,
  callNextTicket,
  callTicket,
  completeTicket,
  skipTicket,
  recallTicket,
  setTicketPriority,
  getMyStats,
  getMyRecentTickets,
  getBranchTickets,
  closeDay,
  openDay,
} from "../controllers/ticket.controller.js";
import {
  protect,
  authorize,
  requireStaffServing,
} from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.js";
import {
  createTicketValidator,
  callNextValidator,
  ticketIdParamValidator,
  setPriorityValidator,
  branchIdParamValidator,
} from "../validators/ticket.validator.js";
import { auditLog } from "../middlewares/audit.middleware.js";
import { publicReadLimiter, publicWriteLimiter } from "../middlewares/rateLimiter.js";

const ticketRouter = Router();

// Public routes — no auth required
ticketRouter.post(
  "/",
  publicWriteLimiter,
  createTicketValidator,
  validate,
  createTicket,
);
ticketRouter.get("/public/:id", publicReadLimiter, getPublicTicket);
ticketRouter.patch(
  "/:id/cancel",
  publicWriteLimiter,
  ticketIdParamValidator,
  validate,
  cancelTicket,
);

// Everything below requires a JWT (staff/manager/admin).
ticketRouter.use(protect);

// ── Serving actions — STAFF ONLY (WP5) ─────────────────────────
// Managers oversee the branch but do not serve; admins do not serve either.
// Ticket.servedBy stays ref:"Staff". Recall/priority/close-day stay below
// (manager/admin overrides are not serving).
ticketRouter.get("/my-stats", requireStaffServing, getMyStats);

ticketRouter.post(
  "/call-next",
  requireStaffServing,
  callNextValidator,
  validate,
  auditLog({ action: "call-next", resource: "ticket" }),
  callNextTicket,
);
ticketRouter.patch(
  "/:id/call",
  requireStaffServing,
  ticketIdParamValidator,
  validate,
  auditLog({ action: "call-ticket", resource: "ticket" }),
  callTicket,
);
ticketRouter.patch(
  "/:id/complete",
  requireStaffServing,
  ticketIdParamValidator,
  validate,
  auditLog({ action: "complete-ticket", resource: "ticket" }),
  completeTicket,
);
ticketRouter.patch(
  "/:id/skip",
  requireStaffServing,
  ticketIdParamValidator,
  validate,
  auditLog({ action: "skip-ticket", resource: "ticket" }),
  skipTicket,
);

// Manager/admin branch tickets (oversight — not serving)
ticketRouter.get(
  "/branch/:branchId",
  authorize("manager", "admin"),
  branchIdParamValidator,
  validate,
  getBranchTickets,
);

// Staff/manager/admin recall a skipped ticket (manager override is not serving)
ticketRouter.patch(
  "/:id/recall",
  authorize("staff", "manager", "admin"),
  ticketIdParamValidator,
  validate,
  recallTicket,
);

ticketRouter.get("/my-history", requireStaffServing, getMyRecentTickets);

// Priority + day open/close are manager/admin oversight — never staff serve.
ticketRouter.patch(
  "/:id/priority",
  authorize("manager", "admin"),
  setPriorityValidator,
  validate,
  setTicketPriority,
);

ticketRouter.post("/close-day", authorize("manager"), closeDay);
ticketRouter.post("/open-day", authorize("manager"), openDay);

export default ticketRouter;
