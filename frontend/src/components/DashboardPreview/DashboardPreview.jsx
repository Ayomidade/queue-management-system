import { motion } from "framer-motion";
import CountUp from "./CountUp";
import styles from "./DashboardPreview.module.css";

const STAT_TILES = [
  { label: "Waiting", value: 12 },
  { label: "Called", value: 3 },
  { label: "Completed today", value: 86 },
];

const QUEUE_LENGTHS = [
  { service: "Account Opening", waiting: 5 },
  { service: "Loan Services", waiting: 4 },
  { service: "Cash & Teller", waiting: 3 },
];

const STAFF_PERFORMANCE = [
  { name: "Amaka O.", tickets: 24 },
  { name: "Tunde B.", tickets: 19 },
  { name: "Ifeoma K.", tickets: 17 },
];

const maxTickets = Math.max(...STAFF_PERFORMANCE.map((s) => s.tickets));

const DashboardPreview = () => (
  <section className={styles.section} id="dashboard">
    <div className={styles.container}>
      <p className={styles.eyebrow}>№ 004 — See it running</p>
      <h2 className={styles.heading}>Every branch, one glance.</h2>
      <p className={styles.subhead}>
        A live read on wait times, queue lengths, and staff performance, the
        same view a manager gets the moment they log in. Sample data shown.
      </p>

      <motion.div
        className={styles.panel}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.panelHeader}>
          <span className={styles.liveDot} />
          <span>IKEJA BRANCH · LIVE</span>
        </div>

        <div className={styles.tiles}>
          {STAT_TILES.map((tile) => (
            <div key={tile.label} className={styles.tile}>
              <span className={styles.tileValue}>
                <CountUp value={tile.value} />
              </span>
              <span className={styles.tileLabel}>{tile.label}</span>
            </div>
          ))}
          <div className={styles.tile}>
            <span className={styles.tileValue}>
              <CountUp value={4.2} decimals={1} suffix=" min" />
            </span>
            <span className={styles.tileLabel}>Average wait</span>
          </div>
        </div>

        <div className={styles.columns}>
          <div>
            <h4>Queue lengths</h4>
            {QUEUE_LENGTHS.map((q) => (
              <div key={q.service} className={styles.row}>
                <span>{q.service}</span>
                <span className={styles.rowValue}>{q.waiting} waiting</span>
              </div>
            ))}
          </div>

          <div>
            <h4>Staff performance today</h4>
            {STAFF_PERFORMANCE.map((s) => (
              <div key={s.name} className={styles.barRow}>
                <span className={styles.barLabel}>{s.name}</span>
                <div className={styles.barTrack}>
                  <motion.div
                    className={styles.barFill}
                    initial={{ width: 0 }}
                    whileInView={{
                      width: `${(s.tickets / maxTickets) * 100}%`,
                    }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <span className={styles.barValue}>{s.tickets}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default DashboardPreview;
