import { motion } from "framer-motion";
import styles from "./CTASection.module.css";

const CTASection = () => (
  <section className={styles.section}>
    <div className={styles.container}>
      <motion.p
        className={styles.eyebrow}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        № 004 — Your turn
      </motion.p>
      <motion.h2
        className={styles.heading}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
      >
        Ready to take your branch off the waiting room?
      </motion.h2>
      <motion.div
        className={styles.actions}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
      >
        <button className={styles.primaryBtn}>Request a demo</button>
        <button className={styles.ghostBtn}>Talk to sales</button>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
