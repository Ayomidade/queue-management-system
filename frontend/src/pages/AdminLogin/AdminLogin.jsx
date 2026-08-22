import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { ApiError } from "../../lib/apiClient";
import MotionBackground from "../../components/MotionBackground/MotionBackground";
import logoUrl from "../../assets/logo.svg";
import styles from "./AdminLogin.module.css";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

const AdminLogin = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Admin lives in the User model, so accountType must be "customer"
      // which routes to POST /api/auth/login (User model)
      await login({ ...form, accountType: "customer" });
      navigate(location.state?.from || "/staff", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong, try again.",
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
            № 008 — Admin access
          </motion.p>
          <motion.h1 className={styles.heading} custom={1} variants={fadeUp}>
            Network control.
          </motion.h1>
          <motion.p className={styles.subhead} custom={2} variants={fadeUp}>
            Sign in to manage every branch, queue, and staff member from one
            place.
          </motion.p>
        </motion.div>

        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {location.state?.sessionExpired && (
            <p className={styles.error} style={{ marginBottom: "1.25rem" }}>
              Your session expired. Sign in again to continue.
            </p>
          )}

          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Admin only
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>
              <span>Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                placeholder="admin@queue.com"
              />
            </label>
            <label className={styles.field}>
              <span>Password</span>
              <input
                required
                type="password"
                value={form.password}
                onChange={handleChange("password")}
                placeholder="••••••••"
              />
            </label>

            <div style={{ textAlign: "right", marginTop: "-0.5rem" }}>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: "0.8rem",
                  color: "var(--verdigris)",
                  textDecoration: "none",
                }}
              >
                Forgot password?
              </Link>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? "Checking…" : "Sign in as Admin"}
            </button>
          </form>

          <p className={styles.switchLine}>
            Not an admin? <Link to="/login">Back to sign in</Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default AdminLogin;
