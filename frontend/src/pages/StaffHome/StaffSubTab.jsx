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
import { v1Api } from "../../lib/apiClient";
import { ApiError } from "../../lib/apiClient";
import styles from "./StaffHome.module.css";

/**
 * StaffSubTab — staff list, create form, and queue assignment.
 * Used inside ManagePanel for manager/admin.
 *
 * After the four-model split this form creates Staff only — managers
 * have their own collection and creation flow (WP4).
 * Admin: picks a branch via dropdown.
 * Manager: auto-assigns to own branch.
 */
const StaffSubTab = () => {
  const { auth } = useAuth();
  const isAdmin = auth.role === "admin";

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

  const load = useCallback(async () => {
    try {
      const promises = [
        fetchStaffList(auth.apiKey),
        fetchBranchQueues(auth.apiKey),
      ];
      if (isAdmin) {
        promises.push(v1Api.get("/branches", { apiKey: auth.apiKey }));
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
  }, [auth.apiKey, auth.branch, isAdmin]);

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
      await createStaff(payload, auth.apiKey);
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
    await deactivateStaffApi(staffId, auth.apiKey);
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
      await assignQueuesToStaff(staffId, next, auth.apiKey);
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
          required
          type="password"
          placeholder="Temporary password"
          value={form.password}
          onChange={handleChange("password")}
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
    </motion.div>
  );
};

export default StaffSubTab;
