import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import {
  fetchStaffList,
  createStaff,
  deactivateStaffApi,
  fetchBranchQueues,
  assignQueuesToStaff,
} from "../../features/staff/manageApi";
import { fetchBranches } from "../../features/staff/adminApi";
import { ApiError } from "../../lib/apiClient";
import styles from "./StaffHome.module.css";

/**
 * StaffSubTab — staff list, create form, and queue assignment.
 * Used inside ManagePanel for manager/admin.
 *
 * After the four-model split this form creates Staff only — managers
 * are created under Manage → Managers (POST /managers, ManagerSubTab).
 * Admin: picks a branch via dropdown (bank-scoped by Admin.bank).
 * Manager: auto-assigns to own branch.
 *
 * All calls use JWT Bearer (WP6) — bank/branch scoping is server-side.
 * Password optional; blank → server temp password (Cue-XXXXXX-XXXXXX).
 */
const StaffSubTab = () => {
  const { auth } = useAuth();
  const isAdmin = auth.role === "admin";
  const token = auth.token;

  const [staffList, setStaffList] = useState([]);
  const [queues, setQueues] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    branch: "",
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [assigningQueue, setAssigningQueue] = useState(null);
  // One-time display when the server generated a temp password.
  const [tempCreated, setTempCreated] = useState(null);

  const load = useCallback(async () => {
    try {
      const promises = [
        fetchStaffList(token),
        fetchBranchQueues(token),
      ];
      if (isAdmin) {
        promises.push(fetchBranches(token));
      }
      const results = await Promise.all(promises);
      setStaffList(results[0].data);
      setQueues(
        results[1].data.filter(
          (q) => q.branch?._id === auth.branch || q.branch === auth.branch,
        ),
      );
      if (isAdmin && results[2]) {
        setBranches(results[2].data);
      }
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load staff.");
    } finally {
      setLoading(false);
    }
  }, [token, auth.branch, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!isAdmin) {
        payload.branch = auth.branch;
      }
      // Password optional — blank means server generates a temp password.
      if (!payload.password) delete payload.password;
      const res = await createStaff(payload, token);
      const created = res.data || {};
      if (created.tempPassword) {
        setTempCreated({
          name: created.name,
          email: created.email,
          tempPassword: created.tempPassword,
        });
      }
      setForm({ name: "", email: "", password: "", branch: "" });
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.errors?.join(", ") || err.message
          : "Couldn't create staff.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (staffId) => {
    await deactivateStaffApi(staffId, token);
    await load();
  };

  const handleQueueToggle = async (staffId, queueId) => {
    const staff = staffList.find((s) => s._id === staffId);
    if (!staff) return;
    const current = (staff.queues || []).map((q) => q._id || q);
    const next = current.includes(queueId)
      ? current.filter((id) => id !== queueId)
      : [...current, queueId];
    setAssigningQueue(staffId);
    try {
      await assignQueuesToStaff(staffId, next, token);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't update queues.",
      );
    } finally {
      setAssigningQueue(null);
    }
  };

  if (loading) return <p className={styles.mgmtStatus}>Loading staff…</p>;
  if (error) return <p className={styles.mgmtStatusError}>{error}</p>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {staffList.length === 0 && (
        <p className={styles.mgmtStatus}>No staff on your branch yet.</p>
      )}

      {staffList.map((s) => {
        const assignedQueues = s.queues || [];
        return (
          <div key={s._id} className={styles.mgmtRow}>
            <div>
              <div className={styles.mgmtRowTitle}>{s.name}</div>
              <div className={styles.mgmtRowSub}>
                {s.email} · {s.role || "staff"}
                {s.branch?.name && <> · {s.branch.name}</>}
                {s.counter && (
                  <> · Counter {s.counter.label || s.counter}</>
                )}
              </div>
              {!isAdmin && queues.length > 0 && (
                <div className={styles.mgmtQueueChips}>
                  {queues.map((q) => {
                    const qId = q._id;
                    const isAssigned = assignedQueues.some(
                      (aq) => (aq._id || aq) === qId,
                    );
                    return (
                      <button
                        key={qId}
                        className={`${styles.mgmtQueueChip} ${isAssigned ? styles.mgmtQueueChipActive : ""}`}
                        onClick={() => handleQueueToggle(s._id, qId)}
                        disabled={assigningQueue === s._id}
                      >
                        {q.serviceName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className={styles.mgmtRowActions}>
              <button
                className={styles.mgmtLinkBtn}
                onClick={() => handleDeactivate(s._id)}
              >
                Deactivate
              </button>
            </div>
          </div>
        );
      })}

      <div className={styles.mgmtSubHeading}>Add staff</div>
      <form onSubmit={handleCreate} className={styles.mgmtInlineForm}>
        <input
          required
          placeholder="Name"
          value={form.name}
          onChange={handleChange("name")}
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange("email")}
        />
        <input
          type="password"
          placeholder="Password (optional — blank = temp)"
          value={form.password}
          onChange={handleChange("password")}
          autoComplete="new-password"
        />
        {isAdmin && (
          <select
            required
            value={form.branch}
            onChange={handleChange("branch")}
            className={styles.mgmtInlineSelect}
          >
            <option value="" disabled>
              Assign branch…
            </option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        {formError && <p className={styles.mgmtStatusError}>{formError}</p>}
        <button
          type="submit"
          className={styles.mgmtSubmitBtn}
          disabled={submitting}
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </form>

      {/* One-time temp password — only when the server generated it. */}
      {tempCreated && (
        <div className={styles.keyModalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.keyModal}>
            <h4>Staff created — temporary password</h4>
            <p className={styles.mgmtRowSub}>
              {tempCreated.name} · {tempCreated.email}
            </p>
            <div className={styles.rawKeyBox}>
              <code>{tempCreated.tempPassword}</code>
              <button
                type="button"
                className={styles.scopeChip}
                onClick={() =>
                  navigator.clipboard?.writeText(tempCreated.tempPassword)
                }
              >
                Copy
              </button>
            </div>
            <p
              className={styles.mgmtStatusError}
              style={{ background: "none", padding: 0 }}
            >
              This is the only time this password will be shown. Share it once
              — they must change it on first sign-in.
            </p>
            <button
              type="button"
              className={styles.mgmtSubmitBtn}
              onClick={() => setTempCreated(null)}
            >
              I&apos;ve saved it
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StaffSubTab;
