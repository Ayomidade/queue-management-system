import { apiClient } from "../../lib/apiClient";

export const getAvailableSlots = ({ branchId, serviceId, date }) =>
  apiClient.get(
    `/appointments/slots?branchId=${branchId}&serviceId=${serviceId}&date=${date}`,
  );

export const createAppointment = ({ queueId, branchId, scheduledFor, guestName, guestPhone }) =>
  apiClient.post("/appointments", { queueId, branchId, scheduledFor, guestName, guestPhone });

export const getAppointmentTicket = (kioskId) =>
  apiClient.get(`/appointments/${kioskId}`);
