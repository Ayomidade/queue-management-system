import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import {
  fetchBranchCounters,
  createCounter,
  assignStaffToCounter,
  unassignStaffFromCounter,
  fetchStaffList,
} from "../../features/staff/manageApi";
import { ApiError } from "../../lib/apiClient";
import styles from "./StaffHome.module.css";

/**
 * CounterSubTab — counter list, create form, staff assignment.
 * Used inside ManagePanel for manager/admin.
 */
const CounterSubTab = () => {
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
        fetchBranchCounters(auth.branch, auth.apiKey),
        fetchStaffList(auth.apiKey),
      ]);
      setCounters(countersRes.data);
      setStaffList(
        staffRes.data.filter(
          (s) =>
            s.role === "staff" &&
            (s.branch?._id === auth.branch || s.branch === auth.branch),
        ),
      );
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load counters.");
    } finally {
      setLoading(false);
    }
  }, [auth.apiKey, auth.branch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      await createCounter({ label, branch: auth.branch }, auth.apiKey);
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

  const handleAssign = async (counterId, staffId) => {
    if (!staffId) return;
    try {
      await assignStaffToCounter(counterId, staffId, auth.apiKey);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't assign staff.",
      );
    }
  };

  const handleUnassign = async (counterId) => {
    await unassignStaffFromCounter(counterId, auth.apiKey);
    await load();
  };

  if (loading) return <p className={styles.mgmtStatus}>Loading counters…</p>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {error && <p className={styles.mgmtStatusError}>{error}</p>}
      {counters.length === 0 && (
        <p className={styles.mgmtStatus}>No counters yet.</p>
      )}

      {counters.map((counter) => (
        <div key={counter._id} className={styles.mgmtRow}>
          <div>
            <div className={styles.mgmtRowTitle}>Counter {counter.label}</div>
            <div className={styles.mgmtRowSub}>
              {counter.assignedStaff
                ? counter.assignedStaff.name || "Assigned"
                : "Unassigned"}
            </div>
          </div>
          <div className={styles.mgmtRowActions}>
            <span
              className={
                counter.isOpen ? styles.mgmtBadgeOpen : styles.mgmtBadgeClosed
              }
            >
              {counter.isOpen ? "Open" : "Closed"}
            </span>
            {counter.assignedStaff ? (
              <button
                className={styles.mgmtLinkBtn}
                onClick={() => handleUnassign(counter._id)}
              >
                Unassign
              </button>
            ) : (
              <select
                className={styles.mgmtInlineSelect}
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

      <div className={styles.mgmtSubHeading}>Add counter</div>
      <form onSubmit={handleCreate} className={styles.mgmtInlineForm}>
        <input
          required
          placeholder="Counter label, e.g. 3"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        {createError && (
          <p className={styles.mgmtStatusError}>{createError}</p>
        )}
        <button
          type="submit"
          className={styles.mgmtSubmitBtn}
          disabled={creating}
        >
          {creating ? "Adding…" : "Add counter"}
        </button>
      </form>
    </motion.div>
  );
};

export default CounterSubTab;
