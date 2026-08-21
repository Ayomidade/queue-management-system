import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import { fetchQueues, createTicket } from "../../features/tickets/ticketsApi";
import { ApiError } from "../../lib/apiClient";
import styles from "./CustomerHome.module.css";

const CreateTicketFlow = ({ onCreated }) => {
  const { auth } = useAuth();
  const [queues, setQueues] = useState([]);
  const [loadingQueues, setLoadingQueues] = useState(true);
  const [branchId, setBranchId] = useState("");
  const [queueId, setQueueId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchQueues(auth.token)
      .then((res) => setQueues(res.data))
      .catch((err) => setError(err.message || "Couldn't load branches."))
      .finally(() => setLoadingQueues(false));
  }, [auth.token]);

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
      await createTicket({ queueId, branchId }, auth.token);
      onCreated();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't create your ticket, try again.",
      );
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
          disabled={submitting || !queueId}
        >
          {submitting ? "Pulling ticket…" : "Pull ticket"}
        </button>
      </form>
    </motion.div>
  );
};

export default CreateTicketFlow;
