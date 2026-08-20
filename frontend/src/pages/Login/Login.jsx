import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { ApiError } from "../../lib/apiClient";
import styles from "./Login.module.css";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

const Login = () => {
  const [accountType, setAccountType] = useState("customer");
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
      await login({ ...form, accountType });
      const fallback = accountType === "staff" ? "/staff" : "/account";
      navigate(location.state?.from || fallback, { replace: true });
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
      <div className={styles.container}>
        <motion.div initial="hidden" animate="visible">
          <motion.p className={styles.eyebrow} custom={0} variants={fadeUp}>
            № 007 — Sign in
          </motion.p>
          <motion.h1 className={styles.heading} custom={1} variants={fadeUp}>
            Pick your window.
          </motion.h1>
          <motion.p className={styles.subhead} custom={2} variants={fadeUp}>
            Customers track tickets from here. Staff, managers, and admins run
            their branch from the same door.
          </motion.p>
        </motion.div>

        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {location.state?.sessionExpired && (
            <p className={styles.notice}>
              Your session expired. Sign in again to continue.
            </p>
          )}
          <div className={styles.toggle} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={accountType === "customer"}
              className={
                accountType === "customer"
                  ? styles.toggleActive
                  : styles.toggleBtn
              }
              onClick={() => setAccountType("customer")}
            >
              Customer
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={accountType === "staff"}
              className={
                accountType === "staff" ? styles.toggleActive : styles.toggleBtn
              }
              onClick={() => setAccountType("staff")}
            >
              Staff / Manager / Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>
              <span>Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                placeholder="you@example.com"
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

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? "Checking…" : "Sign in"}
            </button>
          </form>

          {accountType === "customer" && (
            <p className={styles.switchLine}>
              New here? <Link to="/register">Create an account</Link>
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default Login;
