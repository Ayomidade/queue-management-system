import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiError } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

/**
 * Ticket history — JWT `/api/tickets/my-history` (WP6).
 * Recall is a manager/admin override, not a serve action — authorize()
 * allows staff/manager/admin.
 */
export const useTicketHistory = () => {
  const { auth } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = auth?.token;

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiClient.get("/tickets/my-history", { token });
      setTickets(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load history.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const recall = useCallback(
    async (ticketId) => {
      try {
        await apiClient.patch(`/tickets/${ticketId}/recall`, {}, { token });
        await load();
        return true;
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Couldn't recall ticket.",
        );
        return false;
      }
    },
    [token, load],
  );

  return { tickets, loading, error, recall, refetch: load };
};
