import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import {
  fetchBranchAnalytics,
  fetchBranchStaffPerformance,
} from "../../features/staff/adminApi";
import { fetchBranchCounters } from "../../features/staff/manageApi";
import styles from "./StaffHome.module.css";

/**
 * ManagerOverview — branch analytics dashboard for manager role.
 * Shows live branch status: tickets today, completion rate,
 * queue lengths, counter status, and staff performance.
 */
const ManagerOverview = () => {
  const { auth } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [counters, setCounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!auth.branch || !auth.token) return;
    try {
      const [analyticsRes, perfRes, countersRes] = await Promise.all([
        fetchBranchAnalytics(auth.branch, auth.token),
        fetchBranchStaffPerformance(auth.branch, auth.token),
        fetchBranchCounters(auth.branch, auth.token),
      ]);
      setAnalytics(analyticsRes.data);
      setPerformance(perfRes.data.staffPerformance || []);
      setCounters(countersRes.data);
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load branch overview.");
    } finally {
      setLoading(false);
    }
  }, [auth.token, auth.branch]);

  useEffect(() => {
    load();
  }, [load]);

  if (!auth.branch) {
    return (
      <p className={styles.mgmtStatus}>
        Branch overview is available for staff assigned to a branch.
      </p>
    );
  }

  if (loading) return <p className={styles.mgmtStatus}>Loading overview…</p>;
  if (error) return <p className={styles.mgmtStatusError}>{error}</p>;
  if (!analytics) return null;

  const { ticketsToday, queueLengths, averageWaitMinutes, counters: counterSummary } = analytics;
  const totalTickets =
    ticketsToday.waiting +
    ticketsToday.called +
    ticketsToday.completed +
    ticketsToday.skipped +
    ticketsToday.cancelled;
  const completionRate =
    totalTickets > 0
      ? Math.round((ticketsToday.completed / totalTickets) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* ── Summary Cards ─────────────────────────── */}
      <div className={styles.ovStatRow}>
        <div className={styles.ovStatCard}>
          <span className={styles.ovStatValue}>{totalTickets}</span>
          <span className={styles.ovStatLabel}>tickets today</span>
        </div>
        <div className={styles.ovStatCard}>
          <span className={styles.ovStatValue}>{ticketsToday.completed}</span>
          <span className={styles.ovStatLabel}>completed</span>
        </div>
        <div className={styles.ovStatCard}>
          <span className={styles.ovStatValue}>{ticketsToday.waiting}</span>
          <span className={styles.ovStatLabel}>waiting</span>
        </div>
        <div className={styles.ovStatCard}>
          <span className={styles.ovStatValue}>{averageWaitMinutes}m</span>
          <span className={styles.ovStatLabel}>avg wait</span>
        </div>
      </div>

      {/* ── Completion Rate Bar ────────────────────── */}
      <div className={styles.ovSection}>
        <div className={styles.ovBarHeader}>
          <span className={styles.ovBarLabel}>Completion rate</span>
          <span className={styles.ovBarValue}>{completionRate}%</span>
        </div>
        <div className={styles.ovBarTrack}>
          <div
            className={styles.ovBarFill}
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* ── Queue Lengths ──────────────────────────── */}
      {queueLengths.length > 0 && (
        <div className={styles.ovSection}>
          <div className={styles.mgmtSubHeading}>Queue status</div>
          {queueLengths.map((q) => (
            <div key={q.queueId} className={styles.ovQueueRow}>
              <div className={styles.ovQueueInfo}>
                <span className={styles.ovQueueName}>{q.serviceName}</span>
                <span className={styles.ovQueueCount}>{q.waiting} waiting</span>
              </div>
              <div className={styles.ovBarTrack}>
                <div
                  className={styles.ovBarFill}
                  style={{
                    width: `${Math.min((q.waiting / Math.max(...queueLengths.map((x) => x.waiting), 1)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Counter Status ─────────────────────────── */}
      <div className={styles.ovSection}>
        <div className={styles.mgmtSubHeading}>Counters</div>
        <div className={styles.ovCounterGrid}>
          <div className={styles.ovCounterStat}>
            <span className={styles.ovCounterValue}>{counterSummary.total}</span>
            <span className={styles.ovCounterLabel}>total</span>
          </div>
          <div className={styles.ovCounterStat}>
            <span className={styles.ovCounterValue}>{counterSummary.open}</span>
            <span className={styles.ovCounterLabel}>open</span>
          </div>
          <div className={styles.ovCounterStat}>
            <span className={styles.ovCounterValue}>
              {counterSummary.total - counterSummary.open}
            </span>
            <span className={styles.ovCounterLabel}>closed</span>
          </div>
        </div>
        {/* Individual counter details */}
        {counters.length > 0 && (
          <div className={styles.ovCounterList}>
            {counters.map((c) => (
              <div key={c._id} className={styles.ovCounterRow}>
                <span className={styles.ovCounterName}>Counter {c.label}</span>
                <span
                  className={
                    c.isOpen ? styles.mgmtBadgeOpen : styles.mgmtBadgeClosed
                  }
                >
                  {c.isOpen ? "Open" : "Closed"}
                </span>
                <span className={styles.mgmtRowSub}>
                  {c.assignedStaff
                    ? c.assignedStaff.name || "Assigned"
                    : "Unassigned"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Staff Performance ──────────────────────── */}
      <div className={styles.ovSection}>
        <div className={styles.mgmtSubHeading}>Staff performance</div>
        {performance.length === 0 && (
          <p className={styles.mgmtStatus}>No staff activity today.</p>
        )}
        {performance.map((p) => (
          <div key={p.staffId} className={styles.mgmtRow}>
            <div>
              <div className={styles.mgmtRowTitle}>{p.name}</div>
            </div>
            <div className={styles.mgmtRowActions}>
              <span className={styles.ovStaffCount}>
                {p.ticketsServed} served
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ManagerOverview;
