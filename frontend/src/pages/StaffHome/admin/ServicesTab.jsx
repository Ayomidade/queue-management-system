import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../../features/auth/AuthContext";
import { fetchQueues } from "../../../features/tickets/ticketsApi";
import { createQueue, deleteQueue } from "../../../features/admin/adminApi";
import { ApiError } from "../../../lib/apiClient";
import styles from "../manager/ManagerPanel.module.css";

const ServicesTab = ({ branches }) => {
  const { auth } = useAuth();
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ serviceName: "", branch: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchQueues(auth.token);
      setQueues(res.data);
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createQueue(form, auth.token);
      setForm({ serviceName: "", branch: "" });
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.errors?.join(", ") || err.message
          : "Couldn't create service.",
      );I
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteQueue(id, auth.token);
    await load();
  };

  if (loading) return <p className={styles.status}>Loading services…</p>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {queues.length === 0 && <p className={styles.status}>No services yet.</p>}
      {queues.map((q) => (
        <div key={q._id} className={styles.row}>
          <div>
            <div>{q.serviceName}</div>
            <div className={styles.rowSub}>{q.branch?.name}</div>
          </div>
          <button
            className={styles.linkBtn}
            onClick={() => handleDelete(q._id)}
          >
            Delete
          </button>
        </div>
      ))}

      <div className={styles.subHeading}>Add service</div>
      <form onSubmit={handleCreate} className={styles.inlineForm}>
        <input
          required
          placeholder="Service name"
          value={form.serviceName}
          onChange={handleChange("serviceName")}
        />
        <select
          required
          value={form.branch}
          onChange={handleChange("branch")}
          className={styles.inlineSelect}
        >
          <option value="" disabled>
            Choose a branch
          </option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
        {error && <p className={styles.statusError}>{error}</p>}
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={submitting}
        >
          {submitting ? "Adding…" : "Add service"}
        </button>
      </form>
    </motion.div>
  );
};

export default ServicesTab;
