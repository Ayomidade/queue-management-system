import { useState, useEffect } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import { fetchWaitTargets, updateWaitTargets } from "../../features/agent/agentApi";
import styles from "./AdvancedAnalytics.module.css";

const WaitTimeTargets = ({ branchId }) => {
  const { auth } = useAuth();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [targets, setTargets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    fetchWaitTargets(branchId, auth.token)
      .then((res) => {
        setData(res.data);
        const t = {};
        res.data.services.forEach((s) => {
          t[s.service] = s.targetMinutes ?? "";
        });
        setTargets(t);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId, auth.token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      for (const [k, v] of Object.entries(targets)) {
        payload[k] = v === "" ? null : Number(v);
      }
      await updateWaitTargets(branchId, payload, auth.token);
      const res = await fetchWaitTargets(branchId, auth.token);
      setData(res.data);
      setEditing(false);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className={styles.loading}>Loading targets…</p>;
  if (!data) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3>Service Wait Time Targets</h3>
        {auth.role === "admin" || auth.role === "manager" ? (
          editing ? (
            <div className={styles.headerActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          ) : (
            <button
              className={styles.editBtn}
              onClick={() => setEditing(true)}
            >
              Edit Targets
            </button>
          )
        ) : null}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Service</th>
              <th>Current Avg</th>
              <th>Target</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.services.map((s) => (
              <tr key={s.queueId}>
                <td>{s.service}</td>
                <td>
                  {s.currentAvgHandleMinutes !== null
                    ? `${s.currentAvgHandleMinutes}m`
                    : "—"}
                </td>
                <td>
                  {editing ? (
                    <input
                      type="number"
                      min="0"
                      className={styles.inlineInput}
                      value={targets[s.service] ?? ""}
                      onChange={(e) =>
                        setTargets({ ...targets, [s.service]: e.target.value })
                      }
                      placeholder="min"
                    />
                  ) : s.targetMinutes !== null ? (
                    `${s.targetMinutes}m`
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {s.onTarget === null ? (
                    <span className={styles.neutral}>No data</span>
                  ) : s.onTarget ? (
                    <span className={styles.good}>On target</span>
                  ) : (
                    <span className={styles.bad}>Over target</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WaitTimeTargets;
