import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import { useMyTicket } from "../../features/tickets/useMyTicket";
import CreateTicketFlow from "./CreateTicketFlow";
import ActiveTicketView from "./ActiveTicketView";
import MotionBackground from "../../components/MotionBackground/MotionBackground";
import logoUrl from "../../assets/logo.svg";
import styles from "./CustomerHome.module.css";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

const CustomerHome = () => {
  const { auth, logout } = useAuth();
  const { ticket, loading, error, cancelTicket, refetch } = useMyTicket();

  return (
    <section className={styles.page}>
      <MotionBackground />
      <div className={styles.container}>
        <div className={styles.logoHeader}>
          <img src={logoUrl} alt="" />
          <span>Cue</span>
        </div>
        <motion.div
          className={styles.headerRow}
          initial="hidden"
          animate="visible"
        >
          <div>
            <motion.p className={styles.eyebrow} custom={0} variants={fadeUp}>
              № 009 — Your account
            </motion.p>
            <motion.h1 className={styles.heading} custom={1} variants={fadeUp}>
              Welcome back, {auth.name.split(" ")[0]}.
            </motion.h1>
          </div>
          <motion.div
            className={styles.headerActions}
            custom={2}
            variants={fadeUp}
          >
            <Link to="/settings" className={styles.settingsLink}>
              Settings
            </Link>
            <button className={styles.logoutBtn} onClick={logout}>
              Sign out
            </button>
          </motion.div>
        </motion.div>

        {loading && (
          <motion.p
            className={styles.status}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Checking for an active ticket…
          </motion.p>
        )}
        {error && (
          <motion.p
            className={styles.statusError}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.p>
        )}

        {!loading &&
          !error &&
          (ticket ? (
            <ActiveTicketView ticket={ticket} onCancel={cancelTicket} />
          ) : (
            <CreateTicketFlow onCreated={refetch} />
          ))}

        {ticket?.branch && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link
              to={`/board/${ticket.branch._id || ticket.branch}`}
              className={styles.boardLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Live Queue →
            </Link>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {/* <ChangePassword /> */}
        </motion.div>
      </div>
    </section>
  );
};

export default CustomerHome;
