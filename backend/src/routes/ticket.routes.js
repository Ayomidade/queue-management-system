import { Router } from "express";
import {
  createTicket,
  getMyTicket,
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
} from "../controllers/ticket.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const ticketRouter = Router();
ticketRouter.use(protect);

ticketRouter.post("/", authorize("customer"), createTicket);
ticketRouter.get("/my-ticket", authorize("customer"), getMyTicket);
ticketRouter.get(
  "/my-stats",
  authorize("staff", "manager", "admin"),
  getMyStats,
);
ticketRouter.patch("/:id/cancel", authorize("customer"), cancelTicket);

ticketRouter.post(
  "/call-next",
  authorize("staff", "manager", "admin"),
  callNextTicket,
);
ticketRouter.patch(
  "/:id/call",
  authorize("staff", "manager", "admin"),
  callTicket,
);
ticketRouter.patch(
  "/:id/complete",
  authorize("staff", "manager", "admin"),
  completeTicket,
);
ticketRouter.patch(
  "/:id/skip",
  authorize("staff", "manager", "admin"),
  skipTicket,
);

// Manager/admin branch tickets
ticketRouter.get(
  "/branch/:branchId",
  authorize("manager", "admin"),
  getBranchTickets,
);

// Staff/manager/admin recall a skipped ticket
ticketRouter.patch(
  "/:id/recall",
  authorize("staff", "manager", "admin"),
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
