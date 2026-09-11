import { body } from "express-validator";

export const submitContactValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name must be under 100 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("organization")
    .trim()
    .notEmpty()
    .withMessage("Organization is required")
    .isLength({ max: 100 })
    .withMessage("Organization must be under 100 characters"),

  body("branches")
    .optional()
    .trim(),

  body("message")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Message must be under 2000 characters"),
];
