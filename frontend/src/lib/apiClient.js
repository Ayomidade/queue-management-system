const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

let onUnauthorized = null;

export const registerUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Core request function.
 *
 * Supports both legacy JWT auth (via `token` option) and
 * v1 API key auth (via `apiKey` option).
 *
 * For legacy routes: pass `{ token: "jwt..." }`
 * For v1 routes:     pass `{ apiKey: "cue_..." }`
 *
 * If both are provided, API key takes precedence.
 */
const request = async (
  path,
  { method = "GET", body, token, apiKey, headers = {} } = {},
) => {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      // API key auth (v1 routes) takes precedence over JWT auth
      ...(apiKey
        ? { "X-API-Key": apiKey }
        : token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // no body to parse
  }

  if (!res.ok) {
    // A 401 on a request that carried a token means that token is no longer
    // good, expired, revoked, account gone. A login/register call never
    // attaches a token, so a wrong password there won't trigger this,
    // that's an invalid-credentials error, not a session expiry.
    if (res.status === 401 && token && onUnauthorized) {
      onUnauthorized();
    }
    throw new ApiError(
      payload?.message || "Something went wrong",
      res.status,
      payload?.errors || null,
    );
  }

  return payload;
};

export const apiClient = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  patch: (path, body, opts) =>
    request(path, { ...opts, method: "PATCH", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};

/**
 * V1 API client — uses API key auth instead of JWT.
 *
 * Usage:
 *   import { v1Api } from "./lib/apiClient";
 *   const boards = await v1Api.get("/board", { apiKey: "cue_..." });
 */
export const v1Api = {
  get: (path, opts) => request(`/v1${path}`, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(`/v1${path}`, { ...opts, method: "POST", body }),
  patch: (path, body, opts) => request(`/v1${path}`, { ...opts, method: "PATCH", body }),
  put: (path, body, opts) => request(`/v1${path}`, { ...opts, method: "PUT", body }),
  delete: (path, opts) => request(`/v1${path}`, { ...opts, method: "DELETE" }),
};
