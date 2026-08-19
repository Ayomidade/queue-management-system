const VoidTicketSVG = () => (
  <svg
    viewBox="0 0 320 180"
    width="100%"
    height="100%"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="4"
      y="4"
      width="312"
      height="172"
      rx="14"
      fill="var(--ink-raised)"
      stroke="var(--ink-line)"
      strokeWidth="2"
    />
    <circle cx="4" cy="90" r="10" fill="var(--ink)" />
    <circle cx="316" cy="90" r="10" fill="var(--ink)" />
    <line
      x1="220"
      y1="14"
      x2="220"
      y2="166"
      stroke="var(--ink-line)"
      strokeWidth="2"
      strokeDasharray="6 6"
    />
    <text
      x="30"
      y="70"
      fontFamily="var(--font-mono)"
      fontSize="42"
      fill="var(--paper)"
      fontWeight="700"
    >
      404
    </text>
    <text
      x="30"
      y="108"
      fontFamily="var(--font-mono)"
      fontSize="12"
      fill="var(--ink-soft)"
      letterSpacing="2"
    >
      TICKET NOT FOUND
    </text>
    <text
      x="250"
      y="95"
      fontFamily="var(--font-mono)"
      fontSize="12"
      fill="var(--ink-soft)"
      transform="rotate(90 250 95)"
    >
      ADMIT NONE
    </text>
    <g transform="translate(160,90) rotate(-18)">
      <rect
        x="-70"
        y="-20"
        width="140"
        height="40"
        rx="6"
        fill="none"
        stroke="var(--signal)"
        strokeWidth="3"
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
    </g>
  </svg>
);

export default VoidTicketSVG;
