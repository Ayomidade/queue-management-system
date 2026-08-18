import { body } from "express-validator";

export const createStaffValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Staff name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  body("role")
    .optional()
    .isIn(["staff", "manager"])
    .withMessage("Role must be either staff or manager"),

  body("branch").optional().isMongoId().withMessage("Invalid branch ID"),
];

export const assignStaffValidator = [
    body("branchId")
    .notEmpty()
    .withMessage("Branch ID is required")
    .isMongoId()
    .withMessage("Invalid branch ID"),
];


