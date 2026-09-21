import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../../features/auth/AuthContext";
import {
  fetchBranchCounters,
  createCounter,
  assignStaffToCounter,
  unassignStaffFromCounter,
  openCounter,
  closeCounter,
  fetchStaffList,
} from "../../../features/manager/managerApi";
import { ApiError } from "../../../lib/apiClient";
import styles from "./ManagerPanel.module.css";

const CountersTab = ({ branchId }) => {
  const { auth } = useAuth();
  const [counters, setCounters] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [countersRes, staffRes] = await Promise.all([
        fetchBranchCounters(branchId, auth.token),
        fetchStaffList(auth.token),
      ]);
      setCounters(countersRes.data);
      setStaffList(
        staffRes.data.filter(
          (s) => s.role === "staff" && s.branch?._id === branchId,
        ),
      );
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load counters.");
    } finally {
      setLoading(false);
    }
  }, [branchId, auth.token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      await createCounter({ label }, auth.token);
      setLabel("");
      await load();
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Couldn't create counter.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (counter) => {
    if (counter.isOpen) await closeCounter(counter._id, auth.token);
    else await openCounter(counter._id, auth.token);
    await load();
  };

  const handleAssign = async (counterId, staffId) => {
    if (!staffId) return;
    try {
      await assignStaffToCounter(counterId, staffId, auth.token);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't assign staff.",
      );
    }
  };

  const handleUnassign = async (counterId) => {
    await unassignStaffFromCounter(counterId, auth.token);
    await load();
  };

  if (loading) return <p className={styles.status}>Loading counters…</p>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {error && <p className={styles.statusError}>{error}</p>}
      {counters.length === 0 && (
        <p className={styles.status}>No counters yet.</p>
      )}

      {counters.map((counter) => (
        <div key={counter._id} className={styles.row}>
          <div>
            <div>Counter {counter.label}</div>
            <div className={styles.rowSub}>
              {counter.assignedStaff
                ? counter.assignedStaff.name
                : "Unassigned"}
            </div>
          </div>
          <div className={styles.rowActions}>
            <span
              className={counter.isOpen ? styles.badgeOpen : styles.badgeClosed}
            >
              {counter.isOpen ? "Open" : "Closed"}
            </span>
            <button
              className={styles.linkBtn}
              onClick={() => handleToggle(counter)}
            >
              {counter.isOpen ? "Close" : "Open"}
            </button>
            {counter.assignedStaff ? (
              <button
                className={styles.linkBtn}
                onClick={() => handleUnassign(counter._id)}
              >
                Unassign
              </button>
            ) : (
              <select
                className={styles.inlineSelect}
                defaultValue=""
                onChange={(e) => handleAssign(counter._id, e.target.value)}
              >
                <option value="" disabled>
                  Assign staff…
                </option>
                {staffList.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      ))}

      <div className={styles.subHeading}>Add counter</div>
      <form onSubmit={handleCreate} className={styles.inlineForm}>
        <input
          required
          placeholder="Counter label, e.g. 3"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        {createError && <p className={styles.statusError}>{createError}</p>}
        <button type="submit" className={styles.submitBtn} disabled={creating}>
          {creating ? "Adding…" : "Add counter"}
        </button>
      </form>
    </motion.div>
  );
};

export default CountersTab;
