import { useCallback, useState } from "react";
import { apiClient, ApiError, v1Api } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

export const useCounterOperations = ({ onServed } = {}) => {
  const { auth } = useAuth();
  const [currentTicket, setCurrentTicket] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [empty, setEmpty] = useState(false);

  const callNext = useCallback(
    async (queueId) => {
      setBusy(true);
      setError(null);
      setEmpty(false);
      try {
        const response = await v1Api.post(
          "/tickets/call-next",
          { queueId },
          { apiKey: auth.apiKey },
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
    [auth.apiKey],
  );

  const resolveTicket = useCallback(
    async (action) => {
      if (!currentTicket) return;
      setBusy(true);
      setError(null);
      try {
        await v1Api.patch(
          `/tickets/${currentTicket._id}/${action}`,
          {},
          { apiKey: auth.apiKey },
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
    [currentTicket, auth.apiKey, onServed],
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
