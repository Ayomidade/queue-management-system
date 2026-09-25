import { useState } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import StaffSubTab from "./StaffSubTab";
import ManagerSubTab from "./ManagerSubTab";
import CounterSubTab from "./CounterSubTab";
import styles from "./StaffHome.module.css";

/**
 * ManagePanel — management interface for manager/admin roles.
 *
 * Admin sees: Managers + Staff sub-tabs (managers live in their own
 * collection; POST /managers with optional temp password).
 * Manager sees: Staff + Counters sub-tabs (cannot create managers).
 */
const ManagePanel = () => {
  const { auth } = useAuth();
  const isAdmin = auth.role === "admin";

  const subTabs = isAdmin
    ? [
        { id: "managers", label: "Managers" },
        { id: "staff", label: "Staff" },
      ]
    : [
        { id: "staff", label: "Staff" },
        { id: "counters", label: "Counters" },
      ];

  const [activeTab, setActiveTab] = useState(subTabs[0].id);

  return (
    <div className={styles.mgmtPanel}>
      <div className={styles.mgmtHeader}>
        <p className={styles.mgmtEyebrow}>№ 012 — management</p>
      </div>

      {subTabs.length > 1 && (
        <div className={styles.mgmtTabs} role="tablist">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={
                activeTab === tab.id ? styles.mgmtTabActive : styles.mgmtTab
              }
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.mgmtTabContent}>
        {activeTab === "managers" && isAdmin && <ManagerSubTab />}
        {activeTab === "staff" && <StaffSubTab />}
        {activeTab === "counters" && <CounterSubTab />}
      </div>
    </div>
  );
};

export default ManagePanel;
