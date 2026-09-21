import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../../features/auth/AuthContext";
import {
  fetchBranchTickets,
  recallTicket,
  setTicketPriority,
} from "../../../features/manager/managerApi";
import styles from "./ManagerPanel.module.css";

const SUB_TABS = [
  { id: "waiting", label: "Waiting" },
  { id: "skipped", label: "Skipped" },
];

const TicketsTab = ({ branchId }) => {
  const { auth } = useAuth();
  const [subTab, setSubTab] = useState("waiting");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchBranchTickets(branchId, subTab, auth.token);
      setTickets(res.data);
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load tickets.");
    } finally {
      setLoading(false);
    }
  }, [branchId, subTab, auth.token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRecall = async (ticketId) => {
    await recallTicket(ticketId, auth.token);
    await load();
  };
  const handlePriority = async (ticketId, priority) => {
    await setTicketPriority(ticketId, priority, auth.token);
    await load();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className={styles.subTabs}>
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            className={subTab === tab.id ? styles.subTabActive : styles.subTab}
            onClick={() => setSubTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className={styles.status}>Loading…</p>}
      {error && <p className={styles.statusError}>{error}</p>}
      {!loading && tickets.length === 0 && (
        <p className={styles.status}>Nothing here right now.</p>
      )}

      {tickets.map((ticket) => (
        <div key={ticket._id} className={styles.row}>
          <div>
            <div>
              #{ticket.ticketNumber} · {ticket.queue?.serviceName}
            </div>
            <div className={styles.rowSub}>{ticket.user?.email}</div>
          </div>
          <div className={styles.rowActions}>
            {ticket.priority === "priority" && (
              <span className={styles.priorityBadge}>PRIORITY</span>
            )}
            {subTab === "waiting" && (
              <button
                className={styles.linkBtn}
                onClick={() =>
                  handlePriority(
                    ticket._id,
                    ticket.priority === "priority" ? "normal" : "priority",
                  )
                }
              >
                {ticket.priority === "priority"
                  ? "Unmark priority"
                  : "Mark priority"}
              </button>
            )}
            {subTab === "skipped" && (
              <button
                className={styles.linkBtn}
                onClick={() => handleRecall(ticket._id)}
              >
                Recall
              </button>
            )}
          </div>
        </div>
      ))}
    </motion.div>
  );
};

export default TicketsTab;
