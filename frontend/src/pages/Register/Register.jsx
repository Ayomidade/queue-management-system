import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { ApiError } from "../../lib/apiClient";
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

const Register = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await register(form);
      navigate("/account", { replace: true });
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
      <div className={styles.container}>
        <motion.div initial="hidden" animate="visible">
          <motion.p className={styles.eyebrow} custom={0} variants={fadeUp}>
            № 008 — Join
          </motion.p>
          <motion.h1 className={styles.heading} custom={1} variants={fadeUp}>
            Pull your first ticket.
          </motion.h1>
          <motion.p className={styles.subhead} custom={2} variants={fadeUp}>
            One account tracks every ticket you pull, at any branch.
          </motion.p>
        </motion.div>

        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>
              <span>Full name</span>
              <input
                required
                value={form.name}
                onChange={handleChange("name")}
                placeholder="Ada Obi"
              />
            </label>
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
                minLength={8}
                value={form.password}
                onChange={handleChange("password")}
                placeholder="At least 8 characters"
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className={styles.switchLine}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Register;
