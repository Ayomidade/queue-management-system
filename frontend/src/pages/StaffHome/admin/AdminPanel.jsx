import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../features/auth/AuthContext";
import { fetchBranches } from "../../../features/admin/adminApi";
import BranchesTab from "./BranchesTab";
import ServicesTab from "./ServicesTab";
import AdminStaffTab from "./AdminStaffTab";
import OverviewTab from "../manager/OverviewTab";
import CountersTab from "../manager/CountersTab";
import styles from "../manager/ManagerPanel.module.css";

const TABS = [
  { id: "network", label: "Network" },
  { id: "branches", label: "Branches" },
  { id: "services", label: "Services" },
  { id: "staff", label: "Staff" },
  { id: "counters", label: "Counters" },
  { id: "boards", label: "Live Boards" },
  { id: "overview", label: "Analytics" },
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

  const needsBranchPicker = activeTab === "counters" || activeTab === "overview";

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
        {activeTab === "network" && (
          <NetworkOverview branches={branches} />
        )}
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
        {activeTab === "boards" && (
          <div>
            <p className={styles.subHeading}>All branch boards</p>
            {branches.length === 0 ? (
              <p className={styles.status}>No branches yet.</p>
            ) : (
              branches.map((b) => (
                <div key={b._id} className={styles.row}>
                  <div>
                    <span>{b.name}</span>
                    {b.location && (
                      <span className={styles.rowSub}> · {b.location}</span>
                    )}
                  </div>
                  <Link
                    to={`/board/${b._id}`}
                    className={styles.linkBtn}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open board →
                  </Link>
                </div>
              ))
            )}
          </div>
        )}
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

const NetworkOverview = ({ branches }) => {
  if (branches.length === 0) {
    return <p className={styles.status}>No branches yet. Create one to get started.</p>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className={styles.tileGrid} style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1.75rem" }}>
        <div className={styles.tile}>
          <span className={styles.tileValue}>{branches.length}</span>
          <span className={styles.tileLabel}>Total branches</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileValue}>{branches.filter((b) => b.isActive !== false).length}</span>
          <span className={styles.tileLabel}>Active</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileValue}>{new Set(branches.map((b) => b.location)).size}</span>
          <span className={styles.tileLabel}>Locations</span>
        </div>
      </div>

      <p className={styles.subHeading}>Branches</p>
      {branches.map((b, i) => (
        <motion.div
          key={b._id}
          className={styles.row}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: i * 0.04 }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{b.name}</div>
            <div className={styles.rowSub}>
              📍 {b.location || "No location"}
              {b.address && <> · {b.address}</>}
              {b.phone && <> · 📞 {b.phone}</>}
            </div>
          </div>
          <div className={styles.rowActions}>
            <Link to={`/board/${b._id}`} className={styles.linkBtn} target="_blank" rel="noopener noreferrer">
              Board →
            </Link>
            <Link to={`/branch/${b._id}`} className={styles.linkBtn} target="_blank" rel="noopener noreferrer">
              Public page →
            </Link>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default AdminPanel;
