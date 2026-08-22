import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SplitFlapBoard from "../../components/Hero/SplitFlapBoard";
import MotionBackground from "../../components/MotionBackground/MotionBackground";
import logoUrl from "../../assets/logo.svg";
import styles from "./Contact.module.css";

const NEXT_STEPS = [
  { ticket: "R 01", text: "We review your branch details" },
  { ticket: "R 02", text: "We schedule a 20-minute walkthrough" },
  { ticket: "R 03", text: "You go live, on your timeline" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

const generateTicketNumber = () =>
  `R${Math.floor(100000 + Math.random() * 900000)}`;

const Contact = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    branches: "1-5",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder only, nothing is sent yet, wiring to the real API comes later
    setTicketNumber(generateTicketNumber());
    setSubmitted(true);
  };

  return (
    <section className={styles.page}>
      <MotionBackground />
      <div className={styles.container}>
        <div className={styles.intro}>
          <div className={styles.logoHeader}>
            <img src={logoUrl} alt="" />
            <span>Cue</span>
          </div>
          <motion.p
            className={styles.eyebrow}
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            № 006 — Get in touch
          </motion.p>
          <motion.h1
            className={styles.heading}
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            Tell us about your branch, we'll take it from there.
          </motion.h1>
          <motion.p
            className={styles.subhead}
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            A few details now save a lot of back-and-forth later. Every request
            gets logged and answered within one business day.
          </motion.p>

          <motion.div
            className={styles.steps}
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            {NEXT_STEPS.map((step) => (
              <div key={step.ticket} className={styles.step}>
                <span className={styles.stepTicket}>{step.ticket}</span>
                <span>{step.text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className={styles.form}
              >
                <label className={styles.field}>
                  <span>Full name</span>
                  <input
                    required
                    value={form.name}
                    onChange={handleChange("name")}
                    placeholder="Ada Obi"
                  />
                </label>
                <label className={styles.field}>
                  <span>Work email</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={handleChange("email")}
                    placeholder="ada@yourbank.com"
                  />
                </label>
                <label className={styles.field}>
                  <span>Bank / organization</span>
                  <input
                    required
                    value={form.organization}
                    onChange={handleChange("organization")}
                    placeholder="First Ledger Bank"
                  />
                </label>
                <label className={styles.field}>
                  <span>Branches</span>
                  <select
                    value={form.branches}
                    onChange={handleChange("branches")}
                  >
                    <option value="1-5">1–5</option>
                    <option value="6-20">6–20</option>
                    <option value="21-50">21–50</option>
                    <option value="50+">50+</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>What are you hoping to solve?</span>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={handleChange("message")}
                    placeholder="Long teller lines during lunch hour, no visibility across branches, etc."
                  />
                </label>
                <button type="submit" className={styles.submitBtn}>
                  File request
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className={styles.confirmation}
              >
                <span className={styles.confirmLabel}>REQUEST LOGGED</span>
                <SplitFlapBoard
                  values={["-------", ticketNumber]}
                  width={7}
                  interval={650}
                  loop={false}
                />
                <p className={styles.confirmText}>
                  That's your request ticket. Hold onto it, we'll reference it
                  when we reach out to <strong>{form.email}</strong>.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;
