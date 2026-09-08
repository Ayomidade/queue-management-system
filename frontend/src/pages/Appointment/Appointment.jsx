import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { apiClient } from "../../lib/apiClient";
import {
  getAvailableSlots,
  createAppointment,
  getAppointmentTicket,
} from "../../features/appointment/appointmentApi";
import styles from "./Appointment.module.css";

const Appointment = () => {
  const { branchId } = useParams();
  const [branch, setBranch] = useState(null);
  const [queues, setQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [step, setStep] = useState("form"); // form | confirm | booked | track
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trackId, setTrackId] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get(`/branches/public/${branchId}`);
        setBranch(res.data.branch);
        setQueues(res.data.queues);
      } catch {
        setError("Branch not found");
      }
    };
    load();
  }, [branchId]);

  useEffect(() => {
    if (!selectedQueue || !selectedDate) return;
    const load = async () => {
      setSlotsLoading(true);
      setSelectedSlot("");
      try {
        const res = await getAvailableSlots({
          branchId,
          serviceId: selectedQueue,
          date: selectedDate,
        });
        setSlots(res.data.slots);
      } catch {
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    load();
  }, [selectedQueue, selectedDate, branchId]);

  const todayStr = new Date().toISOString().split("T")[0];

  const handleBook = async () => {
    if (!selectedQueue || !selectedDate || !selectedSlot) return;
    setLoading(true);
    setError(null);
    try {
      const scheduledFor = new Date(`${selectedDate}T${selectedSlot}:00`);
      const res = await createAppointment({
        queueId: selectedQueue,
        branchId,
        scheduledFor: scheduledFor.toISOString(),
        guestName: guestName || undefined,
        guestPhone: guestPhone || undefined,
      });
      setBooking(res.data);
      setStep("booked");
    } catch (err) {
      setError(err.message || "Failed to book appointment");
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async () => {
    if (!trackId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAppointmentTicket(trackId.trim());
      setBooking(res.data);
      setStep("track");
    } catch {
      setError("Appointment not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {step === "form" && (
          <>
            <p className={styles.eyebrow}>Book an Appointment</p>
            <h1 className={styles.title}>
              {branch ? branch.name : "Loading…"}
            </h1>
            <p className={styles.subtitle}>
              {branch?.location} · Choose a service, date, and time
            </p>

            <label className={styles.field}>
              <span className={styles.label}>Service *</span>
              <select
                value={selectedQueue}
                onChange={(e) => setSelectedQueue(e.target.value)}
                className={styles.select}
              >
                <option value="">Select a service</option>
                {queues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.serviceName} ({q.waiting} waiting)
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Date *</span>
              <input
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={styles.input}
              />
            </label>

            {selectedQueue && selectedDate && (
              <div className={styles.slotsSection}>
                <span className={styles.label}>Available Times *</span>
                {slotsLoading ? (
                  <p className={styles.loading}>Loading slots…</p>
                ) : slots.length === 0 ? (
                  <p className={styles.empty}>No slots available for this date</p>
                ) : (
                  <div className={styles.slotGrid}>
                    {slots.map((s) => (
                      <button
                        key={s.time}
                        className={`${styles.slotBtn} ${!s.available ? styles.slotDisabled : ""} ${selectedSlot === s.time ? styles.slotActive : ""}`}
                        onClick={() => s.available && setSelectedSlot(s.time)}
                        disabled={!s.available}
                      >
                        <span className={styles.slotTime}>{s.time}</span>
                        <span className={styles.slotAvail}>
                          {s.available ? `${s.remaining} left` : "Full"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <label className={styles.field}>
              <span className={styles.label}>Your Name (optional)</span>
              <input
                type="text"
                placeholder="Full name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Phone (optional)</span>
              <input
                type="tel"
                placeholder="+234 801 234 5678"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className={styles.input}
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button
              className={styles.bookBtn}
              onClick={handleBook}
              disabled={!selectedQueue || !selectedDate || !selectedSlot || loading}
            >
              {loading ? "Booking…" : "Book Appointment"}
            </button>

            <div className={styles.trackSection}>
              <p className={styles.trackLabel}>Already have a booking?</p>
              <div className={styles.trackRow}>
                <input
                  type="text"
                  placeholder="Enter booking ID (e.g. A1B2C3D4)"
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                  className={styles.input}
                />
                <button
                  className={styles.trackBtn}
                  onClick={handleTrack}
                  disabled={!trackId.trim() || loading}
                >
                  Track
                </button>
              </div>
            </div>

            <Link to={`/branch/${branchId}`} className={styles.backLink}>
              ← Back to branch
            </Link>
          </>
        )}

        {step === "booked" && booking && (
          <>
            <p className={styles.eyebrow}>Appointment Confirmed</p>
            <motion.div
              className={styles.ticketNumber}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              #{String(booking.ticketNumber).padStart(4, "0")}
            </motion.div>
            <p className={styles.detail}>
              <strong>{booking.queue}</strong> at <strong>{booking.branch}</strong>
            </p>
            <p className={styles.detail}>
              Scheduled for:{" "}
              <strong>
                {new Date(booking.scheduledFor).toLocaleString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </p>
            <p className={styles.bookingId}>Booking ID: {booking.kioskId}</p>
            <p className={styles.note}>
              Save your booking ID to track or cancel this appointment.
            </p>

            <div className={styles.bookedActions}>
              <Link to={`/board/${branchId}`} className={styles.boardLink}>
                View Live Board →
              </Link>
              <button
                className={styles.backToList}
                onClick={() => {
                  setStep("form");
                  setBooking(null);
                  setSelectedQueue("");
                  setSelectedDate("");
                  setSelectedSlot("");
                }}
              >
                Book Another
              </button>
            </div>
          </>
        )}

        {step === "track" && booking && (
          <>
            <p className={styles.eyebrow}>Appointment Details</p>
            <motion.div
              className={styles.ticketNumber}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              #{String(booking.ticketNumber).padStart(4, "0")}
            </motion.div>
            <p className={styles.detail}>
              <strong>{booking.queue}</strong> at <strong>{booking.branch}</strong>
            </p>
            <p className={styles.detail}>
              Scheduled:{" "}
              {new Date(booking.scheduledFor).toLocaleString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className={styles.detail}>
              Status: <span className={styles.status}>{booking.status}</span>
            </p>

            <div className={styles.bookedActions}>
              <button className={styles.backToList} onClick={() => setStep("form")}>
                ← Back
              </button>
              <Link to={`/board/${branchId}`} className={styles.boardLink}>
                View Board →
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Appointment;
