import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { apiClient } from "../../lib/apiClient";
import logoUrl from "../../assets/logo.svg";
import styles from "./Branch.module.css";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

const Branch = () => {
  const { branchId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBranch = useCallback(async () => {
    try {
      const res = await apiClient.get(`/branches/public/${branchId}`);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load branch info.");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchBranch();
    const interval = setInterval(fetchBranch, 15000);
    return () => clearInterval(interval);
  }, [fetchBranch]);

  if (loading) {
    return (
      <div className={styles.state}>
        <p>Loading branch…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.state}>
        <p className={styles.error}>{error}</p>
        <Link to="/" className={styles.backLink}>
          ← Back to home
        </Link>
      </div>
    );
  }

  const { branch, queues, counters } = data;
  const totalWaiting = queues.reduce((sum, q) => sum + q.waiting, 0);

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <motion.div initial="hidden" animate="visible">
          <div className={styles.logoHeader}>
            <img src={logoUrl} alt="" />
            <span>Cue</span>
          </div>
          <motion.p className={styles.eyebrow} custom={0} variants={fadeUp}>
            № 008 — Branch
          </motion.p>
          <motion.h1 className={styles.heading} custom={1} variants={fadeUp}>
            {branch.name}
          </motion.h1>
          <motion.p className={styles.location} custom={2} variants={fadeUp}>
            📍 {branch.location}
          </motion.p>
        </motion.div>

        <motion.div
          className={styles.statsRow}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className={styles.statCard}>
            <span className={styles.statValue}>{totalWaiting}</span>
            <span className={styles.statLabel}>waiting now</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {counters.open}/{counters.total}
            </span>
            <span className={styles.statLabel}>counters open</span>
          </div>
        </motion.div>

        <motion.div
          className={styles.queuesSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className={styles.sectionTitle}>Available Services</h2>
          {queues.length === 0 ? (
            <p className={styles.emptyText}>
              No services available at this branch right now.
            </p>
          ) : (
            <div className={styles.queueList}>
              {queues.map((q) => (
                <div key={q.id} className={styles.queueCard}>
                  <div className={styles.queueInfo}>
                    <span className={styles.queueName}>{q.serviceName}</span>
                    <span className={styles.queueWaiting}>
                      {q.waiting === 0
                        ? "No one waiting"
                        : `${q.waiting} waiting`}
                    </span>
                  </div>
                  {q.waiting > 0 && (
                    <div className={styles.queueBar}>
                      <div
                        className={styles.queueBarFill}
                        style={{
                          width: `${Math.min((q.waiting / Math.max(totalWaiting, 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          className={styles.actions}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Link to="/login" className={styles.joinBtn}>
            Join a Queue →
          </Link>
          <Link to={`/board/${branchId}`} className={styles.boardBtn}>
            View Live Board
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default Branch;
