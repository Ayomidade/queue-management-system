import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../features/auth/AuthContext";
import { closeDay, openDay } from "../../../features/manager/managerApi";
import OverviewTab from "./OverviewTab";
import StaffTab from "./StaffTab";
import CountersTab from "./CountersTab";
import TicketsTab from "./TicketsTab";
import styles from "./ManagerPanel.module.css";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "staff", label: "Staff" },
  { id: "counters", label: "Counters" },
  { id: "tickets", label: "Tickets" },
];

const ManagerPanel = () => {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [showDayMenu, setShowDayMenu] = useState(false);
  const [dayAction, setDayAction] = useState(null); // "open" | "close" | null
  const [dayLoading, setDayLoading] = useState(false);
  const [dayResult, setDayResult] = useState(null);

  const handleDayAction = async (action) => {
    setDayLoading(true);
    setDayResult(null);
    try {
      if (action === "close") {
        const res = await closeDay(auth.token);
        setDayResult({
          type: "success",
          message: `Day closed. ${res.data.ticketsCompleted} active tickets completed.`,
        });
      } else {
        await openDay(auth.token);
        setDayResult({
          type: "success",
          message: "Day opened. Branch is ready for new tickets.",
        });
      }
    } catch (err) {
      setDayResult({
        type: "error",
        message: err.message || "Action failed.",
      });
    } finally {
      setDayLoading(false);
      setDayAction(null);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <p className={styles.eyebrow}>№ 011 — Branch management</p>
        <div className={styles.panelActions}>
          {auth.branch && (
            <Link
              to={`/board/${auth.branch}`}
              className={styles.boardLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Branch Board →
            </Link>
          )}
          <div className={styles.dayMenuWrap}>
            <button
              className={styles.dayMenuBtn}
              onClick={() => setShowDayMenu((v) => !v)}
            >
              ☀ Day Control
            </button>
            <AnimatePresence>
              {showDayMenu && (
                <motion.div
                  className={styles.dayMenu}
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    className={styles.dayMenuItem}
                    onClick={() => {
                      setDayAction("open");
                      setShowDayMenu(false);
                    }}
                  >
                    <span className={styles.dayMenuIcon}>🟢</span>
                    Open day
                  </button>
                  <button
                    className={`${styles.dayMenuItem} ${styles.dayMenuItemDanger}`}
                    onClick={() => {
                      setDayAction("close");
                      setShowDayMenu(false);
                    }}
                  >
                    <span className={styles.dayMenuIcon}>🔴</span>
                    Close day
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Day Action Confirmation ────────────── */}
      <AnimatePresence>
        {dayAction && (
          <motion.div
            className={styles.dayConfirm}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className={styles.dayConfirmText}>
              {dayAction === "close"
                ? "Close the day? All active tickets will be marked completed and queue counters reset to zero."
                : "Open the day? The branch will be ready to accept new tickets."}
            </p>
            <div className={styles.dayConfirmActions}>
              <button
                className={styles.dayConfirmBtn}
                onClick={() => handleDayAction(dayAction)}
                disabled={dayLoading}
              >
                {dayLoading
                  ? "Processing…"
                  : dayAction === "close"
                    ? "Close day"
                    : "Open day"}
              </button>
              <button
                className={styles.dayCancelBtn}
                onClick={() => setDayAction(null)}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Day Result Toast ───────────────────── */}
      <AnimatePresence>
        {dayResult && (
          <motion.div
            className={`${styles.dayToast} ${dayResult.type === "error" ? styles.dayToastError : styles.dayToastSuccess}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {dayResult.message}
            <button className={styles.dayToastClose} onClick={() => setDayResult(null)}>
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.tabs} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {activeTab === "overview" && <OverviewTab branchId={auth.branch} />}
        {activeTab === "staff" && <StaffTab branchId={auth.branch} />}
        {activeTab === "counters" && <CountersTab branchId={auth.branch} />}
        {activeTab === "tickets" && <TicketsTab branchId={auth.branch} />}
      </div>
    </div>
  );
};

export default ManagerPanel;
