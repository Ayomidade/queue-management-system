import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../../features/auth/AuthContext";
import {
  fetchStaffList,
  createStaff,
  deactivateStaff,
  fetchStaffPerformance,
} from "../../../features/manager/managerApi";
import { ApiError } from "../../../lib/apiClient";
import styles from "./ManagerPanel.module.css";

const StaffTab = ({ branchId }) => {
  const { auth } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [performance, setPerformance] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [staffRes, perfRes] = await Promise.all([
        fetchStaffList(auth.token),
        fetchStaffPerformance(branchId, auth.token),
      ]);
      setStaffList(staffRes.data);
      const perfMap = {};
      perfRes.data.staffPerformance.forEach((p) => {
        perfMap[p.staffId] = p.ticketsServed;
      });
      setPerformance(perfMap);
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load staff.");
    } finally {
      setLoading(false);
    }
  }, [auth.token, branchId]);

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
      await createStaff(form, auth.token);
      setForm({ name: "", email: "", password: "" });
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
    await deactivateStaff(staffId, auth.token);
    await load();
  };

  if (loading) return <p className={styles.status}>Loading staff…</p>;
  if (error) return <p className={styles.statusError}>{error}</p>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {staffList.length === 0 && (
        <p className={styles.status}>No staff on your branch yet.</p>
      )}
      {staffList.map((s) => (
        <div key={s._id} className={styles.row}>
          <div>
            <div>{s.name}</div>
            <div className={styles.rowSub}>
              {s.email} · {s.role}
            </div>
          </div>
          <div className={styles.rowActions}>
            <span className={styles.rowValue}>
              {performance[s._id] ?? 0} served today
            </span>
            {s.role !== "manager" && (
              <button
                className={styles.linkBtn}
                onClick={() => handleDeactivate(s._id)}
              >
                Deactivate
              </button>
            )}
          </div>
        </div>
      ))}

      <div className={styles.subHeading}>Add staff</div>
      <form onSubmit={handleCreate} className={styles.inlineForm}>
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
        {formError && <p className={styles.statusError}>{formError}</p>}
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={submitting}
        >
          {submitting ? "Adding…" : "Add staff"}
        </button>
      </form>
    </motion.div>
  );
};

export default StaffTab;
