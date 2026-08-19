import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SplitFlapBoard from "../../components/Hero/SplitFlapBoard";
import TiltCard from "./TiltCard";
import MagneticButton from "./MagneticButton";
import VoidTicketSVG from "./VoidTicketSVG";
import styles from "./NotFound.module.css";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const randomChar = () => CHARS[Math.floor(Math.random() * CHARS.length)];

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
      <div className={styles.container}>
        <motion.p
          className={styles.eyebrow}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          № VOID — Wrong window
        </motion.p>

        <div className={styles.board}>
          <SplitFlapBoard
            values={glitchSequence}
            width={3}
            interval={220}
            loop={false}
          />
        </div>

        <motion.div
          className={styles.ticketWrap}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <TiltCard>
            <VoidTicketSVG />
          </TiltCard>
        </motion.div>

        <motion.h1
          className={styles.heading}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          There's no ticket at this counter.
        </motion.h1>
        <motion.p
          className={styles.subhead}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          Whatever page you were holding a number for, it's not this one. Might
          be worth double-checking the link, or heading back to the counter.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <MagneticButton
            className={styles.homeBtn}
            onClick={() => navigate("/")}
          >
            Take me back
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  );
};

export default NotFound;
