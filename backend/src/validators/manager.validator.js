import { body } from "express-validator";

/**
 * POST /api/managers — admin creates a manager.
 * `branch` is required; `bank` is denormalized from Branch.bank server-side
 * (never trusted from the body). Password is optional — if omitted the
 * server generates a temp password returned once to the creator.
 */
export const createManagerValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Manager name is required")
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
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("branch")
    .notEmpty()
    .withMessage("Branch is required")
    .isMongoId()
    .withMessage("Invalid branch ID"),
];

/** PATCH /api/managers/:managerId/branch — reassign a manager's branch. */
export const assignManagerBranchValidator = [
  body("branchId")
    .notEmpty()
    .withMessage("Branch ID is required")
    .isMongoId()
    .withMessage("Invalid branch ID"),
];
