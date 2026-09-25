import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import {
  fetchManagers,
  createManager,
  deactivateManagerApi,
} from "../../features/staff/manageApi";
import { fetchBranches } from "../../features/staff/adminApi";
import { ApiError } from "../../lib/apiClient";
import styles from "./StaffHome.module.css";

/**
 * ManagerSubTab — admin creates/lists/deactivates Manager accounts.
 *
 * Managers live in their own collection (four-model split). Creation hits
 * POST /api/managers (admin JWT). Blank password → server generates
 * Cue-XXXXXX-XXXXXX, returned once as tempPassword (never stored plain).
 * Branch is required; bank is denormalized from Branch.bank server-side.
 */
const ManagerSubTab = () => {
  const { auth } = useAuth();
  const token = auth.token;

  const [managers, setManagers] = useState([]);
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
  // One-time display of server-generated temp password after create.
  const [tempCreated, setTempCreated] = useState(null);

  const load = useCallback(async () => {
    try {
      const [managersRes, branchesRes] = await Promise.all([
        fetchManagers(token),
        fetchBranches(token),
      ]);
      // paginatedResponse: { data: [...], meta } → payload.data is the array.
      setManagers(managersRes.data || []);
      setBranches(branchesRes.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load managers.");
    } finally {
      setLoading(false);
    }
  }, [token]);

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
      const payload = {
        name: form.name,
        email: form.email,
        branch: form.branch,
      };
      // Blank password → server temp password (returned once).
      if (form.password) payload.password = form.password;

      const res = await createManager(payload, token);
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
          : "Couldn't create manager.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (managerId) => {
    if (
      !window.confirm(
        "Deactivate this manager? They will lose access to the dashboard.",
      )
    ) {
      return;
    }
    try {
      await deactivateManagerApi(managerId, token);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't deactivate manager.",
      );
    }
  };

  if (loading) return <p className={styles.mgmtStatus}>Loading managers…</p>;
  if (error) return <p className={styles.mgmtStatusError}>{error}</p>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {managers.length === 0 && (
        <p className={styles.mgmtStatus}>
          No managers yet. Create one below — they oversee a branch but do
          not serve tickets.
        </p>
      )}

      {managers.map((m) => {
        const id = m._id || m.id;
        return (
          <div key={id} className={styles.mgmtRow}>
            <div>
              <div className={styles.mgmtRowTitle}>{m.name}</div>
              <div className={styles.mgmtRowSub}>
                {m.email}
                {m.branch?.name && <> · {m.branch.name}</>}
              </div>
            </div>
            <div className={styles.mgmtRowActions}>
              <button
                className={styles.mgmtLinkBtn}
                onClick={() => handleDeactivate(id)}
              >
                Deactivate
              </button>
            </div>
          </div>
        );
      })}

      <div className={styles.mgmtSubHeading}>Add manager</div>
      <p className={styles.mgmtStatus} style={{ marginBottom: "0.75rem" }}>
        Leave password blank to generate a temporary password
        (Cue-XXXXXX-XXXXXX) shown once after creation.
      </p>
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
          placeholder="Password (optional)"
          value={form.password}
          onChange={handleChange("password")}
          autoComplete="new-password"
        />
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
        {formError && <p className={styles.mgmtStatusError}>{formError}</p>}
        <button
          type="submit"
          className={styles.mgmtSubmitBtn}
          disabled={submitting}
        >
          {submitting ? "Adding…" : "Add manager"}
        </button>
      </form>

      {/* One-time temp password — only when the server generated it. */}
      {tempCreated && (
        <div className={styles.keyModalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.keyModal}>
            <h4>Manager created — temporary password</h4>
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
              — the manager must change it on first sign-in.
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

export default ManagerSubTab;
