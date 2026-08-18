import express, { Router } from "express";
import {
  createTicket,
  getMyTicket,
  callTicket,
  completeTicket,
  skipTicket,
  cancelTicket,
} from "../controllers/ticket.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const ticketRouter = Router();
ticketRouter.use(protect);

// User creates a ticket (joins queue)
ticketRouter.post("/", authorize("customer"), createTicket);

// User fetches their active ticket
ticketRouter.get("/my-ticket", authorize("customer"), getMyTicket);

// Staff calls a ticket
ticketRouter.patch("/:id/call", authorize("staff"), callTicket);

// Staff completes a ticket
ticketRouter.patch("/:id/complete", authorize("staff"), completeTicket);

// Staff skips a ticket
ticketRouter.patch("/:id/skip", authorize("staff"), skipTicket);

// User cancels their ticket
ticketRouter.patch("/:id/cancel", authorize("customer"), cancelTicket);

export default ticketRouter;
