import { Router } from "express";
import {
  createTicket,
  getMyTicket,
  callTicket,
  completeTicket,
  skipTicket,
  cancelTicket,
  recallTicket,
  setTicketPriority,
} from "../controllers/ticket.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const ticketRouter = Router();
ticketRouter.use(protect);

ticketRouter.post("/", authorize("customer"), createTicket);
ticketRouter.get("/my-ticket", authorize("customer"), getMyTicket);
ticketRouter.patch("/:id/cancel", authorize("customer"), cancelTicket);

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

// Manager/admin override actions
ticketRouter.patch("/:id/recall", authorize("manager", "admin"), recallTicket);
ticketRouter.patch(
  "/:id/priority",
  authorize("manager", "admin"),
  setTicketPriority,
);

export default ticketRouter;
