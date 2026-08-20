import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useBranchBoard } from "../../features/board/useBranchBoard";
import NowServingCard from "./NowServingCard";
import styles from "./Board.module.css";

const useClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
};

const Board = () => {
  const { branchId } = useParams();
  const { board, error, connected } = useBranchBoard(branchId);
  const now = useClock();

  if (!branchId) {
    return (
      <div className={styles.state}>
        <p>
          This board needs a branch. Visit <code>/board/&lt;branchId&gt;</code>{" "}
          for a specific branch.
        </p>
      </div>
    );
  }
  if (error)
    return (
      <div className={styles.state}>
        <p>{error}</p>
      </div>
    );
  if (!board)
    return (
      <div className={styles.state}>
        <p>Loading branch board…</p>
      </div>
    );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>NOW SERVING</p>
          <h1 className={styles.branchName}>{board.branch.name}</h1>
        </div>
        <div className={styles.headerRight}>
          <span
            className={`${styles.liveDot} ${connected ? "" : styles.liveDotOffline}`}
          />
          <span className={styles.clock}>
            {now.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>
      </header>

      <div className={styles.grid}>
        <AnimatePresence mode="popLayout">
          {board.nowServing.length === 0 ? (
            <motion.p
              key="empty"
              className={styles.empty}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              No one currently being served, the next call appears here
              instantly.
            </motion.p>
          ) : (
            board.nowServing.map((ticket) => (
              <motion.div
                key={ticket.counterLabel || ticket.ticketNumber}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <NowServingCard {...ticket} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className={styles.footer}>
        <div className={styles.waiting}>
          {board.queueLengths.map((q) => (
            <span key={q.serviceName} className={styles.waitingItem}>
              {q.serviceName}: <strong>{q.waiting}</strong> waiting
            </span>
          ))}
        </div>
        <div className={styles.recent}>
          <span className={styles.recentLabel}>RECENTLY SERVED</span>
          {board.recentlyServed.map((t, i) => (
            <span key={i} className={styles.recentItem}>
              {t.ticketNumber}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Board;
