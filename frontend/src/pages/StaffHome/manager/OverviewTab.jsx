import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../../features/auth/AuthContext";
import { fetchBranchAnalytics } from "../../../features/manager/managerApi";
import styles from "./ManagerPanel.module.css";

const tileAnim = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};

const OverviewTab = ({ branchId }) => {
  const { auth } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBranchAnalytics(branchId, auth.token)
      .then((res) => setData(res.data))
      .catch((err) =>
        setError(err.message || "Couldn't load branch analytics."),
      );
  }, [branchId, auth.token]);

  if (error) return <p className={styles.statusError}>{error}</p>;
  if (!data) return <p className={styles.status}>Loading branch overview…</p>;

  const totalQueued =
    data.ticketsToday.waiting + data.ticketsToday.called;
  const completionRate =
    data.ticketsToday.completed + data.ticketsToday.waiting + data.ticketsToday.called > 0
      ? Math.round(
          (data.ticketsToday.completed /
            (data.ticketsToday.completed +
              data.ticketsToday.waiting +
              data.ticketsToday.called)) *
            100,
        )
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* ── Key Metrics ─────────────────────────── */}
      <div className={styles.tileGrid}>
        <motion.div className={styles.tile} custom={0} variants={tileAnim} initial="hidden" animate="visible">
          <span className={styles.tileValue}>{data.ticketsToday.waiting}</span>
          <span className={styles.tileLabel}>Waiting</span>
        </motion.div>
        <motion.div className={styles.tile} custom={1} variants={tileAnim} initial="hidden" animate="visible">
          <span className={styles.tileValue}>{data.ticketsToday.called}</span>
          <span className={styles.tileLabel}>Called</span>
        </motion.div>
        <motion.div className={styles.tile} custom={2} variants={tileAnim} initial="hidden" animate="visible">
          <span className={styles.tileValue}>{data.ticketsToday.completed}</span>
          <span className={styles.tileLabel}>Completed</span>
        </motion.div>
        <motion.div className={styles.tile} custom={3} variants={tileAnim} initial="hidden" animate="visible">
          <span className={styles.tileValue}>{data.averageWaitMinutes} min</span>
          <span className={styles.tileLabel}>Avg wait</span>
        </motion.div>
      </div>

      {/* ── Completion Rate ─────────────────────── */}
      <motion.div
        className={styles.progressSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className={styles.progressHeader}>
          <span className={styles.subHeading}>Completion rate</span>
          <span className={styles.progressValue}>{completionRate}%</span>
        </div>
        <div className={styles.progressTrack}>
          <motion.div
            className={styles.progressFill}
            initial={{ width: 0 }}
            animate={{ width: `${completionRate}%` }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </motion.div>

      {/* ── Queue Lengths ───────────────────────── */}
      <div className={styles.subHeading}>Queue lengths</div>
      {data.queueLengths.length === 0 && (
        <p className={styles.status}>No one waiting anywhere right now.</p>
      )}
      {data.queueLengths.map((q, i) => {
        const maxWaiting = Math.max(...data.queueLengths.map((x) => x.waiting), 1);
        const pct = Math.round((q.waiting / maxWaiting) * 100);
        return (
          <motion.div
            key={q.queueId}
            className={styles.queueBar}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.4 + i * 0.06 }}
          >
            <div className={styles.queueBarInfo}>
              <span className={styles.queueBarName}>{q.serviceName}</span>
              <span className={styles.queueBarCount}>{q.waiting}</span>
            </div>
            <div className={styles.queueBarTrack}>
              <motion.div
                className={styles.queueBarFill}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: 0.5 + i * 0.06 }}
              />
            </div>
          </motion.div>
        );
      })}

      {/* ── Counter Status ──────────────────────── */}
      <div className={styles.subHeading}>Counter status</div>
      <div className={styles.counterGrid}>
        <div className={styles.counterStat}>
          <span className={styles.counterStatValue}>{data.counters.open}</span>
          <span className={styles.counterStatLabel}>Open</span>
        </div>
        <div className={styles.counterStat}>
          <span className={styles.counterStatValue}>
            {data.counters.total - data.counters.open}
          </span>
          <span className={styles.counterStatLabel}>Closed</span>
        </div>
        <div className={styles.counterStat}>
          <span className={styles.counterStatValue}>{data.counters.total}</span>
          <span className={styles.counterStatLabel}>Total</span>
        </div>
      </div>
    </motion.div>
  );
};

export default OverviewTab;
