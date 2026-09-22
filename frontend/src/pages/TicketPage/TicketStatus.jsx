import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./TicketPage.module.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const STATUS_LABELS = {
  waiting: "Waiting",
  called: "Please Proceed",
  skipped: "Skipped",
  cancelled: "Cancelled",
  completed: "Completed",
};

const FlipDigit = ({ char }) => (
  <span className={styles.flipDigit}>{char}</span>
);

const TicketStatus = ({ ticket: initialTicket, onCancel, onNewTicket }) => {
  const [ticket, setTicket] = useState(initialTicket);

  // Poll for status updates every 10 seconds
  useEffect(() => {
    if (!ticket?.kioskId && !ticket?._id) return;

    const interval = setInterval(async () => {
      try {
        const id = ticket.kioskId || ticket._id;
        const res = await fetch(`${API_URL}/v1/tickets/public/${id}`);
        const data = await res.json();
        if (data.status === "success") {
          setTicket(data.data);
        }
      } catch {
        // Silently retry on next interval
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [ticket?.kioskId, ticket?._id]);

  const ticketNumber = String(ticket.ticketNumber).padStart(4, "0");
  const isWaiting = ticket.status === "waiting";
  const isCalled = ticket.status === "called";
  const isActive = isWaiting || isCalled;

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.ticketHeader}>
        <p className={styles.cardEyebrow}>Your ticket</p>
        <span
          className={isCalled ? styles.badgeCalled : styles.badgeWaiting}
        >
          {STATUS_LABELS[ticket.status] || ticket.status}
        </span>
      </div>

      {ticket.priority === "priority" && (
        <span className={styles.priorityTag}>Priority</span>
      )}

      <div className={styles.flapRow}>
        {ticketNumber.split("").map((digit, i) => (
          <FlipDigit key={i} char={digit} />
        ))}
      </div>

      {ticket.guestName && (
        <p className={styles.guestInfo}>
          {ticket.guestName}
          {ticket.purpose && <> — {ticket.purpose}</>}
        </p>
      )}

      {isCalled && (
        <p className={styles.calledText}>
          Please proceed to the counter now
        </p>
      )}

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricValue}>
            {ticket.position ?? "—"}
          </span>
          <span className={styles.metricLabel}>Position</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricValue}>
            {ticket.estimatedWaitMinutes != null
              ? `${ticket.estimatedWaitMinutes}m`
              : "—"}
          </span>
          <span className={styles.metricLabel}>Est. wait</span>
        </div>
      </div>

      {ticket.queue?.serviceName && (
        <p className={styles.serviceInfo}>
          Service: {ticket.queue.serviceName}
        </p>
      )}

      {ticket.branch?.name && (
        <p className={styles.serviceInfo}>
          Branch: {ticket.branch.name}
        </p>
      )}

      {isActive && (
        <button className={styles.cancelBtn} onClick={onCancel}>
          Cancel ticket
        </button>
      )}

      {!isActive && (
        <button className={styles.submitBtn} onClick={onNewTicket}>
          Pull a new ticket
        </button>
      )}

      {ticket.branch && (
        <Link
          to={`/board/${ticket.branch._id || ticket.branch}`}
          className={styles.boardLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          View Live Queue →
        </Link>
      )}
    </motion.div>
  );
};

export default TicketStatus;
