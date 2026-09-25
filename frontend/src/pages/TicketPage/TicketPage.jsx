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
const TICKET_TOKEN_STORAGE_KEY = "cue_ticket_token";

const TicketPage = () => {
  const { ticketId: urlTicketId } = useParams();
  const { brand } = useBrand();
  const [ticket, setTicket] = useState(null);
  const [publicToken, setPublicToken] = useState(() =>
    localStorage.getItem(TICKET_TOKEN_STORAGE_KEY),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTicket = useCallback(async (id, token) => {
    setLoading(true);
    setError(null);
    try {
      const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";
      const res = await fetch(
        `${API_URL}/v1/tickets/public/${id}${tokenQuery}`,
      );
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
    const token = localStorage.getItem(TICKET_TOKEN_STORAGE_KEY);
    if (id && token) {
      fetchTicket(id, token);
    } else {
      setLoading(false);
    }
  }, [urlTicketId, fetchTicket]);

  const handleCreated = (newTicket) => {
    setTicket(newTicket);
    const storeId = newTicket.ticketId;
    localStorage.setItem(TICKET_STORAGE_KEY, storeId);
    if (newTicket.publicToken) {
      localStorage.setItem(TICKET_TOKEN_STORAGE_KEY, newTicket.publicToken);
      setPublicToken(newTicket.publicToken);
    }
  };

  const handleCancel = async () => {
    if (!ticket) return;
    try {
      // Public v1 cancel — same guest flow as create/status.
      await fetch(`${API_URL}/v1/tickets/${ticket._id}/cancel`, {
        method: "PATCH",
        headers: publicToken ? { "X-Ticket-Token": publicToken } : {},
      });
      localStorage.removeItem(TICKET_STORAGE_KEY);
      localStorage.removeItem(TICKET_TOKEN_STORAGE_KEY);
      setPublicToken(null);
      setTicket(null);
    } catch {
      // Silently fail — ticket may already be cancelled
    }
  };

  const handleNewTicket = () => {
    localStorage.removeItem(TICKET_STORAGE_KEY);
    localStorage.removeItem(TICKET_TOKEN_STORAGE_KEY);
    setPublicToken(null);
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
            publicToken={publicToken}
            onCancel={handleCancel}
            onNewTicket={handleNewTicket}
          />
        )}
      </div>
    </section>
  );
};

export default TicketPage;
