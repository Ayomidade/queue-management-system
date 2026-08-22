import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { apiClient } from "../../lib/apiClient";
import logoUrl from "../../assets/logo.svg";
import styles from "./Boards.module.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

const REFRESH_EVENTS = [
  "queue:updated",
  "ticket:called",
  "ticket:completed",
  "ticket:cancelled",
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      delay: i * 0.08,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const Boards = () => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const refetchTimer = useRef(null);

  const locations = [
    ...new Set(boards.map((b) => b.branch.location).filter(Boolean)),
  ].sort();

  const filteredBoards = locationFilter
    ? boards.filter((b) => b.branch.location === locationFilter)
    : boards;

  const fetchBoards = useCallback(async () => {
    try {
      const res = await apiClient.get("/board");
      setBoards(res.data);
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load branches.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.on("connect", () => {
      setConnected(true);
      // Join all branch rooms so we get updates
      boards.forEach((b) => socket.emit("branch:join", b.branch.id));
    });
    socket.on("disconnect", () => setConnected(false));

    const scheduleRefetch = () => {
      clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(fetchBoards, 500);
    };
    REFRESH_EVENTS.forEach((event) => socket.on(event, scheduleRefetch));

    return () => {
      clearTimeout(refetchTimer.current);
      socket.disconnect();
    };
  }, [fetchBoards]);

  // Re-join rooms when boards change
  useEffect(() => {
    if (!boards.length) return;
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.on("connect", () => {
      boards.forEach((b) => socket.emit("branch:join", b.branch.id));
    });
    return () => socket.disconnect();
  }, [boards]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.state}>Loading branches…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.state}>{error}</div>
        </div>
      </div>
    );
  }

  const totalWaiting = boards.reduce((sum, b) => sum + b.totalWaiting, 0);
  const totalCalled = boards.reduce((sum, b) => sum + b.called, 0);
  const totalCounters = boards.reduce((sum, b) => sum + b.counters.open, 0);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className={styles.logoHeader}
            custom={0}
            variants={fadeUp}
          >
            <img src={logoUrl} alt="" />
            <span>Cue</span>
          </motion.div>
          <motion.p className={styles.eyebrow} custom={1} variants={fadeUp}>
            <span className={styles.liveDot} />
            Live network
          </motion.p>
          <motion.h1 className={styles.heading} custom={2} variants={fadeUp}>
            All branches
          </motion.h1>
          <motion.p className={styles.subhead} custom={3} variants={fadeUp}>
            Real-time queue status across every branch. Pick one to watch its
            live board.
          </motion.p>

          {locations.length > 0 && (
            <motion.div
              className={styles.filterBar}
              custom={4}
              variants={fadeUp}
            >
              <label className={styles.filterLabel}>
                <span>Filter by location</span>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="">All locations</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </label>
              {locationFilter && (
                <button
                  className={styles.clearFilter}
                  onClick={() => setLocationFilter("")}
                >
                  Clear
                </button>
              )}
            </motion.div>
          )}

          <motion.div
            className={styles.branchStats}
            custom={5}
            variants={fadeUp}
            style={{ marginTop: "1rem", maxWidth: "400px" }}
          >
            <div className={styles.stat}>
              <span className={styles.statValue}>{boards.length}</span>
              <span className={styles.statLabel}>Branches</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{totalWaiting}</span>
              <span className={styles.statLabel}>Waiting</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{totalCounters}</span>
              <span className={styles.statLabel}>Counters open</span>
            </div>
          </motion.div>
        </motion.div>

        {filteredBoards.length === 0 ? (
          <p className={styles.empty}>
            {locationFilter
              ? `No branches in "${locationFilter}" right now.`
              : "No branches are active right now."}
          </p>
        ) : (
          <div className={styles.branchGrid}>
            <AnimatePresence>
              {filteredBoards.map((board, i) => (
                <motion.div
                  key={board.branch.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: 0.1 + i * 0.06,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <div className={styles.branchCard}>
                    <div className={styles.branchCardHeader}>
                      <div>
                        <div className={styles.branchName}>
                          {board.branch.name}
                        </div>
                        {board.branch.location && (
                          <div className={styles.branchLocation}>
                            📍 {board.branch.location}
                          </div>
                        )}
                      </div>
                      {board.called > 0 && (
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.7rem",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "100px",
                            background: "var(--verdigris)",
                            color: "var(--ink)",
                            fontWeight: 700,
                          }}
                        >
                          {board.called} serving
                        </span>
                      )}
                    </div>

                    <div className={styles.branchStats}>
                      <div className={styles.stat}>
                        <span className={styles.statValue}>
                          {board.totalWaiting}
                        </span>
                        <span className={styles.statLabel}>Waiting</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statValue}>
                          {board.counters.open}/{board.counters.total}
                        </span>
                        <span className={styles.statLabel}>Counters</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statValue}>
                          {board.queues.length}
                        </span>
                        <span className={styles.statLabel}>Services</span>
                      </div>
                    </div>

                    {board.queues.length > 0 && (
                      <div className={styles.queueList}>
                        {board.queues.map((q) => (
                          <div key={q.serviceName} className={styles.queueRow}>
                            <span className={styles.queueName}>
                              {q.serviceName}
                            </span>
                            <span className={styles.queueWaiting}>
                              {q.waiting === 0
                                ? "Clear"
                                : `${q.waiting} waiting`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Link
                      to={`/board/${board.branch.id}`}
                      className={styles.boardLink}
                    >
                      View live board →
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Boards;
