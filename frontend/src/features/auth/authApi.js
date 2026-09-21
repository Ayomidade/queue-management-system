/**
 * Auth API — minimal for the demo frontend.
 *
 * The demo uses API key auth via VITE_DEMO_API_KEY.
 * Login/register endpoints are kept in the backend for bank integrations
 * but are not used by the demo frontend.
 */

import { apiClient } from "../../lib/apiClient";

export const changePassword = (data, apiKey) =>
  apiClient.patch("/users/change-password", data, { apiKey });
