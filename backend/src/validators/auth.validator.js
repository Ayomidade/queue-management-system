import { body } from "express-validator";

/** Shared email/password rules for every login endpoint. */
const emailPasswordRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("password").trim().notEmpty().withMessage("Password is required."),
];

/**
 * Login validators — one per collection (kind).
 * Same shape; separate exports so routes stay explicit.
 */
export const loginStaffValidator = emailPasswordRules;
export const loginManagerValidator = emailPasswordRules;
export const loginAdminValidator = emailPasswordRules;

/** Back-compat alias used by legacy /api/staff/login. */
export const loginValidator = emailPasswordRules;

/**
 * POST /api/auth/register/admin — public bank-admin self-registration.
 * Instant, no invite; bankName is required and becomes Admin.bank.
 */
export const registerAdminValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),
  body("bankName")
    .trim()
    .notEmpty()
    .withMessage("Bank name is required.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Bank name must be between 2 and 100 characters"),
];

/**
 * POST /api/auth/register/manager|staff — redeem an invite token.
 * Invitee sets their own password (no temp-password round trip).
 */
export const registerWithInviteValidator = [
  body("token")
    .trim()
    .notEmpty()
    .withMessage("Invite token is required.")
    .isLength({ min: 32, max: 128 })
    .withMessage("Invalid invite token"),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),
];

/** POST /api/auth/invites/manager — admin only; bank comes from JWT. */
export const createManagerInviteValidator = [
  body("expiresInDays")
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage("expiresInDays must be between 1 and 30"),
];

/** POST /api/auth/invites/staff — admin or manager. */
export const createStaffInviteValidator = [
  // branch required only for admins (managers use their own branch).
  body("branch")
    .optional({ values: "falsy" })
    .isMongoId()
    .withMessage("Invalid branch ID"),
  body("expiresInDays")
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage("expiresInDays must be between 1 and 30"),
];

/** POST /api/auth/change-password — any logged-in kind. */
export const changePasswordValidator = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
];

/**
 * Legacy registration validator (unused by active routes; kept so any
 * old imports do not break). Prefer registerAdminValidator / invite flows.
 */
export const validateRegistration = registerAdminValidator;
