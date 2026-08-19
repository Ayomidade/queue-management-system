import { motion } from "framer-motion";
import SplitFlapBoard from "./SplitFlapBoard";
import styles from "./Hero.module.css";

const TICKETS = ["A 042", "B 017", "A 043", "C 005", "A 044"];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] },
  }),
};

const Hero = () => (
  <section className={styles.hero}>
    <div className={styles.container}>
      <div>
        <motion.p
          className={styles.eyebrow}
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          № 001 — The Problem
        </motion.p>
        <motion.h1
          className={styles.headline}
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          Nobody should have to stand in a bank to hold their place in line.
        </motion.h1>
        <motion.p
          className={styles.subhead}
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          Pull a ticket from your phone, watch your position count down in real
          time, and walk in exactly when it's your turn. Staff get one button,
          "Call Next," and a live board that never needs a whiteboard update
          again.
        </motion.p>
        <motion.div
          className={styles.actions}
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <button className={styles.primaryBtn}>Request a demo</button>
          <button className={styles.ghostBtn}>See it in action</button>
        </motion.div>
      </div>

      <motion.div
        className={styles.boardPanel}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.boardHeader}>
          <span className={styles.liveDot} />
          <span>NOW SERVING</span>
        </div>
        <SplitFlapBoard values={TICKETS} width={5} />
        <div className={styles.boardFooter}>Ikeja Branch · Counter 3</div>
      </motion.div>
    </div>
  </section>
);

export default Hero;
