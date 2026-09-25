import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useBrand } from "../../features/brand/BrandContext";
import { ApiError } from "../../lib/apiClient";
import MotionBackground from "../../components/MotionBackground/MotionBackground";
import logoUrl from "../../assets/logo.svg";
import styles from "./LoginPage.module.css";

/**
 * LoginPage — email/password JWT login for staff, manager, and admin.
 *
 * Routes:
 *   /login/staff
 *   /login/manager
 *   /login/admin
 *
 * Superadmin uses /platform/login (separate console).
 * After success, redirects to /staff (role-specific tabs render there).
 */
const VALID_KINDS = ["staff", "manager", "admin"];
const ROLE_META = {
  staff: {
    title: "Staff console.",
    eyebrow: "№ 010 — staff access",
    subhead: "Sign in to call tickets, manage your counter, and view history.",
    cta: "Sign in to console",
  },
  manager: {
    title: "Branch oversight.",
    eyebrow: "№ 011 — manager access",
    subhead:
      "Sign in to oversee your branch, manage staff and counters, and close the day.",
    cta: "Sign in as manager",
  },
  admin: {
    title: "Bank control.",
    eyebrow: "№ 012 — admin access",
    subhead:
      "Sign in to manage branches across your bank, review key requests, and provision teams.",
    cta: "Sign in as admin",
  },
};

const LoginPage = () => {
  const { kind } = useParams();
  const validKind = VALID_KINDS.includes(kind) ? kind : "staff";
  const meta = ROLE_META[validKind];
  const { brand } = useBrand();
  const { login, auth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in with a bank role → go to dashboard.
  useEffect(() => {
    if (auth?.token && auth.role && auth.role !== "superadmin") {
      navigate(location.state?.from || "/staff", { replace: true });
    }
  }, [auth?.token, auth?.role, navigate, location.state?.from]);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { path } = await login(validKind, form);
      navigate(location.state?.from || path, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.errors?.join(", ") || err.message
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
          <p className={styles.eyebrow}>{meta.eyebrow}</p>
          <h1 className={styles.heading}>{meta.title}</h1>
          <p className={styles.subhead}>{meta.subhead}</p>
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
            {validKind === "admin"
              ? "Bank admin"
              : validKind === "manager"
                ? "Branch manager"
                : "Staff"}
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
                placeholder="you@bank.example"
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
              {submitting ? "Checking…" : meta.cta}
            </button>
          </form>

          <p className={styles.switchLine}>
            Other roles:{" "}
            {Object.keys(ROLE_META)
              .filter((k) => k !== validKind)
              .map((k, i) => (
                <span key={k}>
                  {i > 0 && " · "}
                  <Link to={`/login/${k}`}>{k}</Link>
                </span>
              ))}{" "}
            · <Link to="/platform/login">Platform</Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default LoginPage;
