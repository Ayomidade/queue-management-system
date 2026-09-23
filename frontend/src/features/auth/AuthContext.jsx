import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { registerUnauthorizedHandler } from "../../lib/apiClient";
import { useNavigate } from "react-router-dom";

/**
 * AuthContext — dual-mode authentication for the demo frontend.
 *
 * Mode 1 — API key (bank personas: admin/manager/staff):
 *   Auto-initializes from VITE_DEMO_API_KEY. Identity resolved via
 *   GET /v1/auth/me (X-API-Key + optional X-Staff-Id).
 *   User switcher swaps X-Staff-Id; the same demo key is reused.
 *
 * Mode 2 — JWT (superadmin /platform console):
 *   loginPlatform({ email, password }) → POST /platform/login → stores
 *   { token, role: "superadmin", ... }. Identity refreshed via
 *   GET /platform/me with Authorization: Bearer.
 *
 * Superadmin never appears in the demo user switcher (backend filters them).
 */

const AuthContext = createContext(null);
const STORAGE_KEY = "cue_auth";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const DEMO_API_KEY = import.meta.env.VITE_DEMO_API_KEY || "";

const readStoredAuth = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(readStoredAuth);

  useEffect(() => {
    if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    else localStorage.removeItem(STORAGE_KEY);
  }, [auth]);

  const isTokenMode = !!auth?.token && !auth?.apiKey;
  const isApiKeyMode = !!auth?.apiKey;

  /**
   * Initialize demo API-key auth on mount if nothing stored.
   * Superadmin token sessions are never auto-created — they must log in.
   */
  useEffect(() => {
    if (!auth && DEMO_API_KEY) {
      setAuth({
        apiKey: DEMO_API_KEY,
        role: "admin",
        name: "Demo Staff",
        branch: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * API-key mode: resolve staff identity via /v1/auth/me.
   * Re-runs when apiKey or switched staff id changes.
   */
  useEffect(() => {
    if (!isApiKeyMode) return;
    fetch(`${API_URL}/v1/auth/me`, {
      headers: { "X-Staff-Id": auth.id || "", "X-API-Key": auth.apiKey },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.status === "success") {
          setAuth((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {});
  }, [isApiKeyMode, auth?.apiKey, auth?.id]);

  /**
   * Token mode (superadmin): refresh profile via /platform/me.
   * Re-runs when token or profile id changes.
   */
  useEffect(() => {
    if (!isTokenMode) return;
    fetch(`${API_URL}/platform/me`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.status === "success") {
          setAuth((prev) => ({ ...prev, ...res.data }));
        } else if (res.status === "error") {
          // Token invalid/expired — drop the session.
          setAuth(null);
        }
      })
      .catch(() => {});
  }, [isTokenMode, auth?.token]);

  /**
   * Switch to a different demo user (API-key mode only).
   * Updates the staff id so /v1/auth/me re-resolves role/branch.
   */
  const switchUser = useCallback(
    (user) => {
      const nextAuth = {
        ...auth,
        apiKey: auth?.apiKey || DEMO_API_KEY,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch || null,
      };
      setAuth(nextAuth);
      return "/staff";
    },
    [auth],
  );

  /**
   * Superadmin JWT login for the /platform console.
   * On success stores { token, role: "superadmin", name, email }.
   */
  const loginPlatform = useCallback(async ({ email, password }) => {
    const res = await fetch(`${API_URL}/platform/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await res.json().catch(() => null);

    if (!res.ok || payload?.status !== "success") {
      const err = new Error(payload?.message || "Login failed");
      err.status = res.status;
      err.errors = payload?.errors || null;
      throw err;
    }

    const { staff, token } = payload.data;
    setAuth({
      token,
      role: staff.role,
      name: staff.name,
      email: staff.email,
      id: staff.id,
      branch: null,
      apiKey: null,
    });
    return staff;
  }, []);

  const logout = useCallback(() => setAuth(null), []);

  return (
    <AuthContext.Provider
      value={{ auth, switchUser, loginPlatform, logout }}
    >
      {children}
      <AuthInterceptor setAuth={setAuth} />
    </AuthContext.Provider>
  );
};

const AuthInterceptor = ({ setAuth }) => {
  const navigate = useNavigate();

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setAuth(null);
      navigate("/", { replace: true });
    });

    return () => registerUnauthorizedHandler(null);
  }, [navigate, setAuth]);

  return null;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
