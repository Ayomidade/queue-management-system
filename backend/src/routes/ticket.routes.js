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
import { protect, authorize } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.js";
import {
  createTicketValidator,
  callNextValidator,
  ticketIdParamValidator,
  setPriorityValidator,
  branchIdParamValidator,
} from "../validators/ticket.validator.js";
import { auditLog } from "../middlewares/audit.middleware.js";

const ticketRouter = Router();

// Public routes — no auth required
ticketRouter.post("/", createTicketValidator, validate, createTicket);
ticketRouter.get("/public/:id", getPublicTicket);
ticketRouter.patch("/:id/cancel", ticketIdParamValidator, validate, cancelTicket);

// Protected staff routes
ticketRouter.use(protect);

ticketRouter.get(
  "/my-stats",
  authorize("staff", "manager", "admin"),
  getMyStats,
);

ticketRouter.post(
  "/call-next",
  authorize("staff", "manager", "admin"),
  callNextValidator,
  validate,
  auditLog({ action: "call-next", resource: "ticket" }),
  callNextTicket,
);
ticketRouter.patch(
  "/:id/call",
  authorize("staff", "manager", "admin"),
  ticketIdParamValidator,
  validate,
  auditLog({ action: "call-ticket", resource: "ticket" }),
  callTicket,
);
ticketRouter.patch(
  "/:id/complete",
  authorize("staff", "manager", "admin"),
  ticketIdParamValidator,
  validate,
  auditLog({ action: "complete-ticket", resource: "ticket" }),
  completeTicket,
);
ticketRouter.patch(
  "/:id/skip",
  authorize("staff", "manager", "admin"),
  ticketIdParamValidator,
  validate,
  auditLog({ action: "skip-ticket", resource: "ticket" }),
  skipTicket,
);

// Manager/admin branch tickets
ticketRouter.get(
  "/branch/:branchId",
  authorize("manager", "admin"),
  branchIdParamValidator,
  validate,
  getBranchTickets,
);

// Staff/manager/admin recall a skipped ticket
ticketRouter.patch(
  "/:id/recall",
  authorize("staff", "manager", "admin"),
  ticketIdParamValidator,
  validate,
  recallTicket,
);

ticketRouter.get(
  "/my-history",
  authorize("staff", "manager", "admin"),
  getMyRecentTickets,
);
ticketRouter.patch(
  "/:id/priority",
  authorize("manager", "admin"),
  setPriorityValidator,
  validate,
  setTicketPriority,
);

ticketRouter.post(
  "/close-day",
  authorize("manager"),
  closeDay,
);
ticketRouter.post(
  "/open-day",
  authorize("manager"),
  openDay,
);

export default ticketRouter;
