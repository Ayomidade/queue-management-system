import { useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "../../utils/prefersReducedMotion";
import styles from "./Marquee.module.css";

const ITEMS = [
  "A 042 CALLED",
  "NO WAIT AT IKEJA BRANCH",
  "B 017 SERVED",
  "C 005 WAITING",
  "AVG WAIT 4.2 MIN",
  "COUNTER 3 OPEN",
];

const Marquee = () => {
  const trackRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const track = trackRef.current;
    const distance = track.scrollWidth / 2;
    const tween = gsap.to(track, {
      x: -distance,
      duration: 24,
      ease: "none",
      repeat: -1,
    });

    return () => tween.kill();
  }, []);

  const content = [...ITEMS, ...ITEMS];

  return (
    <div className={styles.marquee}>
      <div className={styles.track} ref={trackRef}>
        {content.map((item, i) => (
          <span key={i} className={styles.item}>
            {item}
            <span className={styles.dot}>●</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
