import { apiClient } from "../../lib/apiClient";

/**
 * Bank admin API key request API — JWT `/api/admin/api-key-requests` (WP6).
 *
 * bankName is always taken from Admin.bank server-side (never from body).
 * One-time reveal: GET /:id returns { key } on the first call after
 * approval, then key is null forever after.
 */

/** POST — submit a pending request for this admin's bank */
export const requestApiKey = (data, token) =>
  apiClient.post("/admin/api-key-requests", data, { token });

/** GET — list this bank's requests (status view) */
export const fetchApiKeyRequests = (token) =>
  apiClient.get("/admin/api-key-requests", { token });

/**
 * GET /:id — one-time raw-key reveal for an approved request.
 * Returns { ...meta, key: "cue_..." } first time; key: null afterwards.
 */
export const revealApiKeyRequest = (id, token) =>
  apiClient.get(`/admin/api-key-requests/${id}`, { token });
