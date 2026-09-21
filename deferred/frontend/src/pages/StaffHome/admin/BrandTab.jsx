import { useState, useEffect } from "react";
import { useBrand } from "../../../features/brand/BrandContext";
import { useAuth } from "../../../features/auth/AuthContext";
import { motion } from "framer-motion";
import styles from "../manager/ManagerPanel.module.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const BASE_URL = API_URL.replace(/\/api\/?$/, "");

const BrandTab = () => {
  const { auth } = useAuth();
  const { brand, refreshBrand } = useBrand();
  const [form, setForm] = useState({
    name: "",
    primaryColor: "#4fa37b",
    accentColor: "#c9a227",
    alertColor: "#c1432b",
    supportEmail: "",
    emailFromName: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setForm({
      name: brand.name || "",
      primaryColor: brand.primaryColor || "#4fa37b",
      accentColor: brand.accentColor || "#c9a227",
      alertColor: brand.alertColor || "#c1432b",
      supportEmail: brand.supportEmail || "",
      emailFromName: brand.emailFromName || "",
    });
  }, [brand]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${BASE_URL}/api/brand`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.status === "success") {
        setMsg("Brand settings saved.");
        refreshBrand();
      } else {
        setMsg(json.message || "Failed to save.");
      }
    } catch {
      setMsg("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <p className={styles.subHeading}>Brand Settings</p>
      <p className={styles.status}>
        Configure the platform name and colors. These apply across the entire
        deployment.
      </p>

      <form onSubmit={handleSubmit} className={styles.branchForm}>
        <label className={styles.formField}>
          <span className={styles.formLabel}>Platform Name</span>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. SmartQueue"
          />
        </label>

        <div className={styles.formRow}>
          <label className={styles.formField}>
            <span className={styles.formLabel}>Primary Color</span>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="color"
                name="primaryColor"
                value={form.primaryColor}
                onChange={handleChange}
                style={{ width: 40, height: 32, border: "none", cursor: "pointer" }}
              />
              <input
                name="primaryColor"
                value={form.primaryColor}
                onChange={handleChange}
              />
            </div>
          </label>

          <label className={styles.formField}>
            <span className={styles.formLabel}>Accent Color</span>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="color"
                name="accentColor"
                value={form.accentColor}
                onChange={handleChange}
                style={{ width: 40, height: 32, border: "none", cursor: "pointer" }}
              />
              <input
                name="accentColor"
                value={form.accentColor}
                onChange={handleChange}
              />
            </div>
          </label>
        </div>

        <div className={styles.formRow}>
          <label className={styles.formField}>
            <span className={styles.formLabel}>Alert Color</span>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="color"
                name="alertColor"
                value={form.alertColor}
                onChange={handleChange}
                style={{ width: 40, height: 32, border: "none", cursor: "pointer" }}
              />
              <input
                name="alertColor"
                value={form.alertColor}
                onChange={handleChange}
              />
            </div>
          </label>

          <label className={styles.formField}>
            <span className={styles.formLabel}>Support Email</span>
            <input
              name="supportEmail"
              value={form.supportEmail}
              onChange={handleChange}
              placeholder="support@yourbank.com"
            />
          </label>
        </div>

        <label className={styles.formField}>
          <span className={styles.formLabel}>Email Sender Name</span>
          <input
            name="emailFromName"
            value={form.emailFromName}
            onChange={handleChange}
            placeholder="SmartQueue"
          />
        </label>

        {msg && <p className={styles.status}>{msg}</p>}

        <button type="submit" className={styles.submitBtn} disabled={saving}>
          {saving ? "Saving..." : "Save Brand Settings"}
        </button>
      </form>
    </motion.div>
  );
};

export default BrandTab;
