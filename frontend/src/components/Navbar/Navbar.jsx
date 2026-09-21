import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import { useTheme } from "../../features/theme/ThemeContext";
import { useBrand } from "../../features/brand/BrandContext";
import logoUrl from "../../assets/logo.svg";
import styles from "./Navbar.module.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const ROLE_BADGE = {
  admin: { label: "Admin", className: styles.badgeAdmin },
  manager: { label: "Manager", className: styles.badgeManager },
  staff: { label: "Staff", className: styles.badgeStaff },
  customer: { label: "Customer", className: styles.badgeCustomer },
};

const NAV_LINKS = ["Product", "How it works", "For branches", "Pricing"];

const Navbar = () => {
  const { brand } = useBrand();
  const [open, setOpen] = useState(false);
  const { auth, switchUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const accountHref = auth?.role === "customer" ? "/account" : "/staff";
  const firstName = auth?.name?.split(" ")[0];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <img src={logoUrl} alt={brand.name} className={styles.logoIcon} />
          <span>{brand.name}</span>
        </Link>

        <nav className={styles.nav}>
          {NAV_LINKS.map((link) => (
            <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}>
              {link}
            </a>
          ))}
          <Link to="/find-nearby" className={styles.boardsLink}>
            Find Nearby
          </Link>
          <Link to="/boards" className={styles.boardsLink}>
            Live Boards
          </Link>
        </nav>

        <button
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>

        <div className={styles.authGroup}>
          {auth ? (
            <>
              {auth.apiKey && <UserSwitcher switchUser={switchUser} navigate={navigate} apiKey={auth.apiKey} />}
              <Link to={accountHref} className={styles.accountLink}>
                {firstName}
              </Link>
              <button className={styles.cta} onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/boards" className={styles.loginLink}>
                Live Boards
              </Link>
              <Link to="/contact" className={styles.cta}>
                Request a demo
              </Link>
            </>
          )}
        </div>

        <button
          className={styles.menuToggle}
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span className={open ? styles.barOpen1 : styles.bar} />
          <span className={open ? styles.barOpen2 : styles.bar} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            className={styles.mobileNav}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setOpen(false)}
              >
                {link}
              </a>
            ))}
            <Link to="/find-nearby" onClick={() => setOpen(false)}>
              Find Nearby
            </Link>
            <Link to="/boards" onClick={() => setOpen(false)}>
              Live Boards
            </Link>
            {auth ? (
              <>
                <Link to={accountHref} onClick={() => setOpen(false)}>
                  {firstName}
                </Link>
                <button
                  className={styles.cta}
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/boards" onClick={() => setOpen(false)}>
                  Live Boards
                </Link>
                <Link
                  to="/contact"
                  className={styles.cta}
                  onClick={() => setOpen(false)}
                >
                  Request a demo
                </Link>
              </>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

/**
 * User Switcher Dropdown
 *
 * Fetches all demo users and shows a dropdown to switch between personas.
 */
const UserSwitcher = ({ switchUser, navigate, apiKey }) => {
  const [users, setUsers] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/v1/demo/users`)
      .then((r) => r.json())
      .then((res) => {
        if (res.status === "success") setUsers(res.data);
      })
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSwitch = (user) => {
    const path = switchUser(user);
    setDropdownOpen(false);
    navigate(path);
  };

  return (
    <div className={styles.switcherWrap} ref={dropdownRef}>
      <button
        className={styles.switcherBtn}
        onClick={() => setDropdownOpen((o) => !o)}
        aria-label="Switch user"
      >
        Switch user ▾
      </button>
      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            className={styles.switcherDropdown}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {users.map((user) => {
              const badge = ROLE_BADGE[user.role] || ROLE_BADGE.staff;
              const isCurrent = user.email === undefined ? false : true;
              return (
                <button
                  key={user.id}
                  className={styles.switcherItem}
                  onClick={() => handleSwitch(user)}
                >
                  <span className={styles.switcherName}>{user.name}</span>
                  <span className={badge.className}>{badge.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Navbar;
