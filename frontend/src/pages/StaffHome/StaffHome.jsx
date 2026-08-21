import { useAuth } from "../../features/auth/AuthContext";
import { useMyCounter } from "../../features/staff/useMyCounter";
import { useMyStats } from "../../features/staff/useMyStats";
import CounterConsole from "./CounterConsole";
import styles from "./StaffHome.module.css";

const ROLE_LABEL = { staff: "Staff", manager: "Manager", admin: "Admin" };

const StaffHome = () => {
  const { auth, logout } = useAuth();
  const counterState = useMyCounter();
  const { stats, refetch: refetchStats } = useMyStats();
  const roleLabel = ROLE_LABEL[auth.role] || "Staff";

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>№ 010 — {roleLabel} console</p>
            <h1 className={styles.heading}>
              Signed in, {auth.name.split(" ")[0]}.
            </h1>
          </div>
          <button className={styles.logoutBtn} onClick={logout}>
            Sign out
          </button>
        </div>

        <div className={styles.statRow}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {stats?.ticketsServedToday ?? "—"}
            </span>
            <span className={styles.statLabel}>served today</span>
          </div>
        </div>

        <CounterConsole counterState={counterState} onServed={refetchStats} />

        {/* Manager and admin sections, staff management, counter oversight,
            ticket overrides, branch analytics, land here in Phase 3. */}
      </div>
    </section>
  );
};

export default StaffHome;
