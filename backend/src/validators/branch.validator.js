import { body } from "express-validator";

export const createBranchValidator = [
    body("name")
    .trim()
    .notEmpty()
    .withMessage("Branch name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Branch name must be betweeen 2 and 100 characters"),

    body("location")
    .trim()
    .notEmpty()
    .withMessage("Branch location is required"),

    body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

    body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
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


