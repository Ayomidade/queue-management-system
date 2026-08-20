import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SplitFlapBoard from "../../components/Hero/SplitFlapBoard";
import TiltCard from "./TiltCard";
import MagneticButton from "./MagneticButton";
import VoidTicketSVG from "./VoidTicketSVG";
import VoidBackground from "./VoidBackground";
import styles from "./NotFound.module.css";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const randomChar = () => CHARS[Math.floor(Math.random() * CHARS.length)];

const staggerChildren = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.3,
    },
  },
};

const clipUp = {
  hidden: { opacity: 0, y: 40, clipPath: "inset(100% 0 0 0)" },
  visible: {
    opacity: 1,
    y: 0,
    clipPath: "inset(0% 0 0 0)",
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

const scaleFade = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const NotFound = () => {
  const navigate = useNavigate();
  const glitchSequence = useMemo(
    () => [
      ...Array.from({ length: 6 }, () =>
        Array.from({ length: 3 }, randomChar).join(""),
      ),
      "404",
    ],
    [],
  );

  return (
    <section className={styles.page}>
      {/* Animated particle background */}
      <VoidBackground />

      {/* Film grain overlay */}
      <div className={styles.grain} />

      {/* Radial vignette */}
      <div className={styles.vignette} />

      <motion.div
        className={styles.container}
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
      >
        {/* Floating glitch characters in background */}
        <div className={styles.glitchChars} aria-hidden="true">
          {/* {["E", "R", "R", "O", "R"].map((char, i) => (
            <motion.span
              key={i}
              className={styles.floatingChar}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.06, 0.03, 0.08, 0],
                y: [0, -20, -40],
                x: [0, (i % 2 === 0 ? 1 : -1) * 8, 0],
              }}
              transition={{
                duration: 4 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.7,
                ease: "easeOut",
              }}
              style={{
                left: `${15 + i * 15}%`,
                top: `${30 + (i % 3) * 10}%`,
              }}
            >
              {char}
            </motion.span>
          ))} */}
        </div>

        <motion.p className={styles.eyebrow} variants={clipUp}>
          № VOID — Wrong window
        </motion.p>

        <motion.div className={styles.board} variants={scaleFade}>
          <SplitFlapBoard
            values={glitchSequence}
            width={3}
            interval={220}
            loop={false}
          />
        </motion.div>

        {/* Chromatic aberration 404 */}
        <motion.div className={styles.chromaticWrap} variants={clipUp}>
          <div className={styles.chromatic} aria-hidden="true">
            <span className={`${styles.chromaticLayer} ${styles.cyLayer}`}>
              404
            </span>
            <span className={`${styles.chromaticLayer} ${styles.mgLayer}`}>
              404
            </span>
            <span className={`${styles.chromaticLayer} ${styles.mainLayer}`}>
              404
            </span>
          </div>
        </motion.div>

        <motion.div className={styles.ticketWrap} variants={scaleFade}>
          <TiltCard>
            <VoidTicketSVG />
          </TiltCard>
        </motion.div>

        <motion.h1 className={styles.heading} variants={clipUp}>
          There's no ticket at this counter.
        </motion.h1>

        <motion.p className={styles.subhead} variants={clipUp}>
          Whatever page you were holding a number for, it's not this one. Might
          be worth double-checking the link, or heading back to the counter.
        </motion.p>

        <motion.div className={styles.btnWrap} variants={clipUp}>
          <MagneticButton
            className={styles.homeBtn}
            onClick={() => navigate("/")}
          >
            <span className={styles.btnText}>Take me back</span>
            <span className={styles.btnArrow} aria-hidden="true">
              →
            </span>
          </MagneticButton>
        </motion.div>

        {/* Decorative bottom line */}
        <motion.div
          className={styles.bottomLine}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </motion.div>
    </section>
  );
};

export default NotFound;
