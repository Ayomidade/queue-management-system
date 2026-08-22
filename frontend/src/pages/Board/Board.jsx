import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { useBranchBoard } from "../../features/board/useBranchBoard";
import NowServingCard from "./NowServingCard";
import logoUrl from "../../assets/logo.svg";
import styles from "./Board.module.css";

const useClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
};

/* ── Continuous GSAP Animations ──────────────────── */
const useBoardAnimations = (board, dayStatus) => {
  const pageRef = useRef(null);
  const scanRef = useRef(null);
  const bannerRef = useRef(null);
  const cardsRef = useRef([]);
  const recentRef = useRef(null);
  const dayIndicatorRef = useRef(null);

  // Scan line — continuous horizontal sweep
  useEffect(() => {
    if (!scanRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        scanRef.current,
        { x: "-100%", opacity: 0 },
        {
          x: "200%",
          opacity: [0, 0.6, 0.6, 0],
          duration: 4,
          repeat: -1,
          ease: "none",
          delay: 1,
        },
      );
    });
    return () => ctx.revert();
  }, []);

  // Banner breathing glow
  useEffect(() => {
    if (!bannerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(bannerRef.current, {
        boxShadow: "0 0 40px 4px rgba(201, 162, 39, 0.12)",
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });
    return () => ctx.revert();
  }, []);

  // Cards floating — subtle continuous y movement
  useEffect(() => {
    const cards = cardsRef.current.filter(Boolean);
    if (!cards.length) return;
    const ctx = gsap.context(() => {
      cards.forEach((card, i) => {
        gsap.to(card, {
          y: -4,
          duration: 2.5 + i * 0.3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.2,
        });
      });
    });
    return () => ctx.revert();
  }, [board?.nowServing?.length]);

  // Recently served — subtle horizontal drift
  useEffect(() => {
    if (!recentRef.current) return;
    const items = recentRef.current.querySelectorAll(
      `.${styles.recentItem}`,
    );
    if (!items.length) return;
    const ctx = gsap.context(() => {
      items.forEach((item, i) => {
        gsap.to(item, {
          x: 2,
          duration: 3 + i * 0.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.15,
        });
      });
    });
    return () => ctx.revert();
  }, [board?.recentlyServed?.length]);

  // Day indicator pulse
  useEffect(() => {
    if (!dayIndicatorRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(dayIndicatorRef.current, {
        scale: 1.05,
        opacity: 0.85,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });
    return () => ctx.revert();
  }, [dayStatus]);

  return {
    pageRef,
    scanRef,
    bannerRef,
    cardsRef,
    recentRef,
    dayIndicatorRef,
  };
};

const Board = () => {
  const { branchId } = useParams();
  const { board, error, connected, dayStatus } = useBranchBoard(branchId);
  const now = useClock();

  const {
    pageRef,
    scanRef,
    bannerRef,
    cardsRef,
    recentRef,
    dayIndicatorRef,
  } = useBoardAnimations(board, dayStatus);

  if (!branchId) {
    return (
      <div className={styles.state}>
        <p>
          This board needs a branch. Visit{" "}
          <code>/board/&lt;branchId&gt;</code> for a specific branch.
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

  const totalWaiting =
    board.totalWaiting ??
    board.queueLengths.reduce((sum, q) => sum + q.waiting, 0);

  const isDayClosed = dayStatus === "closed";

  return (
    <div className={styles.page} ref={pageRef}>
      {/* ── Scan Line ──────────────────────────── */}
      <div className={styles.scanTrack}>
        <div className={styles.scanLine} ref={scanRef} />
      </div>

      {/* ── Day Status Indicator ────────────────── */}
      <motion.div
        ref={dayIndicatorRef}
        className={`${styles.dayIndicator} ${isDayClosed ? styles.dayClosed : styles.dayOpen}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <span className={styles.dayDot} />
        <span className={styles.dayText}>
          {isDayClosed ? "BRANCH CLOSED" : "BRANCH OPEN"}
        </span>
        {isDayClosed && board.lastClosedAt && (
          <span className={styles.dayTime}>
            Closed{" "}
            {new Date(board.lastClosedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </motion.div>

      <header className={styles.header}>
        <div>
          <motion.div
            className={styles.brandRow}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <img src={logoUrl} alt="" className={styles.brandLogo} />
            <span className={styles.brandName}>Cue</span>
            <Link to="/boards" className={styles.backLink}>
              ← All branches
            </Link>
          </motion.div>
          <motion.p
            className={styles.eyebrow}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            NOW SERVING
          </motion.p>
          <motion.h1
            className={styles.branchName}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {board.branch.name}
          </motion.h1>
        </div>
        <motion.div
          className={styles.headerRight}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
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
        </motion.div>
      </header>

      {/* ── Total Waiting Banner ──────────────────── */}
      <div className={styles.waitingBanner} ref={bannerRef}>
        <div className={styles.waitingBannerInner}>
          <div className={styles.waitingBig}>
            <motion.span
              className={styles.waitingBigNum}
              key={totalWaiting}
              initial={{ opacity: 0, y: -12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {totalWaiting}
            </motion.span>
            <span className={styles.waitingBigLabel}>people waiting</span>
          </div>
          <div className={styles.waitingBreakdown}>
            {board.queueLengths.map((q, i) => (
              <motion.div
                key={q.serviceName}
                className={styles.waitingBreakdownItem}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
              >
                <span className={styles.breakdownName}>{q.serviceName}</span>
                <span className={styles.breakdownCount}>{q.waiting}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Now Serving Cards ────────────────────── */}
      <div className={styles.grid}>
        <AnimatePresence mode="popLayout">
          {board.nowServing.length === 0 ? (
            <motion.p
              key="empty"
              className={styles.empty}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              No one currently being served, the next call appears here
              instantly.
            </motion.p>
          ) : (
            board.nowServing.map((ticket, i) => (
              <motion.div
                key={ticket.counterLabel || ticket.ticketNumber}
                layout
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -24 }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                ref={(el) => {
                  cardsRef.current[i] = el;
                }}
              >
                <NowServingCard {...ticket} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* ── Recently Served ──────────────────────── */}
      <div className={styles.footer}>
        <div className={styles.recent} ref={recentRef}>
          <span className={styles.recentLabel}>RECENTLY SERVED</span>
          <AnimatePresence>
            {board.recentlyServed.map((t, i) => (
              <motion.span
                key={`${t.ticketNumber}-${t.updatedAt || i}`}
                className={`${styles.recentItem} ${i === 0 ? styles.recentItemLatest : ""}`}
                initial={{ opacity: 0, x: -14, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 14, scale: 0.9 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
              >
                #{String(t.ticketNumber).padStart(4, "0")}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Board;
