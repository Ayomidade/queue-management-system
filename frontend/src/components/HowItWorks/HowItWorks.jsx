import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "../../utils/prefersReducedMotion";
import styles from "./HowItWorks.module.css";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    ticket: "A 01",
    title: "Pull a ticket",
    body: "Scan a branch code or open the app. Pick the service you need, get a ticket number instantly.",
  },
  {
    ticket: "A 02",
    title: "Watch your position",
    body: "See exactly how many people are ahead of you and a live estimate of when you'll be called.",
  },
  {
    ticket: "A 03",
    title: "Walk in on time",
    body: "Get notified when you're close. No waiting room, no wasted afternoon.",
  },
  {
    ticket: "A 04",
    title: "Get called, get served",
    body: "Staff call your number, your ticket updates everywhere at once, board, phone, counter display.",
  },
];

const HowItWorks = () => {
  const sectionRef = useRef(null);
  const railRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      gsap.set(railRef.current, { scaleY: 1 });
      return;
    }

    const tween = gsap.fromTo(
      railRef.current,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          end: "bottom 65%",
          scrub: 0.6,
        },
      },
    );
    return () => tween.scrollTrigger?.kill();
  }, []);

  return (
    <section className={styles.section} id="how-it-works" ref={sectionRef}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>№ 002 — How it works</p>
        <h2 className={styles.heading}>Four tickets, start to finish.</h2>

        <div className={styles.body}>
          <div className={styles.railTrack}>
            <div className={styles.rail} ref={railRef} />
          </div>

          <div className={styles.grid}>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.ticket}
                className={styles.card}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <span className={styles.ticketNumber}>{step.ticket}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
