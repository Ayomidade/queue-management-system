import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { loginCustomer, loginStaff, registerCustomer } from "./authApi";
import { registerUnauthorizedHandler } from "../../lib/apiClient";

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
  const navigate = useNavigate();

  useEffect(() => {
    if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    else localStorage.removeItem(STORAGE_KEY);
  }, [auth]);

  // A 401 from anywhere in the app means the stored token is no longer good.
  // Clear it and send the user back to sign in, with a reason they'll understand.
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setAuth(null);
      navigate("/login", { replace: true, state: { sessionExpired: true } });
    });
  }, [navigate]);

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
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
