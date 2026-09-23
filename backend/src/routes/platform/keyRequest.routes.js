import { Router } from "express";
import { body, param } from "express-validator";
import {
  listKeyRequests,
  reviewKeyRequest,
} from "../../controllers/platform/platformKeyRequest.controller.js";

/**
 * Platform key-request routes — superadmin reviews bank admin requests.
 *
 * approve → creates ApiKey, returns raw key once to superadmin,
 *           stages encrypted raw key for bank admin's one-time reveal.
 * reject  → marks request rejected with optional note.
 */
const router = Router();

const VALID_SCOPES = [
  "branches:read",
  "tickets:write",
  "tickets:read",
  "staff:read",
  "analytics:read",
  "webhooks:manage",
  "admin",
];

router.get("/", listKeyRequests);

router.patch(
  "/:id",
  param("id").isMongoId().withMessage("Invalid request ID"),
  body("action")
    .isIn(["approve", "reject"])
    .withMessage('action must be "approve" or "reject"'),
  body("reviewNote")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Review note must be under 500 characters"),
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
    .withMessage("Rate limit must be between 1 and 10,000"),
  body("label")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Label must be under 200 characters"),
  reviewKeyRequest,
);

export default router;
