import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { apiClient } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

const TICKET_EVENTS = [
  "ticket:called",
  "ticket:completed",
  "ticket:skipped",
  "ticket:no-show",
  "ticket:cancelled",
  "ticket:recalled",
  "queue:updated",
];

/**
 * Public ticket lookup — guest kiosk flow.
 *
 * Lookup and cancellation use the public v1 guest routes without auth.
 * Socket auth uses the JWT when present, otherwise nothing.
 */
export const useMyTicket = (ticketId, ticketToken) => {
  const { auth } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const joinedBranchRef = useRef(null);
  const refetchTimer = useRef(null);
  const token = auth?.token || null;

  const fetchTicket = useCallback(async () => {
    if (!ticketId) {
      setTicket(null);
      setLoading(false);
      return;
    }
    try {
      // Public v1 route — no Bearer needed for read.
      const tokenQuery = ticketToken
        ? `?token=${encodeURIComponent(ticketToken)}`
        : "";
      const response = await apiClient.get(
        `/v1/tickets/public/${ticketId}${tokenQuery}`,
      );
      setTicket(response.data);
      setError(null);
    } catch (err) {
      if (err.status === 404) {
        setTicket(null);
        setError(null);
      } else {
        setError(err.message || "Couldn't load ticket.");
      }
    } finally {
      setLoading(false);
    }
  }, [ticketId, ticketToken]);

  const scheduleRefetch = useCallback(() => {
    clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(fetchTicket, 400);
  }, [fetchTicket]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      // JWT when signed in; guests join with no auth (public board events).
      auth: token ? { token } : {},
    });
    socketRef.current = socket;

    if (auth?.id) {
      socket.on("connect", () => socket.emit("user:join", auth.id));
    }
    TICKET_EVENTS.forEach((event) => socket.on(event, scheduleRefetch));

    fetchTicket();

    return () => {
      clearTimeout(refetchTimer.current);
      socket.disconnect();
    };
  }, [auth?.id, token, fetchTicket, scheduleRefetch]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!ticket || !socket) return;

    const branchId = ticket.branch?._id || ticket.branch;
    if (branchId && joinedBranchRef.current !== branchId) {
      socket.emit("branch:join", branchId);
      joinedBranchRef.current = branchId;
    }
  }, [ticket]);

  const cancelTicket = useCallback(async () => {
    if (!ticket) return;
    await apiClient.patch(`/v1/tickets/${ticket._id}/cancel`, {}, {
      headers: ticketToken ? { "X-Ticket-Token": ticketToken } : {},
    });
    await fetchTicket();
  }, [ticket, ticketToken, fetchTicket]);

  return { ticket, loading, error, cancelTicket, refetch: fetchTicket };
};
