import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiError, v1Api } from "../../lib/apiClient";

export const useTicketHistory = (apiKey) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await v1Api.get("/tickets/my-history", { apiKey });
      setTickets(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load history.");
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    load();
  }, [load]);

  const recall = useCallback(
    async (ticketId) => {
      try {
        await v1Api.patch(`/tickets/${ticketId}/recall`, {}, { apiKey });
        await load();
        return true;
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Couldn't recall ticket.",
        );
        return false;
      }
    },
    [apiKey, load],
  );

  return { tickets, loading, error, recall, refetch: load };
};
