import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { ThemeProvider } from "./features/theme/ThemeContext";
import { BrandProvider } from "./features/brand/BrandContext";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";

const Landing = lazy(() => import("./pages/Landing/Landing"));
const Contact = lazy(() => import("./pages/Contact/Contact"));
const StaffHome = lazy(() => import("./pages/StaffHome/StaffHome"));
const LoginPage = lazy(() => import("./pages/Login/LoginPage"));
const PlatformLogin = lazy(() => import("./pages/Platform/PlatformLogin"));
const PlatformDashboard = lazy(() => import("./pages/Platform/PlatformDashboard"));
const Board = lazy(() => import("./pages/Board/Board"));
const Boards = lazy(() => import("./pages/Boards/Boards"));
const Kiosk = lazy(() => import("./pages/Kiosk/Kiosk"));
const Appointment = lazy(() => import("./pages/Appointment/Appointment"));
const NearestBranch = lazy(() => import("./pages/NearestBranch/NearestBranch"));
const Branch = lazy(() => import("./pages/Branch/Branch"));
const TicketPage = lazy(() => import("./pages/TicketPage/TicketPage"));
const NotFound = lazy(() => import("./pages/NotFound/NotFound"));
const IntegrationGuide = lazy(() => import("./pages/StaffHome/IntegrationGuide"));

const PageSpinner = () => (
  <div
    style={{
      minHeight: "60vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-body, system-ui, sans-serif)",
      color: "var(--text-muted, #666)",
    }}
  >
    Loading…
  </div>
);

function App() {
  return (
    <BrandProvider>
    <ThemeProvider>
    <AuthProvider>
      <ErrorBoundary>
      <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <Landing />
              <Footer />
            </>
          }
        />
        <Route
          path="/contact"
          element={
            <>
              <Navbar />
              <Contact />
              <Footer />
            </>
          }
        />
        <Route
          path="/ticket"
          element={
            <>
              <Navbar />
              <TicketPage />
              <Footer />
            </>
          }
        />
        <Route
          path="/ticket/:ticketId"
          element={
            <>
              <Navbar />
              <TicketPage />
              <Footer />
            </>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={["staff", "manager", "admin"]}>
              <>
                <Navbar />
                <StaffHome />
                <Footer />
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path="/integration"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <>
                <Navbar />
                <IntegrationGuide />
                <Footer />
              </>
            </ProtectedRoute>
          }
        />
        {/* Bank JWT logins — Phase 13 WP7 (one page per kind) */}
        <Route
          path="/login"
          element={<Navigate to="/login/staff" replace />}
        />
        <Route path="/login/:kind" element={<LoginPage />} />
        {/* Superadmin platform console — JWT login only, not bank-scoped */}
        <Route
          path="/platform/login"
          element={
            <>
              <Navbar />
              <PlatformLogin />
            </>
          }
        />
        <Route
          path="/platform"
          element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <PlatformDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/boards" element={<Boards />} />
        <Route path="/board/:branchId" element={<Board />} />
        <Route path="/kiosk/:branchId" element={<Kiosk />} />
        <Route path="/appointment/:branchId" element={<Appointment />} />
        <Route path="/find-nearby" element={<NearestBranch />} />
        <Route
          path="/branch/:branchId"
          element={
            <>
              <Navbar />
              <Branch />
              <Footer />
            </>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </AuthProvider>
    </ThemeProvider>
    </BrandProvider>
  );
}

export default App;