import { body } from "express-validator";

export const createCounterValidator = [
  body("label")
    .trim()
    .notEmpty()
    .withMessage("Counter label is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("Counter label must be between 1 and 50 characters"),

  body("branch").optional().isMongoId().withMessage("Invalid branch ID"),
];

export const assignStaffToCounterValidator = [
  body("staffId")
    .notEmpty()
    .withMessage("Staff ID is required")
    .isMongoId()
    .withMessage("Invalid staff ID"),
];
