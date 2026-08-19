import { useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "../../utils/prefersReducedMotion";
import styles from "./Hero.module.css";

const KineticHeadline = ({ text }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const words = containerRef.current.querySelectorAll(`.${styles.word}`);

    if (prefersReducedMotion()) {
      gsap.set(words, { yPercent: 0, rotate: 0 });
      return;
    }

    gsap.fromTo(
      words,
      { yPercent: 120, rotate: 3 },
      {
        yPercent: 0,
        rotate: 0,
        duration: 0.9,
        stagger: 0.06,
        ease: "power4.out",
        delay: 0.15,
      },
    );
  }, []);

  return (
    <h1 ref={containerRef} className={styles.headline}>
      {text.split(" ").map((word, i) => (
        <span key={i} className={styles.wordMask}>
          <span className={styles.word}>{word}&nbsp;</span>
        </span>
      ))}
    </h1>
  );
};

export default KineticHeadline;
