import { body, param } from "express-validator";

export const createKioskTicketValidator = [
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

export const kioskIdParamValidator = [
  param("kioskId")
    .notEmpty()
    .withMessage("kioskId is required")
    .matches(/^[A-Z0-9]{9}$/)
    .withMessage("Invalid kiosk ID format"),
];
