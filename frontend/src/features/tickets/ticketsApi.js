import { apiClient, v1Api } from "../../lib/apiClient";

export const fetchQueues = (apiKey) => v1Api.get("/queues", { apiKey });
export const createTicket = (data, apiKey) =>
  apiClient.post("/tickets", data, { apiKey });
