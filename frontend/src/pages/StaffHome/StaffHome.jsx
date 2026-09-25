import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import { useBrand } from "../../features/brand/BrandContext";
import { useMyCounter } from "../../features/staff/useMyCounter";
import { useMyStats } from "../../features/staff/useMyStats";
import ChangePassword from "../../components/ChangePassword/ChangePassword";
import CounterConsole from "./CounterConsole";
import TicketHistory from "./TicketHistory";
import ManagePanel from "./ManagePanel";
import AdminOverview from "./AdminOverview";
import ManagerOverview from "./ManagerOverview";
import MotionBackground from "../../components/MotionBackground/MotionBackground";
import logoUrl from "../../assets/logo.svg";
import styles from "./StaffHome.module.css";

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
  const { brand } = useBrand();
  const counterState = useMyCounter();
  const { stats, refetch: refetchStats } = useMyStats();

  const isAdmin = auth.role === "admin";
  const isManager = auth.role === "manager";

  // Admin: Overview (cross-branch) + Branches/Staff management
  // Manager: Overview (branch analytics) + Staff + Counters — NO counter console
  // Staff: Console + History
  const topTabs = isAdmin
    ? [
        { id: "overview", label: "Overview" },
        { id: "manage", label: "Manage" },
      ]
    : isManager
      ? [
          { id: "overview", label: "Overview" },
          { id: "manage", label: "Manage" },
        ]
      : [
          { id: "console", label: "Console" },
          { id: "history", label: "History" },
        ];

  // Hooks always run — early return only affects render output.
  const [activeTab, setActiveTab] = useState(topTabs[0].id);

  // Temp-password / invite-created accounts must rotate on first login.
  if (auth.mustChangePassword) {
    return (
      <section className={styles.page}>
        <MotionBackground />
        <div className={styles.container}>
          <div className={styles.logoHeader}>
            <img src={logoUrl} alt="" />
            <span>{brand.name}</span>
          </div>
          <motion.p className={styles.eyebrow} custom={0} variants={fadeUp}>
            № 010 — first sign-in
          </motion.p>
          <motion.h1 className={styles.heading} custom={1} variants={fadeUp}>
            Set a new password, {auth.name?.split(" ")[0]}.
          </motion.h1>
          <p style={{ color: "var(--text-muted, #6b7280)", marginBottom: "1.25rem" }}>
            Your temporary password must be changed before you can use the
            console.
          </p>
          <ChangePassword />
          <button className={styles.logoutBtn} onClick={logout} style={{ marginTop: "1rem" }}>
            Sign out
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <MotionBackground />
      <div className={styles.container}>
        <div className={styles.logoHeader}>
          <img src={logoUrl} alt="" />
          <span>{brand.name}</span>
        </div>
        <motion.div
          className={styles.headerRow}
          initial="hidden"
          animate="visible"
        >
          <div>
            <motion.p className={styles.eyebrow} custom={0} variants={fadeUp}>
              № 010 — staff console
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
            {auth.branch && (
              <Link
                to={`/board/${auth.branch}`}
                className={styles.boardLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Live Board
              </Link>
            )}
            <button className={styles.logoutBtn} onClick={logout}>
              Sign out
            </button>
          </motion.div>
        </motion.div>

        {/* ── Top-level tabs ────────────────────────── */}
        {topTabs.length > 1 && (
          <div className={styles.topTabs} role="tablist">
            {topTabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={
                  activeTab === tab.id ? styles.topTabActive : styles.topTab
                }
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Overview tab (admin: cross-branch, manager: branch) ── */}
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {isAdmin ? <AdminOverview /> : <ManagerOverview />}
          </motion.div>
        )}

        {/* ── Console tab (staff only) ──────────────── */}
        {activeTab === "console" && (
          <>
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
          </>
        )}

        {/* ── History tab (staff only) ──────────────── */}
        {activeTab === "history" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <TicketHistory />
          </motion.div>
        )}

        {/* ── Manage tab (admin + manager) ──────────── */}
        {activeTab === "manage" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <ManagePanel />
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default StaffHome;
