import { useEffect, useState } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import { apiClient } from "../../lib/apiClient";
import styles from "./CustomerHome.module.css";

const CustomerHome = () => {
  const { auth, logout } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    apiClient
      .get("/users/profile", { token: auth.token })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [auth.token]);

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>№ 009 — Your account</p>
        <h1 className={styles.heading}>
          Welcome back, {auth.name.split(" ")[0]}.
        </h1>
        <p className={styles.subhead}>
          The ticket tracker lives here next, join a queue, watch your position,
          get called. For now, this confirms your account is real and the login
          actually works.
        </p>
        {checking && (
          <p className={styles.checking}>Confirming your session…</p>
        )}
        <button className={styles.logoutBtn} onClick={logout}>
          Sign out
        </button>
      </div>
    </section>
  );
};

export default CustomerHome;
