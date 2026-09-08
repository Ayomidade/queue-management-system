import { body, query, param } from "express-validator";

export const getSlotsValidator = [
  query("branchId")
    .notEmpty()
    .withMessage("branchId is required")
    .isMongoId()
    .withMessage("Invalid branch ID"),
  query("serviceId")
    .notEmpty()
    .withMessage("serviceId is required")
    .isMongoId()
    .withMessage("Invalid service ID"),
  query("date")
    .notEmpty()
    .withMessage("date is required")
    .isISO8601()
    .withMessage("Invalid date format (use YYYY-MM-DD)"),
];

export const createAppointmentValidator = [
  body("queueId")
    .notEmpty()
    .withMessage("queueId is required")
    .isMongoId()
    .withMessage("Invalid queue ID"),
  body("branchId")
    .notEmpty()
    .withMessage("branchId is required")
    .isMongoId()
    .withMessage("Invalid branch ID"),
  body("scheduledFor")
    .notEmpty()
    .withMessage("scheduledFor is required")
    .isISO8601()
    .withMessage("Invalid date format"),
  body("guestName")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name must be under 100 characters"),
  body("guestPhone")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone must be under 20 characters"),
];

export const appointmentIdParamValidator = [
  param("kioskId")
    .notEmpty()
    .withMessage("Booking ID is required")
    .matches(/^[A-Z0-9]{9}$/)
    .withMessage("Invalid booking ID format"),
];
