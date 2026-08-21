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

export const useMyTicket = () => {
  const { auth } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const joinedBranchRef = useRef(null);
  const refetchTimer = useRef(null);

  const fetchTicket = useCallback(async () => {
    try {
      const response = await apiClient.get("/tickets/my-ticket", {
        token: auth.token,
      });
      setTicket(response.data);
      setError(null);
    } catch (err) {
      if (err.status === 404) {
        setTicket(null);
        setError(null);
      } else {
        setError(err.message || "Couldn't load your ticket.");
      }
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  const scheduleRefetch = useCallback(() => {
    clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(fetchTicket, 400);
  }, [fetchTicket]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("user:join", auth.id));
    TICKET_EVENTS.forEach((event) => socket.on(event, scheduleRefetch));

    fetchTicket();

    return () => {
      clearTimeout(refetchTimer.current);
      socket.disconnect();
    };
  }, [auth.id, fetchTicket, scheduleRefetch]);

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
    await apiClient.patch(
      `/tickets/${ticket._id}/cancel`,
      {},
      { token: auth.token },
    );
    await fetchTicket();
  }, [ticket, auth.token, fetchTicket]);

  return { ticket, loading, error, cancelTicket, refetch: fetchTicket };
};
