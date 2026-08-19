import styles from "./Footer.module.css";

const Footer = () => (
  <footer className={styles.footer}>
    <div className={styles.container}>
      <div>
        <div className={styles.brand}>
          <span className={styles.mark}>№</span> Cue
        </div>
        <p className={styles.tagline}>
          Queue management for banks that would rather their lobby stayed empty.
        </p>
      </div>
      <div className={styles.columns}>
        <div>
          <h4>Product</h4>
          <a href="#product">Features</a>
          <a href="#how-it-works">How it works</a>
        </div>
        <div>
          <h4>Company</h4>
          <a href="#">About</a>
          <a href="#">Contact</a>
        </div>
      </div>
    </div>
    <div className={styles.bottom}>
      © {new Date().getFullYear()} Cue. All rights reserved.
    </div>
  </footer>
);

export default Footer;
