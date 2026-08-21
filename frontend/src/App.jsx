import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { ThemeProvider } from "./features/theme/ThemeContext";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import Landing from "./pages/Landing/Landing";
import Contact from "./pages/Contact/Contact";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import CustomerHome from "./pages/CustomerHome/CustomerHome";
import StaffHome from "./pages/StaffHome/StaffHome";
import Board from "./pages/Board/Board";
import Branch from "./pages/Branch/Branch";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail/VerifyEmail";
import Settings from "./pages/Settings/Settings";
import NotFound from "./pages/NotFound/NotFound";

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
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
          path="/login"
          element={
            <>
              <Navbar />
              <Login />
              <Footer />
            </>
          }
        />
        <Route
          path="/register"
          element={
            <>
              <Navbar />
              <Register />
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
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={["customer", "staff", "manager", "admin"]}>
              <>
                <Navbar />
                <Settings />
                <Footer />
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <>
              <Navbar />
              <ForgotPassword />
              <Footer />
            </>
          }
        />
        <Route
          path="/reset-password"
          element={
            <>
              <Navbar />
              <ResetPassword />
              <Footer />
            </>
          }
        />
        <Route
          path="/verify-email"
          element={
            <>
              <Navbar />
              <VerifyEmail />
              <Footer />
            </>
          }
        />
        <Route path="/board/:branchId" element={<Board />} />
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
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
