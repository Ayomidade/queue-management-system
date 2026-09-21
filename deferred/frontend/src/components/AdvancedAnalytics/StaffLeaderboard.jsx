import { useState, useEffect } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import { fetchStaffLeaderboard } from "../../features/agent/agentApi";
import styles from "./AdvancedAnalytics.module.css";

const MEDAL = ["🥇", "🥈", "🥉"];

const StaffLeaderboard = ({ branchId }) => {
  const { auth } = useAuth();
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("today");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    fetchStaffLeaderboard(branchId, period, auth.token)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId, period, auth.token]);

  if (loading) return <p className={styles.loading}>Loading leaderboard…</p>;
  if (!data) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3>Staff Leaderboard</h3>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className={styles.select}
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {data.leaderboard.length === 0 ? (
        <p className={styles.empty}>No staff activity for this period.</p>
      ) : (
        <div className={styles.leaderboard}>
          {data.leaderboard.map((entry) => (
            <div key={entry.staffId} className={styles.lbRow}>
              <span className={styles.lbRank}>
                {MEDAL[entry.rank - 1] || `#${entry.rank}`}
              </span>
              <span className={styles.lbName}>{entry.name}</span>
              <span className={styles.lbStat}>
                {entry.ticketsServed} tickets
              </span>
              {entry.avgHandleMinutes !== null && (
                <span className={styles.lbSub}>
                  ~{entry.avgHandleMinutes}m avg
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffLeaderboard;
