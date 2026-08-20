import { useEffect, useState } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import { apiClient } from "../../lib/apiClient";
import styles from "../CustomerHome/CustomerHome.module.css";

const ROLE_LABEL = { staff: "Staff", manager: "Manager", admin: "Admin" };

const StaffHome = () => {
  const { auth, logout } = useAuth();
  const [checking, setChecking] = useState(true);
  const roleLabel = ROLE_LABEL[auth.role] || "Staff";

  useEffect(() => {
    apiClient
      .get("/users/profile", { token: auth.token })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [auth.token]);

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>№ 010 — {roleLabel} console</p>
        <h1 className={styles.heading}>
          Signed in, {auth.name.split(" ")[0]}.
        </h1>
        <p className={styles.subhead}>
          The real {roleLabel.toLowerCase()} dashboard lands here next. This
          confirms the token and role came back correctly from the API.
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

export default StaffHome;
