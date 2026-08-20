import { motion } from "framer-motion";
import styles from "./StatsStrip.module.css";

const STATS = [
  { value: "4.2 min", label: "average wait, down from 26" },
  { value: "58", label: "branches live" },
  { value: "1.1M+", label: "tickets served" },
  { value: "99.9%", label: "uptime last quarter" },
];

const StatsStrip = () => (
  <section className={styles.strip}>
    <div className={styles.container}>
      {STATS.map((stat, i) => (
        <motion.div
          key={stat.label}
          className={styles.stat}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
        >
          <span className={styles.value}>{stat.value}</span>
          <span className={styles.label}>{stat.label}</span>
        </motion.div>
      ))}
    </div>
  </section>
);

export default StatsStrip;
