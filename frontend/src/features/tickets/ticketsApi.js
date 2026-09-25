import { apiClient } from "../../lib/apiClient";

/**
 * Ticket/queue API — JWT `/api/*` for dashboard; public routes for guests.
 * Phase 13 WP6: serve actions require a staff Bearer token (requireStaffServing).
 */

/** Queues for the signed-in identity's scope (staff → own branch) */
export const fetchQueues = (token) => apiClient.get("/queues", { token });

/** Guest ticket create — public, no auth (`/api/v1` guest flow) */
export const createTicket = (data) => apiClient.post("/v1/tickets", data);
