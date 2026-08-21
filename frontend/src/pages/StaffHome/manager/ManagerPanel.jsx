import { useState } from "react";
import { useAuth } from "../../../features/auth/AuthContext";
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

  return (
    <div className={styles.panel}>
      <p className={styles.eyebrow}>№ 011 — Branch management</p>

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
