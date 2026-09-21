import { useState, useRef } from "react";
import { useAuth } from "../../../features/auth/AuthContext";
import { apiClient } from "../../../lib/apiClient";
import PeakHoursHeatmap from "../../../components/AdvancedAnalytics/PeakHoursHeatmap";
import StaffLeaderboard from "../../../components/AdvancedAnalytics/StaffLeaderboard";
import WaitTimeTargets from "../../../components/AdvancedAnalytics/WaitTimeTargets";
import WebhookSettings from "../../../components/AdvancedAnalytics/WebhookSettings";
import styles from "./ManagerPanel.module.css";

const AnalyticsTab = ({ branchId }) => {
  const { auth } = useAuth();
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/staff-import/import`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token}` },
          body: formData,
        },
      );

      const data = await res.json();
      setImportResult(data.data || { created: 0, skipped: 0, errors: [] });
    } catch {
      setImportResult({ created: 0, skipped: 1, errors: [{ error: "Import failed" }] });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={styles.analyticsSection}>
      <PeakHoursHeatmap branchId={branchId} />
      <StaffLeaderboard branchId={branchId} />
      <WaitTimeTargets branchId={branchId} />
      <WebhookSettings />

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>Bulk Staff Import</h3>
        </div>
        <p className={styles.importHint}>
          Upload a CSV with columns: <code>name, email, password, role</code> (role defaults to "staff")
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleCSVImport}
          style={{ display: "none" }}
        />
        <button
          className={styles.editBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing ? "Importing…" : "Choose CSV File"}
        </button>
        {importResult && (
          <div className={styles.importResult}>
            <p>
              Created: <strong>{importResult.created}</strong> | Skipped:{" "}
              <strong>{importResult.skipped}</strong>
            </p>
            {importResult.errors?.length > 0 && (
              <ul className={styles.importErrors}>
                {importResult.errors.map((err, i) => (
                  <li key={i}>
                    {err.email}: {err.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>Export Analytics</h3>
        </div>
        <div className={styles.exportActions}>
          <a
            href={`${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/export/branch/${branchId}/csv`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.editBtn}
          >
            Download CSV
          </a>
          <a
            href={`${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/export/branch/${branchId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.editBtn}
          >
            Download Report
          </a>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;
