import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import { useCounterOperations } from "../../features/staff/useCounterOperations";
import { fetchQueues } from "../../features/tickets/ticketsApi";
import FlapUnit from "../../components/Hero/FlapUnit";
import styles from "./StaffHome.module.css";

const CounterConsole = ({ counterState, onServed }) => {
  const { auth } = useAuth();
  const {
    counter,
    loading: counterLoading,
    error: counterError,
    toggleCounter,
  } = counterState;
  const {
    currentTicket,
    busy,
    error,
    empty,
    callNext,
    completeTicket,
    skipTicket,
  } = useCounterOperations({ onServed });

  const [queues, setQueues] = useState([]);
  const [queueId, setQueueId] = useState("");

  useEffect(() => {
    if (!auth.branch) return;
    fetchQueues(auth.token)
      .then((res) =>
        setQueues(res.data.filter((q) => q.branch?._id === auth.branch)),
      )
      .catch(() => {});
  }, [auth.token, auth.branch]);

  if (!auth.branch) {
    return (
      <p className={styles.status}>
        Counter operations apply to staff and managers assigned to a branch, not
        shown for admin accounts.
      </p>
    );
  }
  if (counterLoading)
    return <p className={styles.status}>Finding your counter…</p>;
  if (counterError) return <p className={styles.statusError}>{counterError}</p>;
  if (!counter) {
    return (
      <p className={styles.status}>
        You haven't been assigned a counter yet, ask your manager to assign one.
      </p>
    );
  }

  const chars = currentTicket
    ? currentTicket.ticketNumber.toString().padStart(4, "0").split("")
    : null;

  return (
    <div className={styles.console}>
      <div className={styles.counterHeader}>
        <div>
          <span className={styles.counterLabel}>COUNTER {counter.label}</span>
          <span
            className={counter.isOpen ? styles.badgeOpen : styles.badgeClosed}
          >
            {counter.isOpen ? "Open" : "Closed"}
          </span>
        </div>
        <button className={styles.toggleBtn} onClick={toggleCounter}>
          {counter.isOpen ? "Close counter" : "Open counter"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {currentTicket ? (
          <motion.div
            key="serving"
            className={styles.servingCard}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <span className={styles.cardEyebrow}>Now serving</span>
            <div className={styles.flapRow}>
              {chars.map((char, i) => (
                <FlapUnit key={i} char={char} />
              ))}
            </div>
            {currentTicket.user?.email && (
              <p className={styles.customerLine}>{currentTicket.user.email}</p>
            )}
            {currentTicket.priority === "priority" && (
              <span className={styles.priorityTag}>PRIORITY</span>
            )}
            <div className={styles.actionRow}>
              <button
                className={styles.completeBtn}
                onClick={completeTicket}
                disabled={busy}
              >
                Complete
              </button>
              <button
                className={styles.skipBtn}
                onClick={skipTicket}
                disabled={busy}
              >
                Skip
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            className={styles.idleCard}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <label className={styles.field}>
              <span>Service</span>
              <select
                value={queueId}
                onChange={(e) => setQueueId(e.target.value)}
              >
                <option value="" disabled>
                  Choose a service
                </option>
                {queues.map((q) => (
                  <option key={q._id} value={q._id}>
                    {q.serviceName}
                  </option>
                ))}
              </select>
            </label>

            {empty && (
              <p className={styles.status}>
                No one's waiting in that queue right now.
              </p>
            )}
            {error && <p className={styles.statusError}>{error}</p>}

            <button
              className={styles.callBtn}
              onClick={() => callNext(queueId)}
              disabled={!queueId || !counter.isOpen || busy}
            >
              {busy ? "Calling…" : "Call Next"}
            </button>
            {!counter.isOpen && (
              <p className={styles.status}>
                Open your counter to start calling tickets.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CounterConsole;
