import { apiClient } from "../../lib/apiClient";

export const createKioskTicket = ({ queueId, branchId, guestName, guestPhone }) =>
  apiClient.post("/kiosk/tickets", { queueId, branchId, guestName, guestPhone });

export const getKioskTicket = (kioskId) =>
  apiClient.get(`/kiosk/tickets/${kioskId}`);

export const cancelKioskTicket = (kioskId) =>
  apiClient.patch(`/kiosk/tickets/${kioskId}/cancel`);
