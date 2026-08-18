import { body } from "express-validator";

export const createQueueValidator = [
  body("serviceName")
    .trim()
    .notEmpty()
    .withMessage("Service name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Service name must be between 2 and 100 characters"),

  body("branch")
    .notEmpty()
    .withMessage("Branch ID is required")
    .isMongoId()
    .withMessage("Invalid branch ID"),

  // body("prefix")
  // .trim()
  // .notEmpty()
  // .withMessage("Queue prefix is required")
  // .isLength({ min:1, max: 3 })
  // .withMessage("Prefix must be between 1 and 3 characters")
  // .toUpperCase(),
];

export const updateQueueValidator = [
  body("serviceName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Service name must be 2 and 100 characters"),

  // body("prefix")
  // .optional()
  // .trim()
  // .isLength({ min: 1, max: 3 })
  // .withMessage("Prefix must be between 1 and 3 characters")
  // .toUpperCase(),
];
