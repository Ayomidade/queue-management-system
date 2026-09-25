import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

/**
 * Current staff member's counter — JWT `/api/counters/:branchId` (WP6).
 */
export const useMyCounter = () => {
  const { auth } = useAuth();
  const [counter, setCounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = auth?.token;

  const fetchCounter = useCallback(async () => {
    if (!auth.branch || !token) {
      setLoading(false);
      return;
    }
    try {
      const response = await apiClient.get(`/counters/${auth.branch}`, {
        token,
      });
      const mine = response.data.find((c) => c.assignedStaff?._id === auth.id);
      setCounter(mine || null);
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load your counter.");
    } finally {
      setLoading(false);
    }
  }, [auth.branch, auth.id, token]);

  useEffect(() => {
    fetchCounter();
  }, [fetchCounter]);

  const toggleCounter = useCallback(async () => {
    if (!counter || !token) return;
    const action = counter.isOpen ? "close" : "open";
    await apiClient.patch(`/counters/${counter._id}/${action}`, {}, { token });
    await fetchCounter();
  }, [counter, token, fetchCounter]);

  return { counter, loading, error, toggleCounter, refetch: fetchCounter };
};
