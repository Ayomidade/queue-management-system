import { useEffect, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import EmailVerificationBadge from "../../components/EmailVerificationBadge/EmailVerificationBadge";
import ChangePassword from "../../components/ChangePassword/ChangePassword";
import MotionBackground from "../../components/MotionBackground/MotionBackground";
import logoUrl from "../../assets/logo.svg";
import styles from "./Settings.module.css";

const ROLE_LABEL = {
  customer: "Customer",
  staff: "Staff",
  manager: "Manager",
  admin: "Admin",
};

const Settings = () => {
  const { auth } = useAuth();
  const [branchName, setBranchName] = useState(null);

  useEffect(() => {
    if (!auth.branch) return;
    apiClient
      .get(`/branches/public/${auth.branch}`)
      .then((res) => setBranchName(res.data.branch.name))
      .catch(() => {});
  }, [auth.branch]);

  return (
    <section className={styles.page}>
      <MotionBackground />
      <div className={styles.container}>
        <div className={styles.logoHeader}>
          <img src={logoUrl} alt="" />
          <span>Cue</span>
        </div>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>№ 015 — Settings</p>
            <h1 className={styles.heading}>Your account</h1>
          </div>
        </div>

        <motion.div
          className={styles.section}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className={styles.sectionTitle}>Profile</p>
          <div className={styles.profileCard}>
            <div className={styles.profileRow}>
              <span className={styles.profileLabel}>Name</span>
              <span className={styles.profileValue}>{auth.name}</span>
            </div>
            <div className={styles.profileRow}>
              <span className={styles.profileLabel}>Email</span>
              <span className={styles.profileValue}>{auth.email}</span>
            </div>
            <div className={styles.profileRow}>
              <span className={styles.profileLabel}>Role</span>
              <span className={styles.profileValue}>
                {ROLE_LABEL[auth.role] || auth.role}
              </span>
            </div>
            {auth.branch && (
              <div className={styles.profileRow}>
                <span className={styles.profileLabel}>Branch</span>
                <span className={styles.profileValue}>
                  {branchName || auth.branch}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          className={styles.section}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <p className={styles.sectionTitle}>Email verification</p>
          <div className={styles.profileCard}>
            <EmailVerificationBadge />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <ChangePassword />
        </motion.div>
      </div>
    </section>
  );
};

export default Settings;
