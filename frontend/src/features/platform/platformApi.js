import { apiClient } from "../../lib/apiClient";

/**
 * Platform API — superadmin JWT console (/api/platform/*).
 *
 * All calls pass `token` (JWT from loginPlatform). The request helper
 * attaches Authorization: Bearer. Superadmin never uses an API key.
 */

/** POST /platform/login — obtain JWT (open, rate-limited server-side) */
export const platformLogin = (credentials) =>
  apiClient.post("/platform/login", credentials);

/** GET /platform/me — current superadmin profile */
export const fetchPlatformMe = (token) =>
  apiClient.get("/platform/me", { token });

/** GET /platform/overview — key counts, pending requests, request totals */
export const fetchPlatformOverview = (token) =>
  apiClient.get("/platform/overview", { token });

/** GET /platform/usage?days=7 — daily buckets + per-key breakdown */
export const fetchPlatformUsage = (token, days = 7) =>
  apiClient.get(`/platform/usage?days=${days}`, { token });

/** GET /platform/api-keys — list all keys (metadata only) */
export const fetchPlatformApiKeys = (token, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiClient.get(`/platform/api-keys${qs ? `?${qs}` : ""}`, { token });
};

/** POST /platform/api-keys — create key (raw key returned once) */
export const createPlatformApiKey = (data, token) =>
  apiClient.post("/platform/api-keys", data, { token });

/** DELETE /platform/api-keys/:id — revoke */
export const revokePlatformApiKey = (id, token) =>
  apiClient.delete(`/platform/api-keys/${id}`, { token });

/** PATCH /platform/api-keys/:id/toggle — suspend/enable */
export const togglePlatformApiKey = (id, token) =>
  apiClient.patch(`/platform/api-keys/${id}/toggle`, {}, { token });

/** POST /platform/api-keys/:id/rotate — rotate (raw key returned once) */
export const rotatePlatformApiKey = (id, token) =>
  apiClient.post(`/platform/api-keys/${id}/rotate`, {}, { token });

/** GET /platform/key-requests — list bank admin requests */
export const fetchPlatformKeyRequests = (token, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiClient.get(
    `/platform/key-requests${qs ? `?${qs}` : ""}`,
    { token },
  );
};

/**
 * PATCH /platform/key-requests/:id — approve or reject.
 * approve returns { key: rawKey } ONCE to superadmin.
 */
export const reviewPlatformKeyRequest = (id, body, token) =>
  apiClient.patch(`/platform/key-requests/${id}`, body, { token });
