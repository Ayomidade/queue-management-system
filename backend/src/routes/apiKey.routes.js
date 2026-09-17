import { Router } from "express";
import {
  createApiKey,
  listApiKeys,
  deleteApiKey,
  rotateApiKey,
  toggleApiKey,
} from "../controllers/apiKey.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import {
  validateCreateApiKey,
  validateRotateApiKey,
  validateDeleteApiKey,
} from "../validators/apiKey.validator.js";

/**
 * API Key Routes
 *
 * These routes manage API keys for bank/partner integrations.
 * All routes require admin authentication (JWT-based).
 *
 * The raw API key is only returned once — at creation or rotation.
 * Admins must copy it immediately; it cannot be retrieved later.
 *
 * Routes:
 *   POST   /api/v1/api-keys          - Create a new API key
 *   GET    /api/v1/api-keys          - List all API keys
 *   DELETE /api/v1/api-keys/:id      - Revoke (delete) an API key
 *   POST   /api/v1/api-keys/:id/rotate - Rotate an API key
 *   PATCH  /api/v1/api-keys/:id/toggle - Enable/disable an API key
 */

const apiKeyRouter = Router();

// All API key management routes require admin authentication
apiKeyRouter.use(protect);
apiKeyRouter.use(authorize("admin"));

// Create a new API key for a bank/partner
// Returns the raw key ONCE — it won't be shown again
apiKeyRouter.post("/", validateCreateApiKey, createApiKey);

// List all API keys (paginated, filterable by bank name and status)
// Returns metadata only — no raw key or hash
apiKeyRouter.get("/", listApiKeys);

// Permanently revoke (delete) an API key
// The key stops working immediately
apiKeyRouter.delete("/:id", validateDeleteApiKey, deleteApiKey);

// Rotate an API key: generate new key, old key valid for 24h
// Returns the new raw key ONCE
apiKeyRouter.post("/:id/rotate", validateRotateApiKey, rotateApiKey);

// Enable/disable an API key without deleting it
// Useful for temporarily suspending access
apiKeyRouter.patch("/:id/toggle", validateDeleteApiKey, toggleApiKey);

export default apiKeyRouter;
