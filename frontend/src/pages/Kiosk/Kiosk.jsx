import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import { apiClient } from "../../lib/apiClient";
import { createKioskTicket, getKioskTicket, cancelKioskTicket } from "../../features/kiosk/kioskApi";
import styles from "./Kiosk.module.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

const TICKET_EVENTS = [
  "ticket:called",
  "ticket:completed",
  "ticket:skipped",
  "ticket:no-show",
  "ticket:cancelled",
  "queue:updated",
];

const Kiosk = () => {
  const { branchId } = useParams();
  const [branch, setBranch] = useState(null);
  const [queues, setQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [step, setStep] = useState("pick"); // pick | ticket | error
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const refetchTimer = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get(`/branches/public/${branchId}`);
        setBranch(res.data.branch);
        setQueues(res.data.queues);
      } catch {
        setError("Branch not found");
      }
    };
    load();
  }, [branchId]);

  const handleTrackKiosk = useCallback(async (kioskId) => {
    try {
      const res = await getKioskTicket(kioskId);
      setTicket(res.data);
      setStep("ticket");
    } catch {
      setError("Ticket not found");
    }
  }, []);

  useEffect(() => {
    if (step !== "ticket" || !ticket?.kioskId || !branchId) return;

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.on("connect", () => {
      socket.emit("branch:join", branchId);
    });

    const scheduleRefetch = () => {
      clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(() => {
        handleTrackKiosk(ticket.kioskId);
      }, 400);
    };
    TICKET_EVENTS.forEach((event) => socket.on(event, scheduleRefetch));

    return () => {
      clearTimeout(refetchTimer.current);
      socket.disconnect();
    };
  }, [step, ticket?.kioskId, branchId, handleTrackKiosk]);

  const handleTakeTicket = async () => {
    if (!selectedQueue) return;
    setLoading(true);
    setError(null);
    try {
      const res = await createKioskTicket({
        queueId: selectedQueue,
        branchId,
        guestName: guestName || undefined,
        guestPhone: guestPhone || undefined,
      });
      setTicket(res.data);
      setStep("ticket");
    } catch (err) {
      setError(err.message || "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!ticket?.kioskId) return;
    try {
      await cancelKioskTicket(ticket.kioskId);
      setStep("pick");
      setTicket(null);
      setSelectedQueue("");
    } catch (err) {
      setError(err.message || "Failed to cancel");
    }
  };

  if (error && !branch) {
    return (
      <div className={styles.kiosk}>
        <p className={styles.error}>{error}</p>
        <Link to={`/branch/${branchId}`} className={styles.backLink}>
          ← Back to branch
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.kiosk}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {step === "pick" && (
          <>
            <p className={styles.eyebrow}>Kiosk Check-in</p>
            <h1 className={styles.title}>
              {branch ? branch.name : "Loading…"}
            </h1>
            <p className={styles.subtitle}>
              {branch?.location} · Pick a service and take a ticket
            </p>

            {queues.length === 0 ? (
              <p className={styles.empty}>No services available right now.</p>
            ) : (
              <>
                <div className={styles.queueList}>
                  {queues.map((q) => (
                    <button
                      key={q.id}
                      className={`${styles.queueBtn} ${selectedQueue === q.id ? styles.queueBtnActive : ""}`}
                      onClick={() => setSelectedQueue(q.id)}
                    >
                      <span className={styles.queueName}>{q.serviceName}</span>
                      <span className={styles.queueWait}>
                        {q.waiting} waiting
                      </span>
                    </button>
                  ))}
                </div>

                <div className={styles.guestFields}>
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className={styles.input}
                  />
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className={styles.input}
                  />
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <button
                  className={styles.takeBtn}
                  onClick={handleTakeTicket}
                  disabled={!selectedQueue || loading}
                >
                  {loading ? "Taking ticket…" : "Take a Ticket"}
                </button>
              </>
            )}

            <Link to={`/branch/${branchId}`} className={styles.backLink}>
              ← Back to branch
            </Link>
          </>
        )}

        {step === "ticket" && ticket && (
          <>
            <p className={styles.eyebrow}>Your Ticket</p>
            <motion.div
              className={styles.ticketNumber}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              #{String(ticket.ticketNumber).padStart(4, "0")}
            </motion.div>
            <p className={styles.ticketQueue}>{ticket.queue}</p>
            <p className={styles.ticketKioskId}>
              Kiosk ID: {ticket.kioskId}
            </p>
            {ticket.position > 0 && (
              <p className={styles.ticketPosition}>
                {ticket.position} {ticket.position === 1 ? "person" : "people"} ahead
              </p>
            )}
            {ticket.status === "called" && (
              <motion.p
                className={styles.called}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                Please proceed to the counter!
              </motion.p>
            )}

            <div className={styles.ticketActions}>
              <button className={styles.refreshBtn} onClick={() => handleTrackKiosk(ticket.kioskId)}>
                Refresh Status
              </button>
              {ticket.status === "waiting" && (
                <button className={styles.cancelBtn} onClick={handleCancel}>
                  Cancel Ticket
                </button>
              )}
            </div>

            <Link to={`/board/${branchId}`} className={styles.boardLink}>
              View Live Board →
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Kiosk;
