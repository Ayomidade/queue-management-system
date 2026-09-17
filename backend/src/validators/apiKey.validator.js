import { body, param } from "express-validator";

/**
 * Valid scopes that can be assigned to an API key.
 * Must match the VALID_SCOPES array in the ApiKey model.
 */
const VALID_SCOPES = [
  "branches:read",
  "tickets:write",
  "tickets:read",
  "staff:read",
  "analytics:read",
  "webhooks:manage",
  "admin",
];

/**
 * Validation rules for creating a new API key.
 *
 * POST /api/v1/api-keys
 * Body: { bankName, label?, scopes?, rateLimit?, expiresAt? }
 */
export const validateCreateApiKey = [
  body("bankName")
    .trim()
    .notEmpty()
    .withMessage("Bank name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Bank name must be between 2 and 100 characters"),

  body("label")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Label must be under 200 characters"),

  body("scopes")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Scopes must be a non-empty array")
    .custom((scopes) => {
      const invalid = scopes.filter((s) => !VALID_SCOPES.includes(s));
      if (invalid.length > 0) {
        throw new Error(`Invalid scope(s): ${invalid.join(", ")}`);
      }
      return true;
    }),

  body("rateLimit")
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage("Rate limit must be between 1 and 10,000 requests per minute"),

  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("Expiration date must be a valid ISO 8601 date")
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error("Expiration date must be in the future");
      }
      return true;
    }),
];

/**
 * Validation rules for rotating an API key.
 *
 * POST /api/v1/api-keys/:id/rotate
 * Params: { id }
 */
export const validateRotateApiKey = [
  param("id")
    .isMongoId()
    .withMessage("Invalid API key ID"),
];

/**
 * Validation rules for deleting an API key.
 *
 * DELETE /api/v1/api-keys/:id
 * Params: { id }
 */
export const validateDeleteApiKey = [
  param("id")
    .isMongoId()
    .withMessage("Invalid API key ID"),
];
