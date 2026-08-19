import { motion } from "framer-motion";
import styles from "./FeaturesGrid.module.css";

const FEATURES = [
  {
    title: "Real-time, everywhere",
    body: "Every call, skip, and no-show pushes instantly to the branch board and the customer's phone. No refreshing, no polling.",
  },
  {
    title: "Priority handled fairly",
    body: "Elderly, disabled, and VIP customers are served ahead of the regular line automatically, without a staff member having to make a judgment call under pressure.",
  },
  {
    title: "No-shows clear themselves",
    body: "A called ticket that never shows up expires back into the system on its own. The line keeps moving.",
  },
  {
    title: "Branch-level control",
    body: "Managers run their own branch, staff, counters, and reporting, without needing admin looped into every decision.",
  },
  {
    title: "Numbers, not guesses",
    body: "Live dashboards and end-of-day reports show wait times, busiest services, and staff performance per branch.",
  },
  {
    title: "Built for the whole network",
    body: "One admin view across every branch, every queue, every counter, from a single login.",
  },
];

const FeaturesGrid = () => (
  <section className={styles.section} id="product">
    <div className={styles.container}>
      <p className={styles.eyebrow}>№ 003 — What's inside</p>
      <h2 className={styles.heading}>
        Everything a branch actually needs, nothing it doesn't.
      </h2>
      <div className={styles.grid}>
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.title}
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
          >
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesGrid;
