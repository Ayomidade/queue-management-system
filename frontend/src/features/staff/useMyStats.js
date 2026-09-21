import { useCallback, useEffect, useState } from "react";
import { apiClient, v1Api } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";

export const useMyStats = () => {
  const { auth } = useAuth();
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await v1Api.get("/tickets/my-stats", {
        apiKey: auth.apiKey,
      });
      setStats(response.data);
    } catch {
      // non-critical, the dashboard still works without this number
    }
  }, [auth.apiKey]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, refetch: fetchStats };
};
