import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import { useMyCounter } from "../../features/staff/useMyCounter";
import { useMyStats } from "../../features/staff/useMyStats";
import CounterConsole from "./CounterConsole";
import TicketHistory from "./TicketHistory";
import ManagerPanel from "./manager/ManagerPanel";
import AdminPanel from "./admin/AdminPanel";
import MotionBackground from "../../components/MotionBackground/MotionBackground";
import styles from "./StaffHome.module.css";

const ROLE_LABEL = { staff: "Staff", manager: "Manager", admin: "Admin" };

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

const StaffHome = () => {
  const { auth, logout } = useAuth();
  const counterState = useMyCounter();
  const { stats, refetch: refetchStats } = useMyStats();
  const roleLabel = ROLE_LABEL[auth.role] || "Staff";

  return (
    <section className={styles.page}>
      <MotionBackground />
      <div className={styles.container}>
        <motion.div
          className={styles.headerRow}
          initial="hidden"
          animate="visible"
        >
          <div>
            <motion.p className={styles.eyebrow} custom={0} variants={fadeUp}>
              № 010 — {roleLabel} console
            </motion.p>
            <motion.h1 className={styles.heading} custom={1} variants={fadeUp}>
              Signed in, {auth.name.split(" ")[0]}.
            </motion.h1>
          </div>
          <motion.div
            className={styles.headerActions}
            custom={2}
            variants={fadeUp}
          >
            <Link to="/settings" className={styles.settingsLink}>
              Settings
            </Link>
            <button className={styles.logoutBtn} onClick={logout}>
              Sign out
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          className={styles.statRow}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {stats?.ticketsServedToday ?? "—"}
            </span>
            <span className={styles.statLabel}>served today</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <CounterConsole counterState={counterState} onServed={refetchStats} />
        </motion.div>

        {auth.role !== "admin" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <TicketHistory />
          </motion.div>
        )}

        {auth.role === "manager" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <ManagerPanel />
          </motion.div>
        )}
        {auth.role === "admin" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <AdminPanel />
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default StaffHome;
