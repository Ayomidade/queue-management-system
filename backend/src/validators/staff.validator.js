import { body } from "express-validator";

/**
 * createStaffValidator — password is OPTIONAL.
 * When omitted, the server generates a temp password (Cue-XXXXXX-XXXXXX)
 * and returns it once as `tempPassword` with mustChangePassword: true.
 * `role` is not accepted — Staff collection holds only staff after the split.
 * Managers are created via POST /api/managers; admins self-register.
 */
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
    .optional({ values: "falsy" })
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  // Required for admins; managers always use their own branch (ignored in body).
  body("branch").optional().isMongoId().withMessage("Invalid branch ID"),
];

export const assignStaffValidator = [
  body("branchId")
    .notEmpty()
    .withMessage("Branch ID is required")
    .isMongoId()
    .withMessage("Invalid branch ID"),
];
