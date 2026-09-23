import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Route guard for authenticated pages.
 *
 * Supports both auth modes:
 * - API-key mode (bank personas): demo auto-authenticates via VITE_DEMO_API_KEY.
 * - Token mode (superadmin): requires a JWT from /platform/login.
 *
 * If allowedRoles is provided and auth.role isn't in it, redirect home.
 * Superadmin-only routes should pass allowedRoles={["superadmin"]}.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { auth } = useAuth();
  const location = useLocation();

  const hasApiKey = !!auth?.apiKey;
  const hasToken = !!auth?.token;
  const isAuthenticated = hasApiKey || hasToken;

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
