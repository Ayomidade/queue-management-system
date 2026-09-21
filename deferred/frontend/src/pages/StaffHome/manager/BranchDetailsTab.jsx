import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../../features/auth/AuthContext";
import {
  fetchBranchDetails,
  updateBranchDetails,
} from "../../../features/manager/managerApi";
import { ApiError } from "../../../lib/apiClient";
import styles from "./ManagerPanel.module.css";

const BranchDetailsTab = ({ branchId }) => {
  const { auth } = useAuth();
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    location: "",
    address: "",
    phone: "",
    email: "",
    slackWebhook: "",
    discordWebhook: "",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    setLoading(true);
    fetchBranchDetails(branchId, auth.token)
      .then((res) => {
        if (cancelled) return;
        setBranch(res.data);
        setForm({
          name: res.data.name || "",
          location: res.data.location || "",
          address: res.data.address || "",
          phone: res.data.phone || "",
          email: res.data.email || "",
          slackWebhook: res.data.notificationWebhooks?.slack || "",
          discordWebhook: res.data.notificationWebhooks?.discord || "",
        });
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load branch details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, auth.token]);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        location: form.location,
        address: form.address,
        phone: form.phone,
        email: form.email,
        notificationWebhooks: {
          slack: form.slackWebhook,
          discord: form.discordWebhook,
        },
      };
      await updateBranchDetails(branchId, payload, auth.token);
      setBranch((prev) => ({ ...prev, ...payload }));
      setEditing(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.errors?.join(", ") || err.message
          : "Couldn't update branch.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className={styles.status}>Loading branch details…</p>;
  }

  if (!branch) {
    return <p className={styles.status}>Branch not found.</p>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {editing ? (
        <form onSubmit={handleSave} className={styles.branchForm}>
          <div className={styles.formRow}>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Branch name *</span>
              <input
                required
                placeholder="e.g. Ikeja Main Branch"
                value={form.name}
                onChange={handleChange("name")}
              />
            </label>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Area / City *</span>
              <input
                required
                placeholder="e.g. Ikeja, Lagos"
                value={form.location}
                onChange={handleChange("location")}
              />
            </label>
          </div>
          <label className={styles.formField}>
            <span className={styles.formLabel}>Full address</span>
            <input
              placeholder="e.g. 15 Oba Akran Avenue, Ikeja, Lagos"
              value={form.address}
              onChange={handleChange("address")}
            />
          </label>
          <div className={styles.formRow}>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Phone number</span>
              <input
                placeholder="e.g. +234 801 234 5678"
                value={form.phone}
                onChange={handleChange("phone")}
              />
            </label>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Branch email</span>
              <input
                type="email"
                placeholder="e.g. ikeja@yourbank.com"
                value={form.email}
                onChange={handleChange("email")}
              />
            </label>
          </div>
          <div className={styles.formRow}>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Slack Webhook URL</span>
              <input
                type="url"
                placeholder="https://hooks.slack.com/..."
                value={form.slackWebhook}
                onChange={handleChange("slackWebhook")}
              />
            </label>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Discord Webhook URL</span>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={form.discordWebhook}
                onChange={handleChange("discordWebhook")}
              />
            </label>
          </div>
          {error && <p className={styles.statusError}>{error}</p>}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => {
                setEditing(false);
                setError(null);
                setForm({
                  name: branch.name || "",
                  location: branch.location || "",
                  address: branch.address || "",
                  phone: branch.phone || "",
                  email: branch.email || "",
                  slackWebhook: branch.notificationWebhooks?.slack || "",
                  discordWebhook: branch.notificationWebhooks?.discord || "",
                });
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div>
          <div className={styles.row}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "1.05rem" }}>
                {branch.name}
              </div>
              <div className={styles.rowSub}>
                📍 {branch.location}
                {branch.address && <> · {branch.address}</>}
                {branch.phone && <> · 📞 {branch.phone}</>}
                {branch.email && <> · ✉ {branch.email}</>}
              </div>
            </div>
            <button
              className={styles.linkBtn}
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          </div>

          <div className={styles.tileGrid} style={{ marginTop: "1.25rem", gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div className={styles.tile}>
              <span className={styles.tileValue}>
                {branch.dayOpen ? "Open" : "Closed"}
              </span>
              <span className={styles.tileLabel}>Day status</span>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileValue}>
                {branch.maxAppointmentsPerSlot || 5}
              </span>
              <span className={styles.tileLabel}>Max appointments/slot</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default BranchDetailsTab;
