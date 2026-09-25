import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

/**
 * Personal serve stats — JWT `/api/tickets/my-stats` (WP6).
 * Staff-only (requireStaffServing).
 */
export const useMyStats = () => {
  const { auth } = useAuth();
  const [stats, setStats] = useState(null);
  const token = auth?.token;

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const response = await apiClient.get("/tickets/my-stats", { token });
      setStats(response.data);
    } catch {
      // non-critical, the dashboard still works without this number
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, refetch: fetchStats };
};
