import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import { useBrand } from "../../features/brand/BrandContext";
import { ApiError } from "../../lib/apiClient";
import {
  fetchPlatformOverview,
  fetchPlatformUsage,
  fetchPlatformApiKeys,
  createPlatformApiKey,
  revokePlatformApiKey,
  togglePlatformApiKey,
  rotatePlatformApiKey,
  fetchPlatformKeyRequests,
  reviewPlatformKeyRequest,
} from "../../features/platform/platformApi";
import MotionBackground from "../../components/MotionBackground/MotionBackground";
import logoUrl from "../../assets/logo.svg";
import styles from "./Platform.module.css";

/**
 * PlatformDashboard — superadmin console for API keys + usage monitoring.
 *
 * Tabs:
 * - Overview: key counts, pending requests, requests today / last 7 days, daily bars
 * - API Keys: table of all keys across banks + create / suspend / revoke / rotate
 * - Key Requests: pending bank-admin requests; approve shows raw key once, reject with note
 *
 * Superadmin JWT (auth.token) is used for every call — never an API key.
 */
const PlatformDashboard = () => {
  const { auth, logout } = useAuth();
  const { brand } = useBrand();
  const navigate = useNavigate();

  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [usage, setUsage] = useState(null);
  const [keys, setKeys] = useState(null);
  const [requests, setRequests] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transient raw-key display (create / rotate / approve) — shown once.
  const [rawKeyModal, setRawKeyModal] = useState(null);

  const token = auth?.token;

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [ov, us, ks, rq] = await Promise.all([
        fetchPlatformOverview(token),
        fetchPlatformUsage(token, 7),
        fetchPlatformApiKeys(token, { limit: 100 }),
        fetchPlatformKeyRequests(token, { limit: 100 }),
      ]);
      setOverview(ov.data);
      setUsage(us.data);
      setKeys(ks.data);
      setRequests(rq.data);
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load platform data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleLogout = () => {
    logout();
    navigate("/platform/login", { replace: true });
  };

  // ── Key actions ────────────────────────────────────────────
  const [createForm, setCreateForm] = useState({
    bankName: "",
    label: "",
    scopes: ["branches:read", "tickets:read", "tickets:write"],
    rateLimit: 100,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const res = await createPlatformApiKey(createForm, token);
      setRawKeyModal({
        title: "API key created",
        bankName: res.data.bankName,
        key: res.data.key,
      });
      setCreateForm({
        bankName: "",
        label: "",
        scopes: ["branches:read", "tickets:read", "tickets:write"],
        rateLimit: 100,
      });
      await loadAll();
    } catch (err) {
      setCreateError(
        err instanceof ApiError
          ? err.errors?.join(", ") || err.message
          : "Couldn't create key.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleToggleKey = async (id) => {
    try {
      await togglePlatformApiKey(id, token);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRevokeKey = async (id) => {
    if (!window.confirm("Permanently revoke this key? This cannot be undone."))
      return;
    try {
      await revokePlatformApiKey(id, token);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRotateKey = async (id) => {
    if (!window.confirm("Rotate this key? The old key stays valid for 24h."))
      return;
    try {
      const res = await rotatePlatformApiKey(id, token);
      setRawKeyModal({
        title: "API key rotated",
        bankName: res.data.bankName,
        key: res.data.key,
        note: `Old key valid until ${new Date(
          res.data.oldKeyValidUntil,
        ).toLocaleString()}`,
      });
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Key request actions ────────────────────────────────────
  const [reviewNote, setReviewNote] = useState({});

  const handleApproveRequest = async (id) => {
    try {
      const res = await reviewPlatformKeyRequest(
        id,
        { action: "approve", reviewNote: reviewNote[id] || "" },
        token,
      );
      // Raw key shown ONCE to superadmin; also staged encrypted for bank admin.
      setRawKeyModal({
        title: "Key request approved — copy now",
        bankName: res.data.bankName,
        key: res.data.key,
        note: "Also staged for the bank admin's one-time reveal from their request status.",
      });
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      await reviewPlatformKeyRequest(
        id,
        { action: "reject", reviewNote: reviewNote[id] || "" },
        token,
      );
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <section className={styles.page}>
        <p className={styles.status}>Loading platform console…</p>
      </section>
    );
  }

  const keyList = keys?.items || keys?.data || [];
  const requestList = requests?.items || requests?.data || [];
  const pendingCount = requestList.filter((r) => r.status === "pending").length;
  const maxDaily = Math.max(1, ...(usage?.daily || []).map((d) => d.requests));

  return (
    <section className={styles.page}>
      <MotionBackground />
      <div className={styles.container}>
        <div className={styles.logoHeader}>
          <img src={logoUrl} alt="" />
          <span>{brand.name}</span>
        </div>

        <motion.div
          className={styles.headerRow}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <p className={styles.eyebrow}>№ 012 — platform console</p>
            <h1 className={styles.heading}>
              Hello, {auth?.name?.split(" ")[0] || "Superadmin"}.
            </h1>
          </div>
          <div className={styles.headerActions}>
            <Link to="/" className={styles.ghostBtn}>
              Site
            </Link>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </motion.div>

        {/* ── Tabs ─────────────────────────────────────────── */}
        <div className={styles.topTabs} role="tablist">
          {[
            { id: "overview", label: "Overview" },
            { id: "keys", label: "API Keys" },
            { id: "requests", label: `Key Requests${pendingCount ? ` (${pendingCount})` : ""}` },
          ].map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? styles.topTabActive : styles.topTab}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}

        {/* ── Overview ─────────────────────────────────────── */}
        {tab === "overview" && overview && (
          <div className={styles.panel}>
            <div className={styles.statRow}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{overview.totalKeys}</span>
                <span className={styles.statLabel}>total keys</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{overview.activeKeys}</span>
                <span className={styles.statLabel}>active</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{overview.requestsToday}</span>
                <span className={styles.statLabel}>requests today</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {overview.requestsLast7Days}
                </span>
                <span className={styles.statLabel}>last 7 days</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{overview.pendingRequests}</span>
                <span className={styles.statLabel}>pending requests</span>
              </div>
            </div>

            <div className={styles.subHeading}>Requests — last 7 days</div>
            <div className={styles.barChart}>
              {(usage?.daily || []).map((d) => (
                <div key={d.date} className={styles.barCol}>
                  <div
                    className={styles.bar}
                    style={{ height: `${(d.requests / maxDaily) * 100}%` }}
                    title={`${d.requests} requests`}
                  />
                  <span className={styles.barLabel}>
                    {d.date.slice(5)}
                  </span>
                  <span className={styles.barValue}>{d.requests}</span>
                </div>
              ))}
              {(usage?.daily || []).length === 0 && (
                <p className={styles.status}>No usage recorded yet.</p>
              )}
            </div>

            <div className={styles.subHeading}>Top keys this week</div>
            {(usage?.byKey || []).slice(0, 5).map((k) => (
              <div key={k.apiKey} className={styles.row}>
                <div>
                  <div className={styles.rowTitle}>
                    {k.bankName}
                    {k.label ? ` · ${k.label}` : ""}
                  </div>
                  <div className={styles.rowSub}>
                    ends in {k.keyPrefix} · {k.lifetimeRequests} lifetime
                  </div>
                </div>
                <span className={styles.badgeCount}>{k.requests} req</span>
              </div>
            ))}
          </div>
        )}

        {/* ── API Keys ─────────────────────────────────────── */}
        {tab === "keys" && (
          <div className={styles.panel}>
            <div className={styles.subHeading}>Create key</div>
            <form onSubmit={handleCreateKey} className={styles.inlineForm}>
              <input
                required
                placeholder="Bank name"
                value={createForm.bankName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, bankName: e.target.value }))
                }
              />
              <input
                placeholder="Label (e.g. Production)"
                value={createForm.label}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, label: e.target.value }))
                }
              />
              <input
                type="number"
                min={1}
                max={10000}
                style={{ width: 110 }}
                title="Rate limit (req/min)"
                value={createForm.rateLimit}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    rateLimit: parseInt(e.target.value, 10) || 100,
                  }))
                }
              />
              {createError && <p className={styles.errorMsg}>{createError}</p>}
              <button type="submit" className={styles.submitBtn} disabled={creating}>
                {creating ? "Creating…" : "Create key"}
              </button>
            </form>

            <div className={styles.subHeading}>All keys</div>
            {keyList.length === 0 && (
              <p className={styles.status}>No API keys yet.</p>
            )}
            {keyList.map((k) => (
              <div key={k._id || k.id} className={styles.row}>
                <div>
                  <div className={styles.rowTitle}>
                    {k.bankName}
                    {k.label ? ` · ${k.label}` : ""}
                  </div>
                  <div className={styles.rowSub}>
                    ends in {k.keyPrefix} · {k.rateLimit}/min ·{" "}
                    {k.requestCount ?? 0} lifetime req
                    {k.lastUsedAt
                      ? ` · last used ${new Date(k.lastUsedAt).toLocaleString()}`
                      : ""}
                  </div>
                </div>
                <div className={styles.rowActions}>
                  <span
                    className={
                      k.isActive ? styles.badgeActive : styles.badgeSuspended
                    }
                  >
                    {k.isActive ? "Active" : "Suspended"}
                  </span>
                  <button
                    className={styles.smallBtn}
                    onClick={() => handleToggleKey(k._id || k.id)}
                  >
                    {k.isActive ? "Suspend" : "Enable"}
                  </button>
                  <button
                    className={styles.smallBtn}
                    onClick={() => handleRotateKey(k._id || k.id)}
                  >
                    Rotate
                  </button>
                  <button
                    className={styles.smallBtnDanger}
                    onClick={() => handleRevokeKey(k._id || k.id)}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Key Requests ─────────────────────────────────── */}
        {tab === "requests" && (
          <div className={styles.panel}>
            <div className={styles.subHeading}>Bank admin key requests</div>
            {requestList.length === 0 && (
              <p className={styles.status}>No key requests yet.</p>
            )}
            {requestList.map((r) => (
              <div key={r._id || r.id} className={styles.requestCard}>
                <div className={styles.requestTop}>
                  <div>
                    <div className={styles.rowTitle}>
                      {r.bankName}
                      {r.label ? ` · ${r.label}` : ""}
                    </div>
                    <div className={styles.rowSub}>
                      scopes: {r.scopes?.join(", ")} · {r.rateLimit}/min ·{" "}
                      {new Date(r.createdAt).toLocaleString()}
                      {r.requestedBy?.name
                        ? ` · by ${r.requestedBy.name}`
                        : ""}
                    </div>
                  </div>
                  <span
                    className={
                      r.status === "approved"
                        ? styles.badgeActive
                        : r.status === "rejected"
                          ? styles.badgeSuspended
                          : styles.badgePending
                    }
                  >
                    {r.status}
                  </span>
                </div>

                {r.status === "pending" && (
                  <div className={styles.requestActions}>
                    <input
                      placeholder="Review note (optional)"
                      value={reviewNote[r._id || r.id] || ""}
                      onChange={(e) =>
                        setReviewNote((n) => ({
                          ...n,
                          [r._id || r.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      className={styles.submitBtn}
                      onClick={() => handleApproveRequest(r._id || r.id)}
                    >
                      Approve
                    </button>
                    <button
                      className={styles.smallBtnDanger}
                      onClick={() => handleRejectRequest(r._id || r.id)}
                    >
                      Reject
                    </button>
                  </div>
                )}

                {r.reviewNote && (
                  <p className={styles.rowSub}>Note: {r.reviewNote}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── One-time raw key modal ──────────────────────────── */}
      {rawKeyModal && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h3>{rawKeyModal.title}</h3>
            <p className={styles.rowSub}>
              Bank: {rawKeyModal.bankName}
            </p>
            {rawKeyModal.note && (
              <p className={styles.rowSub}>{rawKeyModal.note}</p>
            )}
            <div className={styles.rawKeyBox}>
              <code>{rawKeyModal.key}</code>
              <button
                className={styles.smallBtn}
                onClick={() =>
                  navigator.clipboard?.writeText(rawKeyModal.key)
                }
              >
                Copy
              </button>
            </div>
            <p className={styles.errorMsg} style={{ background: "none", padding: 0 }}>
              This is the only time this key will be shown. Store it securely.
            </p>
            <button
              className={styles.submitBtn}
              onClick={() => setRawKeyModal(null)}
            >
              I've saved it
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default PlatformDashboard;
