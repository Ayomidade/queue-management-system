import { body } from "express-validator";

export const createBranchValidator = [
    body("name")
    .trim()
    .notEmpty()
    .withMessage("Branch name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Branch name must be between 2 and 100 characters"),

    body("location")
    .trim()
    .notEmpty()
    .withMessage("Branch location is required"),

    body("address")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address must be under 200 characters"),

    body("phone")
    .optional()
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage("Please provide a valid phone number"),

    body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
];

export const updateBranchValidator = [
    body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Branch name must be between 2 an 100 characters"),

    body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

    body("Phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
];


