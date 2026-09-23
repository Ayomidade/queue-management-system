import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useBrand } from "../../features/brand/BrandContext";
import { ApiError } from "../../lib/apiClient";
import MotionBackground from "../../components/MotionBackground/MotionBackground";
import logoUrl from "../../assets/logo.svg";
import styles from "./Platform.module.css";

/**
 * PlatformLogin — superadmin JWT login for the /platform console.
 *
 * Superadmin is the ONLY persona who authenticates with email/password.
 * Bank personas use the demo API-key user switcher at /staff instead.
 */
const PlatformLogin = () => {
  const { brand } = useBrand();
  const { loginPlatform, auth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → go to console (in an effect, not during render).
  useEffect(() => {
    if (auth?.token && auth?.role === "superadmin") {
      navigate("/platform", { replace: true });
    }
  }, [auth?.token, auth?.role, navigate]);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginPlatform(form);
      navigate(location.state?.from || "/platform", { replace: true });
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
      <div className={styles.loginContainer}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className={styles.logoHeader}>
            <img src={logoUrl} alt="" />
            <span>{brand.name}</span>
          </div>
          <p className={styles.eyebrow}>№ 012 — platform access</p>
          <h1 className={styles.heading}>Platform control.</h1>
          <p className={styles.subhead}>
            Sign in to monitor API usage, manage keys, and review bank key
            requests across all tenants.
          </p>
        </motion.div>

        <motion.div
          className={styles.loginCard}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {location.state?.sessionExpired && (
            <p className={styles.errorMsg}>
              Your session expired. Sign in again to continue.
            </p>
          )}

          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Superadmin only
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>
              <span>Email</span>
              <input
                required
                type="email"
                autoComplete="username"
                value={form.email}
                onChange={handleChange("email")}
                placeholder="superadmin@cue.dev"
              />
            </label>
            <label className={styles.field}>
              <span>Password</span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange("password")}
                placeholder="••••••••"
              />
            </label>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? "Checking…" : "Sign in to platform"}
            </button>
          </form>

          <p className={styles.switchLine}>
            Bank staff use the <Link to="/staff">staff console</Link> instead.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PlatformLogin;
