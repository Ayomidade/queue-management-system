import { useAuth } from "../../features/auth/AuthContext";
import { useMyTicket } from "../../features/tickets/useMyTicket";
import CreateTicketFlow from "./CreateTicketFlow";
import ActiveTicketView from "./ActiveTicketView";
import styles from "./CustomerHome.module.css";

const CustomerHome = () => {
  const { auth, logout } = useAuth();
  const { ticket, loading, error, cancelTicket, refetch } = useMyTicket();

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>№ 009 — Your account</p>
            <h1 className={styles.heading}>
              Welcome back, {auth.name.split(" ")[0]}.
            </h1>
          </div>
          <button className={styles.logoutBtn} onClick={logout}>
            Sign out
          </button>
        </div>

        {loading && (
          <p className={styles.status}>Checking for an active ticket…</p>
        )}
        {error && <p className={styles.statusError}>{error}</p>}

        {!loading &&
          !error &&
          (ticket ? (
            <ActiveTicketView ticket={ticket} onCancel={cancelTicket} />
          ) : (
            <CreateTicketFlow onCreated={refetch} />
          ))}
      </div>
    </section>
  );
};

export default CustomerHome;
