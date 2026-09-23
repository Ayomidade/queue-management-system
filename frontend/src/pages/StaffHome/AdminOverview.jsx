import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import {
  fetchAdminOverview,
  createBranch,
} from "../../features/staff/adminApi";
import { createStaff } from "../../features/staff/manageApi";
import { ApiError } from "../../lib/apiClient";
import styles from "./StaffHome.module.css";

/**
 * AdminOverview — cross-branch dashboard for admin role.
 * Shows all branches with live stats, all managers with staff counts,
 * and forms to create new branches and managers.
 */
const AdminOverview = () => {
  const { auth } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Branch creation form
  const [branchForm, setBranchForm] = useState({ name: "", location: "" });
  const [branchFormError, setBranchFormError] = useState(null);
  const [branchSubmitting, setBranchSubmitting] = useState(false);

  // Manager creation form
  const [mgrForm, setMgrForm] = useState({
    name: "",
    email: "",
    password: "",
    branch: "",
  });
  const [mgrFormError, setMgrFormError] = useState(null);
  const [mgrSubmitting, setMgrSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchAdminOverview(auth.apiKey);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load admin overview.");
    } finally {
      setLoading(false);
    }
  }, [auth.apiKey]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBranchChange = (field) => (e) =>
    setBranchForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setBranchFormError(null);
    setBranchSubmitting(true);
    try {
      await createBranch(branchForm, auth.apiKey);
      setBranchForm({ name: "", location: "" });
      await load();
    } catch (err) {
      setBranchFormError(
        err instanceof ApiError ? err.message : "Couldn't create branch.",
      );
    } finally {
      setBranchSubmitting(false);
    }
  };

  const handleMgrChange = (field) => (e) =>
    setMgrForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreateManager = async (e) => {
    e.preventDefault();
    setMgrFormError(null);
    setMgrSubmitting(true);
    try {
      await createStaff({ ...mgrForm, role: "manager" }, auth.apiKey);
      setMgrForm({ name: "", email: "", password: "", branch: "" });
      await load();
    } catch (err) {
      setMgrFormError(
        err instanceof ApiError
          ? err.errors?.join(", ") || err.message
          : "Couldn't create manager.",
      );
    } finally {
      setMgrSubmitting(false);
    }
  };

  if (loading) return <p className={styles.mgmtStatus}>Loading overview…</p>;
  if (error) return <p className={styles.mgmtStatusError}>{error}</p>;
  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* ── Summary Cards ─────────────────────────── */}
      <div className={styles.ovStatRow}>
        <div className={styles.ovStatCard}>
          <span className={styles.ovStatValue}>{data.summary.totalBranches}</span>
          <span className={styles.ovStatLabel}>branches</span>
        </div>
        <div className={styles.ovStatCard}>
          <span className={styles.ovStatValue}>{data.summary.totalManagers}</span>
          <span className={styles.ovStatLabel}>managers</span>
        </div>
        <div className={styles.ovStatCard}>
          <span className={styles.ovStatValue}>{data.summary.totalStaff}</span>
          <span className={styles.ovStatLabel}>total staff</span>
        </div>
      </div>

      {/* ── Branches List ─────────────────────────── */}
      <div className={styles.mgmtSubHeading}>Branches</div>
      {data.branches.length === 0 && (
        <p className={styles.mgmtStatus}>No branches yet.</p>
      )}
      {data.branches.map((b) => (
        <div key={b.id} className={styles.mgmtRow}>
          <div>
            <div className={styles.mgmtRowTitle}>{b.name}</div>
            <div className={styles.mgmtRowSub}>{b.location || "No location"}</div>
          </div>
          <div className={styles.mgmtRowActions}>
            <span
              className={b.dayOpen ? styles.mgmtBadgeOpen : styles.mgmtBadgeClosed}
            >
              {b.dayOpen ? "Open" : "Closed"}
            </span>
          </div>
        </div>
      ))}

      {/* ── Create Branch Form ─────────────────────── */}
      <div className={styles.mgmtSubHeading}>Add branch</div>
      <form onSubmit={handleCreateBranch} className={styles.mgmtInlineForm}>
        <input
          required
          placeholder="Branch name"
          value={branchForm.name}
          onChange={handleBranchChange("name")}
        />
        <input
          placeholder="Location"
          value={branchForm.location}
          onChange={handleBranchChange("location")}
        />
        {branchFormError && (
          <p className={styles.mgmtStatusError}>{branchFormError}</p>
        )}
        <button
          type="submit"
          className={styles.mgmtSubmitBtn}
          disabled={branchSubmitting}
        >
          {branchSubmitting ? "Adding…" : "Add branch"}
        </button>
      </form>

      {/* ── Managers List ──────────────────────────── */}
      <div className={styles.mgmtSubHeading}>Managers</div>
      {data.managers.length === 0 && (
        <p className={styles.mgmtStatus}>No managers yet.</p>
      )}
      {data.managers.map((m) => (
        <div key={m.id} className={styles.mgmtRow}>
          <div>
            <div className={styles.mgmtRowTitle}>{m.name}</div>
            <div className={styles.mgmtRowSub}>
              {m.email}
              {m.branch && <> · {m.branch.name}</>}
            </div>
          </div>
          <div className={styles.mgmtRowActions}>
            <span className={styles.ovStaffCount}>
              {m.staffCount} staff
            </span>
          </div>
        </div>
      ))}

      {/* ── Create Manager Form ────────────────────── */}
      <div className={styles.mgmtSubHeading}>Add manager</div>
      <form onSubmit={handleCreateManager} className={styles.mgmtInlineForm}>
        <input
          required
          placeholder="Name"
          value={mgrForm.name}
          onChange={handleMgrChange("name")}
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={mgrForm.email}
          onChange={handleMgrChange("email")}
        />
        <input
          required
          type="password"
          placeholder="Temporary password"
          value={mgrForm.password}
          onChange={handleMgrChange("password")}
        />
        <select
          required
          value={mgrForm.branch}
          onChange={handleMgrChange("branch")}
          className={styles.mgmtInlineSelect}
        >
          <option value="" disabled>
            Assign branch…
          </option>
          {data.branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {mgrFormError && <p className={styles.mgmtStatusError}>{mgrFormError}</p>}
        <button
          type="submit"
          className={styles.mgmtSubmitBtn}
          disabled={mgrSubmitting}
        >
          {mgrSubmitting ? "Adding…" : "Add manager"}
        </button>
      </form>
    </motion.div>
  );
};

export default AdminOverview;
