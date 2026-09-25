import { apiClient } from "../../lib/apiClient";

/**
 * Auth API — JWT logins for all four kinds (Phase 13 WP6/WP7).
 *
 * - staff/manager/admin → POST /auth/login/:kind  (bank dashboard)
 * - superadmin          → POST /platform/login    (platform console)
 * - change-password     → POST /auth/change-password (any kind, Bearer)
 * - me                  → GET  /auth/me
 */

export const loginStaff = (credentials) =>
  apiClient.post("/auth/login/staff", credentials);

export const loginManager = (credentials) =>
  apiClient.post("/auth/login/manager", credentials);

export const loginAdmin = (credentials) =>
  apiClient.post("/auth/login/admin", credentials);

export const loginPlatform = (credentials) =>
  apiClient.post("/platform/login", credentials);

export const getAuthMe = (token) => apiClient.get("/auth/me", { token });

export const changePassword = (data, token) =>
  apiClient.post("/auth/change-password", data, { token });
