import Ticket from "../models/ticket.model.js";
import { emitToBranch, emitToUser } from "../socket.js";

const NO_SHOW_MINUTES = Number(process.env.TICKET_NO_SHOW_MINUTES) || 5;
const SWEEP_INTERVAL_MS = 60 * 1000;

const sweepStaleCalledTickets = async () => {
  const cutoff = new Date(Date.now() - NO_SHOW_MINUTES * 60 * 1000);

  // Use atomic findOneAndUpdate so multiple server instances
  // don't double-process the same ticket. Each ticket is only
  // swept once — the status check ensures idempotency.
  let ticket;
  while (
    (ticket = await Ticket.findOneAndUpdate(
      { status: "called", calledAt: { $lte: cutoff } },
      { $set: { status: "skipped" } },
      { new: true },
    ))
  ) {
    emitToBranch(String(ticket.branch), "ticket:no-show", {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      queueId: ticket.queue,
    });
    emitToUser(String(ticket.user), "ticket:no-show", {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
    });
  }
};

// Uses atomic findOneAndUpdate so it is safe to run across
// multiple server instances — each ticket is swept exactly once.
export const startNoShowSweeper = () => {
  setInterval(() => {
    sweepStaleCalledTickets().catch((error) => {
      console.error("No-show sweep failed:", error.message);
    });
  }, SWEEP_INTERVAL_MS);
};
