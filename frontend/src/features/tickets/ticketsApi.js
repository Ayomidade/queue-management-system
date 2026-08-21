import { apiClient } from "../../lib/apiClient";

export const fetchQueues = (token) => apiClient.get("/queues", { token });
export const createTicket = (data, token) =>
  apiClient.post("/tickets", data, { token });
