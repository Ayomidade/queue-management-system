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
    .withMessage("Branch name must be between 2 and 100 characters"),

    body("location")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Branch location cannot be empty"),

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

    body("coordinates")
    .optional()
    .isObject()
    .withMessage("Coordinates must be an object"),

    body("coordinates.lat")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),

    body("coordinates.lng")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),

    body("operatingHours")
    .optional()
    .isObject()
    .withMessage("Operating hours must be an object"),

    body("maxAppointmentsPerSlot")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Max appointments per slot must be between 1 and 100"),
];


