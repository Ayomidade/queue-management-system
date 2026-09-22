import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import styles from "./TicketPage.module.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const TicketForm = ({ onCreated }) => {
  const [queues, setQueues] = useState([]);
  const [loadingQueues, setLoadingQueues] = useState(true);
  const [branchId, setBranchId] = useState("");
  const [queueId, setQueueId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/v1/queues`)
      .then((r) => r.json())
      .then((res) => {
        if (res.status === "success") setQueues(res.data);
      })
      .catch(() => setError("Couldn't load branches."))
      .finally(() => setLoadingQueues(false));
  }, []);

  const branches = useMemo(() => {
    const map = new Map();
    queues.forEach((q) => {
      if (q.branch?._id) map.set(q.branch._id, q.branch);
    });
    return [...map.values()];
  }, [queues]);

  const servicesForBranch = useMemo(
    () => queues.filter((q) => q.branch?._id === branchId),
    [queues, branchId],
  );

  const handleBranchChange = (e) => {
    setBranchId(e.target.value);
    setQueueId("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/v1/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queueId,
          branchId,
          guestName,
          guestPhone: guestPhone || undefined,
          guestEmail: guestEmail || undefined,
          purpose: purpose || undefined,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        onCreated(data.data);
      } else {
        setError(data.message || "Couldn't create ticket.");
      }
    } catch {
      setError("Couldn't connect to server.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingQueues) return <p className={styles.status}>Loading branches…</p>;
  if (!branches.length)
    return (
      <p className={styles.status}>
        No branches are open for ticketing right now.
      </p>
    );

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <p className={styles.cardEyebrow}>Pull a ticket</p>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span>Your name</span>
          <input
            type="text"
            required
            maxLength={100}
            placeholder="e.g. John Smith"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Phone (optional)</span>
          <input
            type="tel"
            placeholder="e.g. +234 801 234 5678"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Email (optional, for notifications)</span>
          <input
            type="email"
            placeholder="e.g. john@example.com"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Purpose of visit</span>
          <input
            type="text"
            placeholder="e.g. Open a new account"
            maxLength={500}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Branch</span>
          <select required value={branchId} onChange={handleBranchChange}>
            <option value="" disabled>
              Choose a branch
            </option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Service</span>
          <select
            required
            value={queueId}
            onChange={(e) => setQueueId(e.target.value)}
            disabled={!branchId}
          >
            <option value="" disabled>
              {branchId ? "Choose a service" : "Pick a branch first"}
            </option>
            {servicesForBranch.map((q) => (
              <option key={q._id} value={q._id}>
                {q.serviceName}
              </option>
            ))}
          </select>
        </label>

        {error && <p className={styles.statusError}>{error}</p>}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={submitting || !queueId || !guestName.trim()}
        >
          {submitting ? "Pulling ticket…" : "Pull ticket"}
        </button>
      </form>
    </motion.div>
  );
};

export default TicketForm;
