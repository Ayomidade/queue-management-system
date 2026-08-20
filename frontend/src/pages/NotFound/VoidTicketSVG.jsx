import { motion } from "framer-motion";

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { delay: 0.3 + i * 0.15, type: "spring", duration: 1.5, bounce: 0 },
      opacity: { delay: 0.3 + i * 0.15, duration: 0.2 },
    },
  }),
};

const VoidTicketSVG = () => (
  <svg
    viewBox="0 0 320 180"
    width="100%"
    height="100%"
    xmlns="http://www.w3.org/2000/svg"
    style={{ overflow: "visible" }}
  >
    {/* Animated border */}
    <motion.rect
      x="4"
      y="4"
      width="312"
      height="172"
      rx="14"
      fill="var(--ink-raised)"
      stroke="var(--ink-line)"
      strokeWidth="2"
      variants={draw}
      initial="hidden"
      animate="visible"
      custom={0}
      style={{ pathLength: 0 }}
    />

    {/* Perforations */}
    <motion.circle
      cx="4"
      cy="90"
      r="10"
      fill="var(--ink)"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 1.2, type: "spring", stiffness: 300 }}
    />
    <motion.circle
      cx="316"
      cy="90"
      r="10"
      fill="var(--ink)"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 1.3, type: "spring", stiffness: 300 }}
    />

    {/* Dashed separator */}
    <motion.line
      x1="220"
      y1="14"
      x2="220"
      y2="166"
      stroke="var(--ink-line)"
      strokeWidth="2"
      strokeDasharray="6 6"
      variants={draw}
      initial="hidden"
      animate="visible"
      custom={1}
    />

    {/* 404 text */}
    <motion.text
      x="30"
      y="70"
      fontFamily="var(--font-mono)"
      fontSize="42"
      fill="var(--paper)"
      fontWeight="700"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.8, duration: 0.6 }}
    >
      404
    </motion.text>

    {/* TICKET NOT FOUND */}
    <motion.text
      x="30"
      y="108"
      fontFamily="var(--font-mono)"
      fontSize="12"
      fill="var(--ink-soft)"
      letterSpacing="2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.0, duration: 0.4 }}
    >
      TICKET NOT FOUND
    </motion.text>

    {/* ADMIT NONE */}
    <motion.text
      x="250"
      y="95"
      fontFamily="var(--font-mono)"
      fontSize="12"
      fill="var(--ink-soft)"
      transform="rotate(90 250 95)"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.1, duration: 0.4 }}
    >
      ADMIT NONE
    </motion.text>

    {/* Animated VOID stamp */}
    <motion.g
      transform="translate(160,90) rotate(-18)"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.4, type: "spring", stiffness: 200, damping: 12 }}
    >
      <motion.rect
        x="-70"
        y="-20"
        width="140"
        height="40"
        rx="6"
        fill="none"
        stroke="var(--signal)"
        strokeWidth="3"
        animate={{
          strokeOpacity: [1, 0.4, 1],
          strokeWidth: [3, 2, 3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <text
        x="0"
        y="7"
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="20"
        fill="var(--signal)"
        fontWeight="700"
        letterSpacing="3"
      >
        VOID
      </text>
    </motion.g>

    {/* Scan line effect */}
    <motion.rect
      x="4"
      y="4"
      width="312"
      height="3"
      fill="rgba(79,163,123,0.12)"
      initial={{ y: 4 }}
      animate={{ y: [4, 173, 4] }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "linear",
        delay: 1.6,
      }}
    />

    {/* Subtle grain dots inside ticket */}
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.circle
        key={i}
        cx={20 + Math.random() * 280}
        cy={14 + Math.random() * 152}
        r={0.5 + Math.random() * 0.8}
        fill="var(--ink-line)"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{
          duration: 2 + Math.random() * 2,
          repeat: Infinity,
          delay: 1.5 + Math.random() * 2,
        }}
      />
    ))}
  </svg>
);

export default VoidTicketSVG;
