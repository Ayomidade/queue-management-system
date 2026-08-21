import { motion } from "framer-motion";
import styles from "./MotionBackground.module.css";

const SHAPES = [
  { x: "10%", y: "20%", size: 120, delay: 0, duration: 18 },
  { x: "80%", y: "15%", size: 80, delay: 2, duration: 22 },
  { x: "60%", y: "70%", size: 100, delay: 4, duration: 20 },
  { x: "25%", y: "80%", size: 60, delay: 1, duration: 16 },
  { x: "90%", y: "50%", size: 90, delay: 3, duration: 24 },
  { x: "45%", y: "10%", size: 70, delay: 5, duration: 19 },
];

const MotionBackground = ({ className = "" }) => (
  <div className={`${styles.bg} ${className}`} aria-hidden="true">
    {SHAPES.map((s, i) => (
      <motion.div
        key={i}
        className={styles.orb}
        style={{
          left: s.x,
          top: s.y,
          width: s.size,
          height: s.size,
        }}
        animate={{
          y: [0, -30, 0, 20, 0],
          x: [0, 15, -10, 5, 0],
          scale: [1, 1.1, 0.95, 1.05, 1],
          opacity: [0.15, 0.25, 0.12, 0.2, 0.15],
        }}
        transition={{
          duration: s.duration,
          delay: s.delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    ))}

    <motion.div
      className={styles.grid}
      animate={{ opacity: [0.03, 0.06, 0.03] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

export default MotionBackground;
