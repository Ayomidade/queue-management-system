import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [search, setSearch] = useState("");
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

  const filtered = useMemo(() => {
    if (!search.trim()) return staffList;
    const q = search.toLowerCase();
    return staffList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        (s.branch?.name && s.branch.name.toLowerCase().includes(q)),
    );
  }, [staffList, search]);

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
      {/* ── Search ────────────────────────────── */}
      <input
        type="text"
        className={styles.searchInput}
        placeholder="Search staff by name, email, role, or branch…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* ── Staff List ────────────────────────── */}
      {filtered.length === 0 && (
        <p className={styles.status}>
          {search ? "No staff match your search." : "No staff yet."}
        </p>
      )}
      {filtered.map((s) => (
        <div key={s._id} className={styles.row}>
          <div>
            <div style={{ fontWeight: 600 }}>{s.name}</div>
            <div className={styles.rowSub}>
              {s.email} ·{" "}
              <span
                style={{
                  textTransform: "capitalize",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "4px",
                  background:
                    s.role === "manager"
                      ? "var(--verdigris)"
                      : "var(--paper-raised)",
                  color: s.role === "manager" ? "var(--ink)" : "var(--paper-soft)",
                }}
              >
                {s.role}
              </span>{" "}
              · {s.branch?.name || "Unassigned"}
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

      {/* ── Add Staff Form ────────────────────── */}
      <div className={styles.subHeading}>Add staff</div>
      <form onSubmit={handleCreate} className={styles.branchForm}>
        <div className={styles.formRow}>
          <label className={styles.formField}>
            <span className={styles.formLabel}>Name *</span>
            <input
              required
              placeholder="Full name"
              value={form.name}
              onChange={handleChange("name")}
            />
          </label>
          <label className={styles.formField}>
            <span className={styles.formLabel}>Email *</span>
            <input
              required
              type="email"
              placeholder="staff@bank.com"
              value={form.email}
              onChange={handleChange("email")}
            />
          </label>
        </div>
        <div className={styles.formRow}>
          <label className={styles.formField}>
            <span className={styles.formLabel}>Password *</span>
            <input
              required
              type="password"
              placeholder="Minimum 8 characters"
              minLength={8}
              value={form.password}
              onChange={handleChange("password")}
            />
          </label>
          <label className={styles.formField}>
            <span className={styles.formLabel}>Role *</span>
            <select
              value={form.role}
              onChange={handleChange("role")}
              className={styles.inlineSelect}
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>
          </label>
        </div>
        <label className={styles.formField}>
          <span className={styles.formLabel}>Branch *</span>
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
                {b.name} — {b.location}
              </option>
            ))}
          </select>
        </label>
        {formError && <p className={styles.statusError}>{formError}</p>}
        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? "Adding…" : "Add staff"}
        </button>
      </form>
    </motion.div>
  );
};

export default AdminStaffTab;
