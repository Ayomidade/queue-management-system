import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../../features/auth/AuthContext";
import {
  fetchAllStaff,
  createStaffAdmin,
  reassignStaffBranch,
  deactivateStaffAdmin,
} from "../../../features/admin/adminApi";
import { ApiError } from "../../../lib/apiClient";
import styles from "../manager/ManagerPanel.module.css";

const AdminStaffTab = ({ branches }) => {
  const { auth } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
    branch: "",
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchAllStaff(auth.token);
      setStaffList(res.data);
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

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
      await createStaffAdmin(form, auth.token);
      setForm({ name: "", email: "", password: "", role: "staff", branch: "" });
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

  const handleReassign = async (staffId, branchId) => {
    if (!branchId) return;
    await reassignStaffBranch(staffId, branchId, auth.token);
    await load();
  };

  const handleDeactivate = async (staffId) => {
    await deactivateStaffAdmin(staffId, auth.token);
    await load();
  };

  if (loading) return <p className={styles.status}>Loading staff…</p>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {staffList.length === 0 && <p className={styles.status}>No staff yet.</p>}
      {staffList.map((s) => (
        <div key={s._id} className={styles.row}>
          <div>
            <div>{s.name}</div>
            <div className={styles.rowSub}>
              {s.email} · {s.role} · {s.branch?.name || "Unassigned"}
            </div>
          </div>
          <div className={styles.rowActions}>
            <select
              className={styles.inlineSelect}
              defaultValue=""
              onChange={(e) => handleReassign(s._id, e.target.value)}
            >
              <option value="" disabled>
                Reassign to…
              </option>
              {branches
                .filter((b) => b._id !== s.branch?._id)
                .map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
            </select>
            <button
              className={styles.linkBtn}
              onClick={() => handleDeactivate(s._id)}
            >
              Deactivate
            </button>
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
        <select
          value={form.role}
          onChange={handleChange("role")}
          className={styles.inlineSelect}
        >
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
        </select>
        <select
          required
          value={form.branch}
          onChange={handleChange("branch")}
          className={styles.inlineSelect}
        >
          <option value="" disabled>
            Choose a branch
          </option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
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

export default AdminStaffTab;
