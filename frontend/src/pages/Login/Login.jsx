import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useBrand } from "../../features/brand/BrandContext";
import { apiClient, ApiError } from "../../lib/apiClient";
import MotionBackground from "../../components/MotionBackground/MotionBackground";
import logoUrl from "../../assets/logo.svg";
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
  const { brand } = useBrand();
  const [accountType, setAccountType] = useState("customer");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResendStatus(null);
    setSubmitting(true);

    try {
      await login({ ...form, accountType });
      const fallback = accountType === "staff" ? "/staff" : "/account";
      navigate(location.state?.from || fallback, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.errors?.includes("email_not_verified")) {
        setNeedsVerification(true);
        setError(null);
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : "Something went wrong, try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setResendStatus(null);
    try {
      await apiClient.post("/auth/resend-verification", { email: form.email });
      setResendStatus("Verification email sent. Check your inbox.");
    } catch {
      setResendStatus("Couldn't send verification email. Try again later.");
    }
  };

  return (
    <section className={styles.page}>
      <MotionBackground />
      <div className={styles.container}>
        <motion.div initial="hidden" animate="visible">
          <div className={styles.logoHeader}>
            <img src={logoUrl} alt="" />
            <span>{brand.name}</span>
          </div>
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

            <div style={{ textAlign: "right", marginTop: "-0.5rem" }}>
              <Link to="/forgot-password" style={{ fontSize: "0.8rem", color: "var(--brand-primary)", textDecoration: "none" }}>
                Forgot password?
              </Link>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            {needsVerification && (
              <div className={styles.error} style={{ textAlign: "center" }}>
                <p style={{ marginBottom: "0.5rem" }}>
                  Please verify your email before logging in.
                </p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--brand-primary)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontSize: "inherit",
                    padding: 0,
                  }}
                >
                  Resend verification email
                </button>
                {resendStatus && (
                  <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", opacity: 0.8 }}>
                    {resendStatus}
                  </p>
                )}
              </div>
            )}

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
          {accountType === "staff" && (
            <p className={styles.switchLine}>
              <Link to="/admin-login">Sign in as Admin instead</Link>
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default Login;
