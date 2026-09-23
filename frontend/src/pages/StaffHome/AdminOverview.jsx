import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import {
  fetchAdminOverview,
  createBranch,
} from "../../features/staff/adminApi";
import { createStaff } from "../../features/staff/manageApi";
import {
  requestApiKey,
  fetchApiKeyRequests,
  revealApiKeyRequest,
} from "../../features/staff/apiKeyRequestApi";
import { ApiError } from "../../lib/apiClient";
import styles from "./StaffHome.module.css";

// Scopes a bank admin may request (admin scope is superadmin-only).
const REQUESTABLE_SCOPES = [
  "branches:read",
  "tickets:read",
  "tickets:write",
  "staff:read",
  "analytics:read",
  "webhooks:manage",
];

/**
 * AdminOverview — cross-branch dashboard for bank-scoped admin role.
 * Shows all branches (this bank only), all managers with staff counts,
 * forms to create branches/managers, and the API key request panel
 * (request new key + view status / one-time reveal).
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

  // API key request state
  const [keyRequests, setKeyRequests] = useState([]);
  const [keyForm, setKeyForm] = useState({
    label: "",
    rateLimit: 100,
    scopes: ["branches:read", "tickets:read", "tickets:write"],
  });
  const [keyFormError, setKeyFormError] = useState(null);
  const [keySubmitting, setKeySubmitting] = useState(false);
  const [revealedKey, setRevealedKey] = useState(null); // one-time raw key display

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

  const loadKeyRequests = useCallback(async () => {
    try {
      const res = await fetchApiKeyRequests(auth.apiKey);
      setKeyRequests(res.data?.items || res.data?.data || []);
    } catch {
      // Non-fatal — request panel just stays empty.
      setKeyRequests([]);
    }
  }, [auth.apiKey]);

  useEffect(() => {
    load();
    loadKeyRequests();
  }, [load, loadKeyRequests]);

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

  // ── API key request handlers ──────────────────────────────
  const toggleScope = (scope) =>
    setKeyForm((f) => ({
      ...f,
      scopes: f.scopes.includes(scope)
        ? f.scopes.filter((s) => s !== scope)
        : [...f.scopes, scope],
    }));

  const handleRequestKey = async (e) => {
    e.preventDefault();
    setKeyFormError(null);
    if (keyForm.scopes.length === 0) {
      setKeyFormError("Select at least one scope.");
      return;
    }
    setKeySubmitting(true);
    try {
      await requestApiKey(keyForm, auth.apiKey);
      setKeyForm({
        label: "",
        rateLimit: 100,
        scopes: ["branches:read", "tickets:read", "tickets:write"],
      });
      await loadKeyRequests();
    } catch (err) {
      setKeyFormError(
        err instanceof ApiError
          ? err.errors?.join(", ") || err.message
          : "Couldn't submit request.",
      );
    } finally {
      setKeySubmitting(false);
    }
  };

  const handleRevealKey = async (id) => {
    try {
      const res = await revealApiKeyRequest(id, auth.apiKey);
      if (res.data?.key) {
        setRevealedKey({ id, key: res.data.key });
      } else {
        setKeyFormError("Key already revealed previously.");
      }
      await loadKeyRequests();
    } catch (err) {
      setKeyFormError(err.message || "Couldn't reveal key.");
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

      {/* ── API Key Request Panel ─────────────────────── */}
      <div className={styles.mgmtSubHeading}>API key access</div>
      <p className={styles.mgmtStatus}>
        Request an API key for your bank. The superadmin reviews it on the
        platform console — once approved you can reveal the key once here.
      </p>

      <form onSubmit={handleRequestKey} className={styles.mgmtInlineForm}>
        <input
          placeholder="Label (e.g. Core banking backend)"
          value={keyForm.label}
          onChange={(e) =>
            setKeyForm((f) => ({ ...f, label: e.target.value }))
          }
        />
        <input
          type="number"
          min={1}
          max={10000}
          title="Rate limit (requests/min)"
          placeholder="Rate limit"
          value={keyForm.rateLimit}
          onChange={(e) =>
            setKeyForm((f) => ({
              ...f,
              rateLimit: parseInt(e.target.value, 10) || 100,
            }))
          }
          style={{ maxWidth: 140 }}
        />
        <div className={styles.scopeChips}>
          {REQUESTABLE_SCOPES.map((scope) => (
            <button
              type="button"
              key={scope}
              className={
                keyForm.scopes.includes(scope)
                  ? styles.scopeChipActive
                  : styles.scopeChip
              }
              onClick={() => toggleScope(scope)}
            >
              {scope}
            </button>
          ))}
        </div>
        {keyFormError && (
          <p className={styles.mgmtStatusError}>{keyFormError}</p>
        )}
        <button
          type="submit"
          className={styles.mgmtSubmitBtn}
          disabled={keySubmitting}
        >
          {keySubmitting ? "Submitting…" : "Request API key"}
        </button>
      </form>

      {/* One-time raw key reveal modal */}
      {revealedKey && (
        <div className={styles.keyModalBackdrop}>
          <div className={styles.keyModal}>
            <h4>Your API key</h4>
            <div className={styles.rawKeyBox}>
              <code>{revealedKey.key}</code>
              <button
                type="button"
                className={styles.scopeChip}
                onClick={() => navigator.clipboard?.writeText(revealedKey.key)}
              >
                Copy
              </button>
            </div>
            <p className={styles.mgmtStatusError} style={{ background: "none", padding: 0 }}>
              This is the only time this key will be shown. Store it securely.
            </p>
            <button
              type="button"
              className={styles.mgmtSubmitBtn}
              onClick={() => setRevealedKey(null)}
            >
              I've saved it
            </button>
          </div>
        </div>
      )}

      <div className={styles.mgmtSubHeading}>Request status</div>
      {keyRequests.length === 0 && (
        <p className={styles.mgmtStatus}>No API key requests yet.</p>
      )}
      {keyRequests.map((r) => (
        <div key={r.id} className={styles.mgmtRow}>
          <div>
            <div className={styles.mgmtRowTitle}>
              {r.label || "API key request"}
            </div>
            <div className={styles.mgmtRowSub}>
              scopes: {r.scopes?.join(", ")} · {r.rateLimit}/min ·{" "}
              {new Date(r.createdAt).toLocaleString()}
              {r.reviewNote ? ` · note: ${r.reviewNote}` : ""}
            </div>
          </div>
          <div className={styles.mgmtRowActions}>
            <span
              className={
                r.status === "approved"
                  ? styles.mgmtBadgeOpen
                  : r.status === "rejected"
                    ? styles.mgmtBadgeClosed
                    : styles.mgmtBadgePending
              }
            >
              {r.status}
            </span>
            {r.canRevealKey && (
              <button
                type="button"
                className={styles.mgmtSubmitBtn}
                onClick={() => handleRevealKey(r.id)}
              >
                Reveal key
              </button>
            )}
          </div>
        </div>
      ))}
    </motion.div>
  );
};

export default AdminOverview;
