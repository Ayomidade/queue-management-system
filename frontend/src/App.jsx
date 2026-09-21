import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { ThemeProvider } from "./features/theme/ThemeContext";
import { BrandProvider } from "./features/brand/BrandContext";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";

const Landing = lazy(() => import("./pages/Landing/Landing"));
const Contact = lazy(() => import("./pages/Contact/Contact"));
const CustomerHome = lazy(() => import("./pages/CustomerHome/CustomerHome"));
const StaffHome = lazy(() => import("./pages/StaffHome/StaffHome"));
const Board = lazy(() => import("./pages/Board/Board"));
const Boards = lazy(() => import("./pages/Boards/Boards"));
const Kiosk = lazy(() => import("./pages/Kiosk/Kiosk"));
const Appointment = lazy(() => import("./pages/Appointment/Appointment"));
const NearestBranch = lazy(() => import("./pages/NearestBranch/NearestBranch"));
const Branch = lazy(() => import("./pages/Branch/Branch"));
const NotFound = lazy(() => import("./pages/NotFound/NotFound"));

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
          path="/account"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <>
                <Navbar />
                <CustomerHome />
                <Footer />
              </>
            </ProtectedRoute>
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
