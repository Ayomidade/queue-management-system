import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { loginCustomer, loginStaff, registerCustomer } from "./authApi";
import { registerUnauthorizedHandler } from "../../lib/apiClient";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);
const STORAGE_KEY = "cue_auth";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const readStoredAuth = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(readStoredAuth);

  useEffect(() => {
    if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    else localStorage.removeItem(STORAGE_KEY);
  }, [auth]);

  const login = useCallback(async ({ email, password, accountType }) => {
    const response =
      accountType === "staff"
        ? await loginStaff({ email, password })
        : await loginCustomer({ email, password });

    const account =
      accountType === "staff" ? response.data.staff : response.data.user;
    const nextAuth = { ...account, token: response.data.token, accountType };
    setAuth(nextAuth);
    return nextAuth;
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    const response = await registerCustomer({ name, email, password });
    const nextAuth = {
      ...response.data.user,
      token: response.data.token,
      accountType: "customer",
    };
    setAuth(nextAuth);
    return nextAuth;
  }, []);

  const logout = useCallback(() => setAuth(null), []);

  return (
    <AuthContext.Provider value={{ auth, login, register, logout }}>
      {children}
      <AuthInterceptor setAuth={setAuth} />
      <PushManager auth={auth} />
    </AuthContext.Provider>
  );
};

const PushManager = ({ auth }) => {
  const regRef = useRef(null);

  useEffect(() => {
    if (!auth?.token) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let cancelled = false;

    const run = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        regRef.current = reg;

        if (Notification.permission !== "granted") return;

        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sendToServer(sub, auth.token);
          return;
        }

        const res = await fetch(`${API_URL}/push/vapid-public-key`);
        const { data } = await res.json();

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        });

        if (!cancelled) await sendToServer(subscription, auth.token);
      } catch {
        // push not supported or blocked
      }
    };

    run();
    return () => { cancelled = true; };
  }, [auth?.token]);

  return null;
};

const sendToServer = async (subscription, token) => {
  const body = subscription.toJSON();
  await fetch(`${API_URL}/push/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ endpoint: body.endpoint, keys: body.keys }),
  });
};

const AuthInterceptor = ({ setAuth }) => {
  const navigate = useNavigate();

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setAuth(null);
      navigate("/login", { replace: true, state: { sessionExpired: true } });
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
