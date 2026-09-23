import { v1Api } from "../../lib/apiClient";

/**
 * Bank admin API key request API (v1, API-key auth).
 *
 * Bank admins cannot manage keys directly — they submit requests for
 * their own bank; the superadmin reviews them on /platform.
 *
 * One-time reveal: GET /api-key-requests/:id returns { key } on the
 * first call after approval, then key is null forever after.
 */

/** POST /api-key-requests — submit a pending request for this bank */
export const requestApiKey = (data, apiKey) =>
  v1Api.post("/api-key-requests", data, { apiKey });

/** GET /api-key-requests — list this bank's requests (status view) */
export const fetchApiKeyRequests = (apiKey) =>
  v1Api.get("/api-key-requests", { apiKey });

/**
 * GET /api-key-requests/:id — one-time raw-key reveal for an approved request.
 * Returns { ...meta, key: "cue_..." } first time; key: null afterwards.
 */
export const revealApiKeyRequest = (id, apiKey) =>
  v1Api.get(`/api-key-requests/${id}`, { apiKey });
