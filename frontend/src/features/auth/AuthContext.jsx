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
 * AuthContext — API-key-first authentication for the demo frontend.
 *
 * In production, banks manage their own auth and call Cue's API via X-API-Key.
 * The demo uses a pre-seeded API key stored in VITE_DEMO_API_KEY.
 *
 * The user switcher lets visitors explore the demo from each persona's
 * perspective (admin, manager, staff).
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

  /**
   * Initialize demo auth on mount if no stored auth exists.
   * Uses the pre-seeded API key from env vars.
   */
  useEffect(() => {
    if (!auth && DEMO_API_KEY) {
      const demoAuth = {
        apiKey: DEMO_API_KEY,
        role: "admin",
        name: "Demo Staff",
        branch: null,
      };
      setAuth(demoAuth);
    }
  }, []);

  /**
   * After setting the API key, fetch /v1/auth/me to resolve
   * the staff identity (id, branch, counter, etc.)
   */
  useEffect(() => {
    if (!auth?.apiKey) return;
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
  }, [auth?.apiKey, auth?.id]);

  /**
   * Switch to a different demo user.
   * Updates auth state and navigates to the staff dashboard.
   */
  const switchUser = useCallback(
    (user) => {
      const nextAuth = {
        ...auth,
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

  const logout = useCallback(() => setAuth(null), []);

  return (
    <AuthContext.Provider value={{ auth, switchUser, logout }}>
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