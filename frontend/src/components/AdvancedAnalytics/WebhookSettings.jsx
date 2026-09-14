import { useState, useEffect } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import {
  fetchWebhooks,
  createWebhook,
  deleteWebhook,
  toggleWebhook,
} from "../../features/agent/agentApi";
import styles from "./AdvancedAnalytics.module.css";

const AVAILABLE_EVENTS = [
  "ticket.called",
  "ticket.completed",
  "ticket.cancelled",
  "day.opened",
  "day.closed",
  "queue.threshold",
];

const WebhookSettings = () => {
  const { auth } = useAuth();
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ url: "", events: [] });

  const load = () => {
    setLoading(true);
    fetchWebhooks(auth.token)
      .then((res) => setWebhooks(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [auth.token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.url || form.events.length === 0) return;
    try {
      await createWebhook(form, auth.token);
      setForm({ url: "", events: [] });
      setShowForm(false);
      load();
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this webhook?")) return;
    await deleteWebhook(id, auth.token);
    load();
  };

  const handleToggle = async (id) => {
    await toggleWebhook(id, auth.token);
    load();
  };

  const toggleEvent = (event) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event)
        ? f.events.filter((e) => e !== event)
        : [...f.events, event],
    }));
  };

  if (loading) return <p className={styles.loading}>Loading webhooks…</p>;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3>Webhooks</h3>
        <button
          className={styles.editBtn}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ Add Webhook"}
        </button>
      </div>

      {showForm && (
        <form className={styles.webhookForm} onSubmit={handleCreate}>
          <input
            type="url"
            className={styles.input}
            placeholder="https://your-server.com/webhook"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            required
          />
          <div className={styles.checkboxGroup}>
            {AVAILABLE_EVENTS.map((ev) => (
              <label key={ev} className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={form.events.includes(ev)}
                  onChange={() => toggleEvent(ev)}
                />
                <span>{ev}</span>
              </label>
            ))}
          </div>
          <button
            type="submit"
            className={styles.saveBtn}
            disabled={!form.url || form.events.length === 0}
          >
            Create
          </button>
        </form>
      )}

      {webhooks.length === 0 ? (
        <p className={styles.empty}>No webhooks configured.</p>
      ) : (
        <div className={styles.webhookList}>
          {webhooks.map((wh) => (
            <div key={wh._id} className={styles.webhookRow}>
              <div className={styles.webhookInfo}>
                <span className={styles.webhookUrl}>{wh.url}</span>
                <span className={styles.webhookEvents}>
                  {wh.events.join(", ")}
                </span>
              </div>
              <div className={styles.webhookActions}>
                <button
                  className={wh.isActive ? styles.badgeActive : styles.badgeInactive}
                  onClick={() => handleToggle(wh._id)}
                >
                  {wh.isActive ? "Active" : "Paused"}
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(wh._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WebhookSettings;
