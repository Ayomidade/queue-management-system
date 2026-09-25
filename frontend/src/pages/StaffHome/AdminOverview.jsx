import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import {
  fetchAdminOverview,
  createBranch,
} from "../../features/staff/adminApi";
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

// Build code snippets for a given key + base URL.
const buildSnippets = (key, baseUrl) => {
  const url = `${baseUrl}/v1/branches`;
  return [
    {
      label: "cURL",
      code: `curl -s -X GET "${url}" \\
  -H "X-API-Key: ${key}" \\
  -w "\\nTime: %{time_total}s"`,
    },
    {
      label: "JavaScript (fetch)",
      code: `fetch("${url}", {
  headers: { "X-API-Key": "${key}" },
})
  .then(r => r.json())
  .then(console.log);`,
    },
    {
      label: "Python (requests)",
      code: `import requests
response = requests.get(
  "${url}",
  headers={"X-API-Key": "${key}"}
)
print(response.json())`,
    },
    {
      label: "Node (axios)",
      code: `import axios from "axios";
axios.get("${url}", {
  headers: { "X-API-Key": "${key}" },
}).then(r => console.log(r.data));`,
    },
  ];
};

/**
 * AdminOverview — cross-branch dashboard for bank-scoped admin role.
 * Shows all branches (this bank only), all managers with staff counts,
 * a form to create branches, and the API key request panel
 * (request new key + view status / one-time reveal).
 *
 * Manager creation lives on Manage → Managers (POST /managers).
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

  // API key request state
  const [keyRequests, setKeyRequests] = useState([]);
  const [keyForm, setKeyForm] = useState({
    label: "",
    rateLimit: 100,
    scopes: ["branches:read", "tickets:read", "tickets:write"],
  });
  const [keyFormError, setKeyFormError] = useState(null);
  const [keySubmitting, setKeySubmitting] = useState(false);
  const [adminRevealKey, setAdminRevealKey] = useState(null); // one-time raw key display
  const [snippetOpenId, setSnippetOpenId] = useState(null); // which key row shows snippets
  const [testConnectionResult, setTestConnectionResult] = useState(null); // test result in modal
  const [testLoading, setTestLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      // JWT admin overview — bank scope from Admin.bank server-side (WP6).
      const res = await fetchAdminOverview(auth.token);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load admin overview.");
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  const loadKeyRequests = useCallback(async () => {
    try {
      const res = await fetchApiKeyRequests(auth.token);
      // paginatedResponse nests under data: { data: [...], meta }
      setKeyRequests(res.data?.data || res.data?.items || []);
    } catch {
      // Non-fatal — request panel just stays empty.
      setKeyRequests([]);
    }
  }, [auth.token]);

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
      await createBranch(branchForm, auth.token);
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
      await requestApiKey(keyForm, auth.token);
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
      const res = await revealApiKeyRequest(id, auth.token);
      if (res.data?.key) {
        setAdminRevealKey({ id, key: res.data.key });
        setTestConnectionResult(null);
      } else {
        setKeyFormError("Key already revealed previously.");
      }
      await loadKeyRequests();
    } catch (err) {
      setKeyFormError(err.message || "Couldn't reveal key.");
    }
  };

  const handleTestConnection = async (key) => {
    setTestLoading(true);
    setTestConnectionResult(null);
    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
      const res = await fetch(`${base.replace("/api", "")}/api/test-connection`, {
        headers: { "X-API-Key": key },
      });
      const data = await res.json();
      setTestConnectionResult({ ok: res.ok, data });
    } catch (err) {
      setTestConnectionResult({ ok: false, error: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  const toggleSnippets = (id) => {
    setSnippetOpenId((prev) => (prev === id ? null : id));
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
        <p className={styles.mgmtStatus}>
          No managers yet. Create one under Manage → Managers.
        </p>
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

      {/* ── API Key Request Panel ─────────────────────── */}
      <div className={styles.mgmtSubHeading}>API key access</div>
      <p className={styles.mgmtStatus}>
        Request an API key for your bank. After superadmin approval, reveal
        it once here and send it on your systems as{" "}
        <code>X-API-Key: cue_…</code> to <code>/api/v1/*</code>. The Cue
        dashboard itself uses your JWT login — not this key.
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
      {adminRevealKey && (
        <div className={styles.keyModalBackdrop}>
          <div
            className={styles.keyModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="api-key-modal-title"
          >
            <h4 id="api-key-modal-title">Your API key</h4>
            <div className={styles.rawKeyBox}>
              <code>{adminRevealKey.key}</code>
              <button
                type="button"
                className={styles.scopeChip}
                onClick={() => navigator.clipboard?.writeText(adminRevealKey.key)}
              >
                Copy
              </button>
            </div>
            <p className={styles.mgmtStatusError} style={{ background: "none", padding: 0 }}>
              This is the only time this key will be shown. Store it securely.
            </p>

            {/* Integration snippets with the revealed key */}
            <div className={styles.snippetSection}>
              <h5>Quick-start snippets</h5>
              <p className={styles.snippetNote}>
                Base URL: <code>{import.meta.env.VITE_API_URL || "http://localhost:3000/api"}</code>
              </p>
              {buildSnippets(adminRevealKey.key, import.meta.env.VITE_API_URL || "http://localhost:3000/api").map((s, i) => (
                <div key={i} className={styles.snippetCard}>
                  <div className={styles.snippetHeader}>
                    <span>{s.label}</span>
                    <button
                      type="button"
                      className={styles.snippetCopyBtn}
                      onClick={() => navigator.clipboard?.writeText(s.code)}
                    >
                      Copy
                    </button>
                  </div>
                  <pre className={styles.snippetCode}><code>{s.code}</code></pre>
                </div>
              ))}

              {/* Test connection with the revealed key */}
              <div className={styles.testConnectionBox}>
                <button
                  type="button"
                  className={styles.testConnectionBtn}
                  onClick={() => handleTestConnection(adminRevealKey.key)}
                  disabled={testLoading}
                >
                  {testLoading ? "Testing…" : "Test this key"}
                </button>
                {testConnectionResult && (
                  <div className={testConnectionResult.ok ? styles.testSuccess : styles.testError}>
                    {testConnectionResult.ok ? (
                      <>
                        <strong>✓ Key works</strong> — Bank: {testConnectionResult.data.data?.bankName}{" "}
                        | Scopes: {testConnectionResult.data.data?.scopes?.join(", ")} | Last used:{" "}
                        {testConnectionResult.data.data?.lastUsedAt
                          ? new Date(testConnectionResult.data.data.lastUsedAt).toLocaleString()
                          : "never"}
                      </>
                    ) : (
                      <>
                        <strong>✗ Test failed</strong> —{" "}
                        {testConnectionResult.error || testConnectionResult.data?.message}
                      </>
                    )}
                  </div>
                )}
              </div>

            </div>

            <button
              type="button"
              className={styles.mgmtSubmitBtn}
              onClick={() => setAdminRevealKey(null)}
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
        <>
          <div key={r.id} className={styles.mgmtRow}>
            <div>
              <div className={styles.mgmtRowTitle}>
                {r.label || "API key request"}
              </div>
              <div className={styles.mgmtRowSub}>
                scopes: {r.scopes?.join(", ")} · {r.rateLimit}/min ·{" "}
                {new Date(r.createdAt).toLocaleString()}
                {r.keyPrefix ? ` · ends in ${r.keyPrefix}` : ""}
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
              {r.status === "approved" && r.keyStatus && (
                <span
                  className={
                    r.keyStatus === "active"
                      ? styles.mgmtBadgeOpen
                      : r.keyStatus === "suspended"
                        ? styles.mgmtBadgePending
                        : styles.mgmtBadgeClosed
                  }
                  title={
                    r.keyStatus === "revoked"
                      ? "Key revoked by platform — integration calls will be rejected"
                      : r.keyStatus === "suspended"
                        ? "Key temporarily disabled by platform"
                        : "Key is active for X-API-Key integration calls"
                  }
                >
                  {r.keyStatus}
                </span>
              )}
              {r.status === "approved" &&
              (r.keyStatus === "active" || r.keyStatus === "suspended") && (
                <button
                  type="button"
                  className={styles.mgmtLinkBtn}
                  onClick={() => toggleSnippets(r.id)}
                >
                  {snippetOpenId === r.id ? "Hide snippets" : "Use this key"}
                </button>
              )}
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

          {snippetOpenId === r.id && r.status === "approved" && (
            <div key={`snippet-${r.id}`} className={styles.snippetRowPanel}>
              <p className={styles.snippetNote}>
                Key prefix: <code>{r.keyPrefix || "…"}</code> — replace with your full key.
                Base URL: <code>{import.meta.env.VITE_API_URL || "http://localhost:3000/api"}</code>
              </p>
              {buildSnippets(`cue_${r.keyPrefix || "XXXXXX..."}XXXXXXXXXXXXXXXXXXXX`, import.meta.env.VITE_API_URL || "http://localhost:3000/api").map((s, i) => (
                <div key={i} className={styles.snippetCard}>
                  <div className={styles.snippetHeader}>
                    <span>{s.label}</span>
                    <button
                      type="button"
                      className={styles.snippetCopyBtn}
                      onClick={() => navigator.clipboard?.writeText(s.code)}
                    >
                      Copy
                    </button>
                  </div>
                  <pre className={styles.snippetCode}><code>{s.code}</code></pre>
                </div>
              ))}
            </div>
          )}
        </>
      ))}
    </motion.div>
  );
};

export default AdminOverview;
