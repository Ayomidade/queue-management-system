import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    status: "error",
    message:
      "Too many attempts from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Lighter limiter for public read endpoints (branch info, board data)
export const publicReadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: {
    status: "error",
    message: "Too many requests, please try again shortly",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mutation limiter for public write endpoints (kiosk ticket, appointments)
export const publicWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: {
    status: "error",
    message: "Too many ticket requests, please try again in 5 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
