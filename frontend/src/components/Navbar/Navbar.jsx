import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Navbar.module.css";
import { Link } from "react-router-dom";

const NAV_LINKS = ["Product", "How it works", "For branches", "Pricing"];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <span className={styles.mark}>№</span>Cue
        </Link>

        <nav className={styles.nav}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link}
              to={`/#${link.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {link}
            </Link>
          ))}
        </nav>

        <Link to="/contact" className={styles.cta}>
          Request a demo
        </Link>

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
              <Link
                key={link}
                to={`/#${link.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setOpen(false)}
              >
                {link}
              </Link>
            ))}

            {/* FIXED: Turned into a working Router Link that also closes the menu */}
            <Link
              to="/contact"
              className={styles.cta}
              onClick={() => setOpen(false)}
            >
              Request a demo
            </Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
