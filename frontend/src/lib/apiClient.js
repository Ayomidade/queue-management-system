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

const request = async (
  path,
  { method = "GET", body, token, headers = {} } = {},
) => {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
