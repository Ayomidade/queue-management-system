import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../features/auth/AuthContext";
import { fetchBranches } from "../../../features/admin/adminApi";
import BranchesTab from "./BranchesTab";
import ServicesTab from "./ServicesTab";
import AdminStaffTab from "./AdminStaffTab";
import OverviewTab from "../manager/OverviewTab";
import CountersTab from "../manager/CountersTab";
import styles from "../manager/ManagerPanel.module.css";

const TABS = [
  { id: "branches", label: "Branches" },
  { id: "services", label: "Services" },
  { id: "staff", label: "Staff" },
  { id: "counters", label: "Counters" },
  { id: "overview", label: "Overview" },
];

const AdminPanel = () => {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState("branches");
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  const loadBranches = useCallback(async () => {
    const res = await fetchBranches(auth.token);
    setBranches(res.data);
  }, [auth.token]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    if (!selectedBranchId && branches.length)
      setSelectedBranchId(branches[0]._id);
  }, [branches, selectedBranchId]);

  const needsBranchPicker =
    activeTab === "counters" || activeTab === "overview";

  return (
    <div className={styles.panel}>
      <p className={styles.eyebrow}>№ 012 — Network management</p>

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

      {needsBranchPicker && branches.length > 0 && (
        <label className={styles.branchPicker}>
          <span>Branch</span>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className={styles.tabContent}>
        {activeTab === "branches" && (
          <BranchesTab branches={branches} onChanged={loadBranches} />
        )}
        {activeTab === "services" && <ServicesTab branches={branches} />}
        {activeTab === "staff" && <AdminStaffTab branches={branches} />}
        {activeTab === "counters" &&
          (selectedBranchId ? (
            <CountersTab branchId={selectedBranchId} />
          ) : (
            <p className={styles.status}>Create a branch first.</p>
          ))}
        {activeTab === "overview" &&
          (selectedBranchId ? (
            <OverviewTab branchId={selectedBranchId} />
          ) : (
            <p className={styles.status}>Create a branch first.</p>
          ))}
      </div>
    </div>
  );
};

export default AdminPanel;
