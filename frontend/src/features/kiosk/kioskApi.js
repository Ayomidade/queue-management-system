import { apiClient } from "../../lib/apiClient";

export const createKioskTicket = ({ queueId, branchId, guestName, guestPhone }) =>
  apiClient.post("/kiosk/tickets", { queueId, branchId, guestName, guestPhone });

export const getKioskTicket = (kioskId, token) =>
  apiClient.get(`/kiosk/tickets/${kioskId}`, {
    headers: token ? { "X-Ticket-Token": token } : {},
  });

export const cancelKioskTicket = (kioskId, token) =>
  apiClient.patch(`/kiosk/tickets/${kioskId}/cancel`, {}, {
    headers: token ? { "X-Ticket-Token": token } : {},
  });
