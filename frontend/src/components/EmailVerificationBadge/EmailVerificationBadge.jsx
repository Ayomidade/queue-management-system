import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import { apiClient, ApiError } from "../../lib/apiClient";
import styles from "./EmailVerificationBadge.module.css";

const EmailVerificationBadge = () => {
  const { auth } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  // Staff/manager accounts don't have email verification
  if (auth.accountType === "staff") return null;

  if (auth.isEmailVerified) {
    return (
      <span className={styles.verified}>
        <span className={styles.checkIcon}>✓</span> Email verified
      </span>
    );
  }

  const handleResend = async () => {
    setSending(true);
    setError(null);
    setSent(false);
    try {
      await apiClient.post(
        "/auth/resend-verification",
        { email: auth.email },
        { token: auth.token },
      );
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't send email.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.container}>
      <span className={styles.unverified}>
        <span className={styles.warnIcon}>!</span> Email not verified
      </span>

      <AnimatePresence mode="wait">
        {sent ? (
          <motion.span
            key="sent"
            className={styles.sentText}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            Verification email sent — check your inbox
          </motion.span>
        ) : (
          <motion.button
            key="resend"
            className={styles.resendBtn}
            onClick={handleResend}
            disabled={sending}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {sending ? "Sending…" : "Resend verification email"}
          </motion.button>
        )}
      </AnimatePresence>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default EmailVerificationBadge;
