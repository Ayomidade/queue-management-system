import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getNearestBranches } from "../../features/branch/nearestApi";
import styles from "./NearestBranch.module.css";

const NearestBranch = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationStatus, setLocationStatus] = useState("requesting");

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      setLocationStatus("unsupported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocationStatus("found");
        try {
          const res = await getNearestBranches({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setBranches(res.data);
        } catch (err) {
          setError(err.message || "Failed to fetch branches");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLocationStatus("denied");
        setLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location access denied. Please enable location services.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location information unavailable.");
            break;
          case err.TIMEOUT:
            setError("Location request timed out.");
            break;
          default:
            setError("Unable to get your location.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.container}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className={styles.eyebrow}>Find a Branch</p>
        <h1 className={styles.title}>Nearest Branches</h1>
        <p className={styles.subtitle}>
          Sorted by distance from your current location
        </p>

        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Finding your location…</p>
          </div>
        )}

        {!loading && error && (
          <div className={styles.errorState}>
            <p className={styles.errorText}>{error}</p>
            {locationStatus === "denied" && (
              <p className={styles.hint}>
                Enable location in your browser settings and reload.
              </p>
            )}
          </div>
        )}

        {!loading && !error && branches.length === 0 && (
          <p className={styles.empty}>
            No branches with location data found nearby.
          </p>
        )}

        {!loading && branches.length > 0 && (
          <div className={styles.list}>
            {branches.map((b, i) => (
              <motion.div
                key={b.id}
                className={styles.branchCard}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
              >
                <div className={styles.branchHeader}>
                  <div>
                    <h3 className={styles.branchName}>{b.name}</h3>
                    <p className={styles.branchLocation}>
                      📍 {b.location}
                      {b.address && <> · {b.address}</>}
                    </p>
                  </div>
                  <span className={styles.distance}>{b.distanceKm} km</span>
                </div>
                <div className={styles.branchStats}>
                  <span className={styles.stat}>
                    <span className={styles.statValue}>{b.waiting}</span>
                    <span className={styles.statLabel}>waiting</span>
                  </span>
                  <span className={styles.stat}>
                    <span className={styles.statValue}>{b.counters.open}/{b.counters.total}</span>
                    <span className={styles.statLabel}>counters open</span>
                  </span>
                </div>
                <div className={styles.branchActions}>
                  <Link to={`/branch/${b.id}`} className={styles.actionBtn}>
                    View Details →
                  </Link>
                  <Link to={`/board/${b.id}`} className={styles.actionBtnSecondary}>
                    Live Board
                  </Link>
                  <Link to={`/kiosk/${b.id}`} className={styles.actionBtnSecondary}>
                    Kiosk Check-in
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default NearestBranch;
