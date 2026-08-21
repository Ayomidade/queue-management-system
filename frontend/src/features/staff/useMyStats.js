import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

export const useMyStats = () => {
  const { auth } = useAuth();
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get("/tickets/my-stats", {
        token: auth.token,
      });
      setStats(response.data);
    } catch {
      // non-critical, the dashboard still works without this number
    }
  }, [auth.token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, refetch: fetchStats };
};
