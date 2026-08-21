import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient, ApiError } from "../../lib/apiClient";
import MotionBackground from "../../components/MotionBackground/MotionBackground";
import styles from "../Login/Login.module.css";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (form.newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/auth/reset-password", {
        token,
        newPassword: form.newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <section className={styles.page}>
        <MotionBackground />
        <div className={styles.container}>
          <div className={styles.card} style={{ textAlign: "center" }}>
            <p style={{ color: "var(--signal)", marginBottom: "1rem" }}>
              No reset token found.
            </p>
            <Link to="/forgot-password" className={styles.submitBtn} style={{ display: "inline-block", textDecoration: "none" }}>
              Request a new link
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <MotionBackground />
      <div className={styles.container}>
        <motion.div initial="hidden" animate="visible">
          <motion.p className={styles.eyebrow} custom={0} variants={fadeUp}>
            № 014 — New password
          </motion.p>
          <motion.h1 className={styles.heading} custom={1} variants={fadeUp}>
            Set a new password
          </motion.h1>
          <motion.p className={styles.subhead} custom={2} variants={fadeUp}>
            Enter your new password below.
          </motion.p>
        </motion.div>

        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {success ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ marginBottom: "1rem", color: "var(--verdigris)", fontWeight: 600 }}>
                Password reset!
              </p>
              <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Your password has been updated. You can now sign in.
              </p>
              <Link to="/login" className={styles.submitBtn} style={{ display: "block", textDecoration: "none" }}>
                Sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
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
                <span>Confirm password</span>
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

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Reset password"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default ResetPassword;
