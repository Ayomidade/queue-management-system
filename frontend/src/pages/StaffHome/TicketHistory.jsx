import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import { useTicketHistory } from "../../features/staff/useTicketHistory";
import styles from "./StaffHome.module.css";

const STATUS_STYLE = {
  completed: { label: "Completed", className: styles.badgeCompleted },
  skipped: { label: "Skipped", className: styles.badgeSkipped },
};

const TicketHistory = () => {
  const { auth } = useAuth();
  const { tickets, loading, error, recall } = useTicketHistory(auth.token);

  if (loading) return <p className={styles.status}>Loading history…</p>;
  if (error) return <p className={styles.statusError}>{error}</p>;

  return (
    <div className={styles.historySection}>
      <p className={styles.sectionLabel}>Recent tickets</p>

      {tickets.length === 0 ? (
        <p className={styles.status}>No ticket history yet today.</p>
      ) : (
        <div className={styles.historyList}>
          {tickets.map((t) => {
            const badge = STATUS_STYLE[t.status] || STATUS_STYLE.completed;
            return (
              <motion.div
                key={t._id}
                className={styles.historyRow}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.historyLeft}>
                  <span className={styles.ticketNum}>
                    #{String(t.ticketNumber).padStart(4, "0")}
                  </span>
                  <span className={styles.historyMeta}>
                    {t.queue?.serviceName}
                  </span>
                  {t.user?.email && (
                    <span className={styles.historyMeta}>{t.user.email}</span>
                  )}
                </div>
                <div className={styles.historyRight}>
                  <span className={badge.className}>{badge.label}</span>
                  {t.status === "skipped" && (
                    <button
                      className={styles.recallBtn}
                      onClick={() => recall(t._id)}
                    >
                      Recall
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TicketHistory;
