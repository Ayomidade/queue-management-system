import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./FlapUnit.module.css";

const FlapUnit = ({ char = " " }) => {
  const [display, setDisplay] = useState(char);
  const [flipping, setFlipping] = useState(false);
  const prevChar = useRef(char);

  useEffect(() => {
    if (char === prevChar.current) return;
    setFlipping(true);
    const timeout = setTimeout(() => {
      setDisplay(char);
      setFlipping(false);
      prevChar.current = char;
    }, 220);
    return () => clearTimeout(timeout);
  }, [char]);

  return (
    <div className={styles.unit}>
      <div className={styles.face}>{display}</div>
      <AnimatePresence>
        {flipping && (
          <motion.div
            className={styles.flap}
            initial={{ rotateX: 0 }}
            animate={{ rotateX: -90 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.45, 0, 0.55, 1] }}
          >
            {prevChar.current}
          </motion.div>
        )}
      </AnimatePresence>
      <div className={styles.hinge} />
    </div>
  );
};

export default FlapUnit;
