import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../lib/apiClient";
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
      const response = await apiClient.get(`/counters/${auth.branch}`, {
        token: auth.token,
      });
      const mine = response.data.find((c) => c.assignedStaff?._id === auth.id);
      setCounter(mine || null);
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load your counter.");
    } finally {
      setLoading(false);
    }
  }, [auth.branch, auth.token, auth.id]);

  useEffect(() => {
    fetchCounter();
  }, [fetchCounter]);

  const toggleCounter = useCallback(async () => {
    if (!counter) return;
    const action = counter.isOpen ? "close" : "open";
    await apiClient.patch(
      `/counters/${counter._id}/${action}`,
      {},
      { token: auth.token },
    );
    await fetchCounter();
  }, [counter, auth.token, fetchCounter]);

  return { counter, loading, error, toggleCounter, refetch: fetchCounter };
};
