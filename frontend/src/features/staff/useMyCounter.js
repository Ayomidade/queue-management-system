import { useCallback, useEffect, useState } from "react";
import { apiClient, v1Api } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

export const useMyCounter = () => {
  const { auth } = useAuth();
  const [counter, setCounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCounter = useCallback(async () => {
    if (!auth.branch) {
      setLoading(false);
      return;
    }
    try {
      const response = await v1Api.get(`/counters/${auth.branch}`, {
        apiKey: auth.apiKey,
      });
      const mine = response.data.find((c) => c.assignedStaff?._id === auth.id);
      setCounter(mine || null);
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load your counter.");
    } finally {
      setLoading(false);
    }
  }, [auth.branch, auth.apiKey, auth.id]);

  useEffect(() => {
    fetchCounter();
  }, [fetchCounter]);

  const toggleCounter = useCallback(async () => {
    if (!counter) return;
    const action = counter.isOpen ? "close" : "open";
    await v1Api.patch(
      `/counters/${counter._id}/${action}`,
      {},
      { apiKey: auth.apiKey },
    );
    await fetchCounter();
  }, [counter, auth.apiKey, fetchCounter]);

  return { counter, loading, error, toggleCounter, refetch: fetchCounter };
};
