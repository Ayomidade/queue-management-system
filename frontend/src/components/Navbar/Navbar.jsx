import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import styles from "./Navbar.module.css";

const NAV_LINKS = ["Product", "How it works", "For branches", "Pricing"];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { auth, logout } = useAuth();
  const accountHref = auth?.accountType === "staff" ? "/staff" : "/account";
  const firstName = auth?.name?.split(" ")[0];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <span className={styles.mark}>№</span>Cue
        </Link>

        <nav className={styles.nav}>
          {NAV_LINKS.map((link) => (
            <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}>
              {link}
            </a>
          ))}
        </nav>

        <div className={styles.authGroup}>
          {auth ? (
            <>
              <Link to={accountHref} className={styles.accountLink}>
                {firstName}
              </Link>
              <button className={styles.cta} onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.loginLink}>
                Sign in
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
                <Link to="/login" onClick={() => setOpen(false)}>
                  Sign in
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

export default Navbar;
