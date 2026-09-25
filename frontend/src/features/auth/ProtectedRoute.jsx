import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Route guard — JWT only (Phase 13 WP6/WP7).
 *
 * Demo API-key sessions are gone; every protected page requires a Bearer token.
 * If allowedRoles is provided and auth.role isn't in it, redirect home.
 * Superadmin-only routes pass allowedRoles={["superadmin"]}.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { auth } = useAuth();
  const location = useLocation();

  const isAuthenticated = !!auth?.token;

  if (!isAuthenticated) {
    // Platform console signs in at its own login page (WP8).
    if (location.pathname.startsWith("/platform")) {
      return (
        <Navigate
          to="/platform/login"
          replace
          state={{ from: location.pathname }}
        />
      );
    }
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
