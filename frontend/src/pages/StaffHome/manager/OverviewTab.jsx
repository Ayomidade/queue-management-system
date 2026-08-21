import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../../features/auth/AuthContext";
import { fetchBranchAnalytics } from "../../../features/manager/managerApi";
import styles from "./ManagerPanel.module.css";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className={styles.tileGrid}>
        <div className={styles.tile}>
          <span className={styles.tileValue}>{data.ticketsToday.waiting}</span>
          <span className={styles.tileLabel}>Waiting</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileValue}>{data.ticketsToday.called}</span>
          <span className={styles.tileLabel}>Called</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileValue}>
            {data.ticketsToday.completed}
          </span>
          <span className={styles.tileLabel}>Completed today</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileValue}>
            {data.averageWaitMinutes} min
          </span>
          <span className={styles.tileLabel}>Average wait</span>
        </div>
      </div>

      <div className={styles.subHeading}>Queue lengths</div>
      {data.queueLengths.length === 0 && (
        <p className={styles.status}>No one waiting anywhere right now.</p>
      )}
      {data.queueLengths.map((q) => (
        <div key={q.queueId} className={styles.row}>
          <span>{q.serviceName}</span>
          <span className={styles.rowValue}>{q.waiting} waiting</span>
        </div>
      ))}

      <div className={styles.subHeading}>Counters</div>
      <p className={styles.status}>
        {data.counters.open} of {data.counters.total} open
      </p>
    </motion.div>
  );
};

export default OverviewTab;
