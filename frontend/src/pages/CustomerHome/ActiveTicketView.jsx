import { motion, AnimatePresence } from "framer-motion";
import FlapUnit from "../../components/Hero/FlapUnit";
import styles from "./CustomerHome.module.css";

const STATUS_LABEL = { waiting: "Waiting", called: "You're being called" };

const ActiveTicketView = ({ ticket, onCancel }) => {
  const chars = ticket.ticketNumber.toString().padStart(4, "0").split("");
  const isCalled = ticket.status === "called";

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.ticketHeader}>
        <span className={styles.cardEyebrow}>
          {ticket.queue?.serviceName} · {ticket.branch?.name}
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={ticket.status}
            className={isCalled ? styles.badgeCalled : styles.badgeWaiting}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
          >
            {STATUS_LABEL[ticket.status] || ticket.status}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className={styles.flapRow}>
        {chars.map((char, i) => (
          <FlapUnit key={i} char={char} />
        ))}
      </div>

      {ticket.status === "waiting" && (
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{ticket.position}</span>
            <span className={styles.metricLabel}>people ahead</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue}>
              {ticket.estimatedWaitMinutes !== null
                ? `~${ticket.estimatedWaitMinutes} min`
                : "—"}
            </span>
            <span className={styles.metricLabel}>estimated wait</span>
          </div>
        </div>
      )}

      {isCalled && (
        <p className={styles.calledText}>
          Head to the counter now, your number is up.
        </p>
      )}
      {ticket.priority === "priority" && (
        <span className={styles.priorityTag}>PRIORITY</span>
      )}

      {ticket.status === "waiting" && (
        <button className={styles.cancelBtn} onClick={onCancel}>
          Cancel ticket
        </button>
      )}
    </motion.div>
  );
};

export default ActiveTicketView;
