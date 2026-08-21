import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../../features/auth/AuthContext";
import { createBranch, deleteBranch } from "../../../features/admin/adminApi";
import { ApiError } from "../../../lib/apiClient";
import styles from "../manager/ManagerPanel.module.css";

const BranchesTab = ({ branches, onChanged }) => {
  const { auth } = useAuth();
  const [form, setForm] = useState({ name: "", location: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createBranch(form, auth.token);
      setForm({ name: "", location: "" });
      onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.errors?.join(", ") || err.message
          : "Couldn't create branch.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteBranch(id, auth.token);
    onChanged();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {branches.length === 0 && (
        <p className={styles.status}>No branches yet.</p>
      )}
      {branches.map((b) => (
        <div key={b._id} className={styles.row}>
          <div>
            <div>{b.name}</div>
            <div className={styles.rowSub}>{b.location}</div>
          </div>
          <button
            className={styles.linkBtn}
            onClick={() => handleDelete(b._id)}
          >
            Delete
          </button>
        </div>
      ))}

      <div className={styles.subHeading}>Add branch</div>
      <form onSubmit={handleCreate} className={styles.inlineForm}>
        <input
          required
          placeholder="Branch name"
          value={form.name}
          onChange={handleChange("name")}
        />
        <input
          required
          placeholder="Location"
          value={form.location}
          onChange={handleChange("location")}
        />
        {error && <p className={styles.statusError}>{error}</p>}
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={submitting}
        >
          {submitting ? "Adding…" : "Add branch"}
        </button>
      </form>
    </motion.div>
  );
};

export default BranchesTab;
