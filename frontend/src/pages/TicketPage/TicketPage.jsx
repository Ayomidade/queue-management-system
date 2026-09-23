import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useBrand } from "../../features/brand/BrandContext";
import TicketForm from "./TicketForm";
import TicketStatus from "./TicketStatus";
import logoUrl from "../../assets/logo.svg";
import styles from "./TicketPage.module.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const TICKET_STORAGE_KEY = "cue_ticket";

const TicketPage = () => {
  const { ticketId: urlTicketId } = useParams();
  const { brand } = useBrand();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTicket = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/v1/tickets/public/${id}`);
      const data = await res.json();
      if (data.status === "success") {
        setTicket(data.data);
        const storeId = data.data.kioskId || data.data._id;
        localStorage.setItem(TICKET_STORAGE_KEY, storeId);
      } else {
        setError("Ticket not found");
        localStorage.removeItem(TICKET_STORAGE_KEY);
      }
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = urlTicketId || localStorage.getItem(TICKET_STORAGE_KEY);
    if (id) {
      fetchTicket(id);
    } else {
      setLoading(false);
    }
  }, [urlTicketId, fetchTicket]);

  const handleCreated = (newTicket) => {
    setTicket(newTicket);
    const storeId =newTicket.ticketId;
    localStorage.setItem(TICKET_STORAGE_KEY, storeId);
  };

  const handleCancel = async () => {
    if (!ticket) return;
    try {
      await fetch(`${API_URL}/v1/tickets/${ticket._id}/cancel`, {
        method: "PATCH",
      });
      localStorage.removeItem(TICKET_STORAGE_KEY);
      setTicket(null);
    } catch {
      // Silently fail — ticket may already be cancelled
    }
  };

  const handleNewTicket = () => {
    localStorage.removeItem(TICKET_STORAGE_KEY);
    setTicket(null);
  };

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <motion.div
          className={styles.logoHeader}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <img src={logoUrl} alt="" />
          <span>{brand.name}</span>
        </motion.div>

        {loading && (
          <motion.p
            className={styles.status}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Loading…
          </motion.p>
        )}

        {error && !ticket && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className={styles.statusError}>{error}</p>
            <TicketForm onCreated={handleCreated} />
          </motion.div>
        )}

        {!loading && !error && !ticket && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <TicketForm onCreated={handleCreated} />
          </motion.div>
        )}

        {ticket && (
          <TicketStatus
            ticket={ticket}
            onCancel={handleCancel}
            onNewTicket={handleNewTicket}
          />
        )}
      </div>
    </section>
  );
};

export default TicketPage;
