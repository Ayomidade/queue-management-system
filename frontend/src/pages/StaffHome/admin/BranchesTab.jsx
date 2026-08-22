import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../../features/auth/AuthContext";
import { createBranch, deleteBranch } from "../../../features/admin/adminApi";
import { ApiError } from "../../../lib/apiClient";
import styles from "../manager/ManagerPanel.module.css";

const INITIAL_FORM = {
  name: "",
  location: "",
  address: "",
  phone: "",
  email: "",
};

const BranchesTab = ({ branches, onChanged }) => {
  const { auth } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
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
      setForm(INITIAL_FORM);
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
            <div style={{ fontWeight: 600 }}>{b.name}</div>
            <div className={styles.rowSub}>
              📍 {b.location}
              {b.address && <> · {b.address}</>}
              {b.phone && <> · 📞 {b.phone}</>}
              {b.email && <> · ✉ {b.email}</>}
            </div>
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
      <form onSubmit={handleCreate} className={styles.branchForm}>
        <div className={styles.formRow}>
          <label className={styles.formField}>
            <span className={styles.formLabel}>Branch name *</span>
            <input
              required
              placeholder="e.g. Ikeja Main Branch"
              value={form.name}
              onChange={handleChange("name")}
            />
          </label>
          <label className={styles.formField}>
            <span className={styles.formLabel}>Area / City *</span>
            <input
              required
              placeholder="e.g. Ikeja, Lagos"
              value={form.location}
              onChange={handleChange("location")}
            />
          </label>
        </div>
        <label className={styles.formField}>
          <span className={styles.formLabel}>Full address</span>
          <input
            placeholder="e.g. 15 Oba Akran Avenue, Ikeja, Lagos"
            value={form.address}
            onChange={handleChange("address")}
          />
        </label>
        <div className={styles.formRow}>
          <label className={styles.formField}>
            <span className={styles.formLabel}>Phone number</span>
            <input
              placeholder="e.g. +234 801 234 5678"
              value={form.phone}
              onChange={handleChange("phone")}
            />
          </label>
          <label className={styles.formField}>
            <span className={styles.formLabel}>Branch email</span>
            <input
              type="email"
              placeholder="e.g. ikeja@yourbank.com"
              value={form.email}
              onChange={handleChange("email")}
            />
          </label>
        </div>
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
