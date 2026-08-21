import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import { changePassword } from "../../features/auth/authApi";
import { ApiError } from "../../lib/apiClient";
import styles from "./ChangePassword.module.css";

const ChangePassword = () => {
  const { auth } = useAuth();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setError("New password must be different from current password.");
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(
        {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        },
        auth.token,
      );
      setSuccess(true);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't change password.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <p className={styles.heading}>Change password</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span>Current password</span>
          <input
            required
            type="password"
            value={form.currentPassword}
            onChange={handleChange("currentPassword")}
            placeholder="••••••••"
            minLength={8}
          />
        </label>

        <label className={styles.field}>
          <span>New password</span>
          <input
            required
            type="password"
            value={form.newPassword}
            onChange={handleChange("newPassword")}
            placeholder="••••••••"
            minLength={8}
          />
        </label>

        <label className={styles.field}>
          <span>Confirm new password</span>
          <input
            required
            type="password"
            value={form.confirmPassword}
            onChange={handleChange("confirmPassword")}
            placeholder="••••••••"
            minLength={8}
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>Password changed!</p>}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Update password"}
        </button>
      </form>
    </motion.div>
  );
};

export default ChangePassword;
