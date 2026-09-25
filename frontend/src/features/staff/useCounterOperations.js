import { useCallback, useState } from "react";
import { ApiError, apiClient } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

/**
 * Counter serve operations — JWT `/api/tickets/*` (WP6).
 * Only staff may call these (requireStaffServing on the backend).
 */
export const useCounterOperations = ({ onServed } = {}) => {
  const { auth } = useAuth();
  const [currentTicket, setCurrentTicket] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [empty, setEmpty] = useState(false);

  const token = auth?.token;

  const callNext = useCallback(
    async (queueId) => {
      setBusy(true);
      setError(null);
      setEmpty(false);
      try {
        const response = await apiClient.post(
          "/tickets/call-next",
          { queueId },
          { token },
        );
        setCurrentTicket(response.data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) setEmpty(true);
        else
          setError(
            err instanceof ApiError
              ? err.message
              : "Couldn't call the next ticket.",
          );
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  const resolveTicket = useCallback(
    async (action) => {
      if (!currentTicket) return;
      setBusy(true);
      setError(null);
      try {
        await apiClient.patch(
          `/tickets/${currentTicket._id}/${action}`,
          {},
          { token },
        );
        setCurrentTicket(null);
        onServed?.();
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "That didn't go through, try again.",
        );
      } finally {
        setBusy(false);
      }
    },
    [currentTicket, token, onServed],
  );

  return {
    currentTicket,
    busy,
    error,
    empty,
    callNext,
    completeTicket: () => resolveTicket("complete"),
    skipTicket: () => resolveTicket("skip"),
  };
};
