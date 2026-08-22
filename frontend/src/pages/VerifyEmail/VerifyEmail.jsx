import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient, ApiError } from "../../lib/apiClient";
import MotionBackground from "../../components/MotionBackground/MotionBackground";
import logoUrl from "../../assets/logo.svg";
import styles from "../Login/Login.module.css";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found.");
      return;
    }

    apiClient
      .post("/auth/verify-email", { token })
      .then(() => {
        setStatus("success");
        setMessage("Email verified successfully!");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err instanceof ApiError ? err.message : "Verification failed.",
        );
      });
  }, [token]);

  return (
    <section className={styles.page}>
      <MotionBackground />
      <div className={styles.container}>
        <div className={styles.logoHeader} style={{ justifyContent: "center" }}>
          <img src={logoUrl} alt="" />
          <span>Cue</span>
        </div>
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center" }}
        >
          {status === "verifying" && (
            <>
              <p className={styles.eyebrow}>Verifying…</p>
              <p style={{ color: "var(--ink-soft)" }}>
                Please wait while we verify your email.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <p style={{ color: "var(--verdigris)", fontWeight: 600, fontSize: "1.1rem", marginBottom: "0.75rem" }}>
                ✓ {message}
              </p>
              <Link
                to="/login"
                className={styles.submitBtn}
                style={{ display: "inline-block", textDecoration: "none", marginTop: "1rem" }}
              >
                Sign in
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <p style={{ color: "var(--signal)", fontWeight: 600, fontSize: "1.1rem", marginBottom: "0.75rem" }}>
                ✗ {message}
              </p>
              <Link
                to="/login"
                className={styles.submitBtn}
                style={{ display: "inline-block", textDecoration: "none", marginTop: "1rem" }}
              >
                Back to sign in
              </Link>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default VerifyEmail;
