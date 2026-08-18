import Ticket from "../models/ticket.model.js";
import { emitToBranch, emitToUser } from "../socket.js";

const NO_SHOW_MINUTES = Number(process.env.TICKET_NO_SHOW_MINUTES) || 5;
const SWEEP_INTERVAL_MS = 60 * 1000;

const sweepStaleCalledTickets = async () => {
  const cutoff = new Date(Date.now() - NO_SHOW_MINUTES * 60 * 1000);
  const staleTickets = await Ticket.find({
    status: "called",
    calledAt: { $lte: cutoff },
  });

  for (const ticket of staleTickets) {
    ticket.status = "skipped";
    await ticket.save();

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

// NOTE: setInterval only works correctly for a single server process.
// If this ever runs behind multiple instances, move this to a proper
// job queue (BullMQ, Agenda) so it doesn't double-process.
export const startNoShowSweeper = () => {
  setInterval(() => {
    sweepStaleCalledTickets().catch((error) => {
      console.error("No-show sweep failed:", error.message);
    });
  }, SWEEP_INTERVAL_MS);
};
