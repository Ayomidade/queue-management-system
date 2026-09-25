import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { registerUnauthorizedHandler } from "../../lib/apiClient";
import { useNavigate } from "react-router-dom";
import {
  loginStaff,
  loginManager,
  loginAdmin,
  loginPlatform,
  getAuthMe,
} from "./authApi";

/**
 * AuthContext — JWT-only authentication (Phase 13 WP6/WP7).
 *
 * Demo API-key mode and the user switcher are gone. Every role signs in
 * with email/password:
 *   staff    → POST /auth/login/staff    → /staff (console)
 *   manager  → POST /auth/login/manager  → /staff (overview)
 *   admin    → POST /auth/login/admin    → /staff (overview)
 *   superadmin → POST /platform/login    → /platform
 *
 * Stored shape: { token, id, role, name, email, branch?, bank?, mustChangePassword? }
 * Identity is refreshed via GET /auth/me with the Bearer token.
 */

const AuthContext = createContext(null);
const STORAGE_KEY = "cue_auth";

const LOGIN_BY_KIND = {
  staff: loginStaff,
  manager: loginManager,
  admin: loginAdmin,
  superadmin: loginPlatform,
};

const DEFAULT_AFTER_LOGIN = {
  staff: "/staff",
  manager: "/staff",
  admin: "/staff",
  superadmin: "/platform",
};

const readStoredAuth = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Normalize a login/me payload into the stored auth shape. */
const toAuth = (token, data) => {
  const role = data.role || data.kind || "staff";
  return {
    token,
    id: data.id,
    role,
    name: data.name,
    email: data.email,
    branch: data.branch?._id || data.branch || null,
    bank: data.bank || null,
    counter: data.counter?._id || data.counter || null,
    queues: data.queues || [],
    mustChangePassword: !!data.mustChangePassword,
    // apiKey is never set — v1 remains for external bank systems only.
    apiKey: null,
  };
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(readStoredAuth);

  useEffect(() => {
    if (auth?.token) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    else localStorage.removeItem(STORAGE_KEY);
  }, [auth]);

  const hasToken = !!auth?.token;

  /**
   * Refresh identity while a JWT session exists.
   * Invalid/expired token → drop the session.
   */
  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;

    getAuthMe(auth.token)
      .then((res) => {
        if (cancelled) return;
        if (res?.status === "success" && res.data) {
          setAuth((prev) => (prev ? toAuth(prev.token, res.data) : prev));
        }
      })
      .catch(() => {
        if (!cancelled) setAuth(null);
      });

    return () => {
      cancelled = true;
    };
  }, [hasToken, auth?.token, auth?.id]);

  /**
   * Email/password login for any kind. Returns the auth object and the
   * default post-login path for that role.
   */
  const login = useCallback(async (kind, credentials) => {
    const fn = LOGIN_BY_KIND[kind];
    if (!fn) throw new Error(`Unknown login kind: ${kind}`);

    const payload = await fn(credentials);
    const { token } = payload.data || {};
    // All logins wrap identity under `user` (platform included since WP8).
    const identity = payload.data?.user || payload.data?.staff;
    if (!token || !identity) {
      throw new Error("Login response missing token or user");
    }

    const next = toAuth(token, identity);
    setAuth(next);
    return { auth: next, path: DEFAULT_AFTER_LOGIN[kind] || "/staff" };
  }, []);

  /** Superadmin convenience wrapper (kept for PlatformLogin). */
  const loginPlatformCreds = useCallback(
    (credentials) => login("superadmin", credentials),
    [login],
  );

  const logout = useCallback(() => setAuth(null), []);

  /**
   * Clear mustChangePassword after a successful rotation
   * (ChangePassword component calls this so the force prompt dismisses).
   */
  const clearMustChangePassword = useCallback(() => {
    setAuth((prev) =>
      prev ? { ...prev, mustChangePassword: false } : prev,
    );
  }, []);

  const replaceToken = useCallback((token) => {
    setAuth((prev) =>
      prev ? toAuth(token, { ...prev, mustChangePassword: false }) : prev,
    );
  }, []);

  return (
    <AuthContext.Provider
      value={{
        auth,
        login,
        loginPlatform: loginPlatformCreds,
        logout,
        clearMustChangePassword,
        replaceToken,
      }}
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
      // Superadmin session-expiry returns to /platform/login with the
      // expired notice; bank roles land on the marketing home (WP8).
      // Read role BEFORE clearing — setAuth(null) wipes storage.
      let wasSuperadmin = false;
      try {
        const raw = localStorage.getItem("cue_auth");
        wasSuperadmin = !!raw && JSON.parse(raw)?.role === "superadmin";
      } catch {
        wasSuperadmin = false;
      }
      setAuth(null);
      if (wasSuperadmin) {
        navigate("/platform/login", {
          replace: true,
          state: { sessionExpired: true },
        });
      } else {
        navigate("/", { replace: true });
      }
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
