import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { apiClient, ApiError } from "../../lib/apiClient";
import MotionBackground from "../../components/MotionBackground/MotionBackground";
import logoUrl from "../../assets/logo.svg";
import styles from "../Login/Login.module.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.page}>
      <MotionBackground />
      <div className={styles.container}>
        <motion.div initial="hidden" animate="visible">
          <div className={styles.logoHeader}>
            <img src={logoUrl} alt="" />
            <span>Cue</span>
          </div>
          <motion.p className={styles.eyebrow} custom={0} variants={fadeUp}>
            № 013 — Reset password
          </motion.p>
          <motion.h1 className={styles.heading} custom={1} variants={fadeUp}>
            Forgot your password?
          </motion.h1>
          <motion.p className={styles.subhead} custom={2} variants={fadeUp}>
            Enter your email and we'll send you a reset link.
          </motion.p>
        </motion.div>

        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ marginBottom: "1rem", color: "var(--verdigris)", fontWeight: 600 }}>
                Check your inbox!
              </p>
              <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                We sent a reset link to <strong>{email}</strong>. The link expires in 1 hour.
              </p>
              <Link to="/login" className={styles.submitBtn} style={{ display: "block", textDecoration: "none" }}>
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.field}>
                <span>Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>

              {error && <p className={styles.error}>{error}</p>}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submitting}
              >
                {submitting ? "Sending…" : "Send reset link"}
              </button>

              <p className={styles.switchLine}>
                Remember your password? <Link to="/login">Sign in</Link>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default ForgotPassword;
