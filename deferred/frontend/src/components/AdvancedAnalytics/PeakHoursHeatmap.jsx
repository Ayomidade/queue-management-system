import { useState, useEffect } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import { fetchBranchPeakHours } from "../../features/agent/agentApi";
import styles from "./AdvancedAnalytics.module.css";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getColor = (count, max) => {
  if (count === 0) return "var(--surface, #f9fafb)";
  const ratio = count / max;
  if (ratio < 0.25) return "#dbeafe";
  if (ratio < 0.5) return "#93c5fd";
  if (ratio < 0.75) return "#3b82f6";
  return "#1d4ed8";
};

const PeakHoursHeatmap = ({ branchId }) => {
  const { auth } = useAuth();
  const [data, setData] = useState(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    fetchBranchPeakHours(branchId, days, auth.token)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId, days, auth.token]);

  if (loading) return <p className={styles.loading}>Loading heatmap…</p>;
  if (!data) return null;

  const maxCount = Math.max(
    ...data.heatmap.flatMap((d) => d.hours.map((h) => h.count)),
    1,
  );

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3>Peak Hours Heatmap</h3>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className={styles.select}
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      <div className={styles.heatmapGrid}>
        <div className={styles.heatmapHeader}>
          <div className={styles.dayLabel} />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className={styles.hourLabel}>
              {h % 3 === 0 ? `${h}:00` : ""}
            </div>
          ))}
        </div>

        {data.heatmap.map((day) => (
          <div key={day.day} className={styles.heatmapRow}>
            <div className={styles.dayLabel}>{day.dayName}</div>
            {day.hours.map((hour) => (
              <div
                key={hour.hour}
                className={styles.heatmapCell}
                style={{ background: getColor(hour.count, maxCount) }}
                title={`${day.dayName} ${hour.hour}:00 — ${hour.count} tickets, avg wait ${hour.avgWaitMinutes}m`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className={styles.legend}>
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <div
            key={ratio}
            className={styles.legendBox}
            style={{
              background:
                ratio === 0
                  ? "var(--surface, #f9fafb)"
                  : ratio < 0.25
                    ? "#dbeafe"
                    : ratio < 0.5
                      ? "#93c5fd"
                      : ratio < 0.75
                        ? "#3b82f6"
                        : "#1d4ed8",
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

export default PeakHoursHeatmap;
