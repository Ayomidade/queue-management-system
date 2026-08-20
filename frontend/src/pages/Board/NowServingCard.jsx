import FlapUnit from "../../components/Hero/FlapUnit";
import styles from "./Board.module.css";

const NowServingCard = ({
  ticketNumber,
  serviceName,
  counterLabel,
  priority,
}) => {
  const chars = ticketNumber.padEnd(5, " ").slice(0, 5).toUpperCase().split("");

  return (
    <div
      className={`${styles.card} ${priority === "priority" ? styles.cardPriority : ""}`}
    >
      <span className={styles.counterLabel}>
        {counterLabel ? `COUNTER ${counterLabel}` : "COUNTER —"}
      </span>
      <div className={styles.flapRow}>
        {chars.map((char, i) => (
          <FlapUnit key={i} char={char} />
        ))}
      </div>
      <span className={styles.serviceName}>{serviceName}</span>
      {priority === "priority" && (
        <span className={styles.priorityTag}>PRIORITY</span>
      )}
    </div>
  );
};

export default NowServingCard;
