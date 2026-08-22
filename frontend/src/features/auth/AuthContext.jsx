import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { loginCustomer, loginStaff, registerCustomer } from "./authApi";
import { registerUnauthorizedHandler } from "../../lib/apiClient";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);
const STORAGE_KEY = "cue_auth";

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
    </AuthContext.Provider>
  );
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
