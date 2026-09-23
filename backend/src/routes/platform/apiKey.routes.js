import { Router } from "express";
import {
  createApiKey,
  listApiKeys,
  deleteApiKey,
  rotateApiKey,
  toggleApiKey,
} from "../../controllers/platform/platformApiKey.controller.js";
import {
  validateCreateApiKey,
  validateRotateApiKey,
  validateDeleteApiKey,
} from "../../validators/apiKey.validator.js";

/**
 * Platform API key routes — superadmin-only key lifecycle.
 *
 * Replaces the old /api/v1/api-keys routes (authorize("admin")) which
 * exposed ALL banks' keys to any bank admin — a multi-tenancy hole.
 *
 * Bank admins submit ApiKeyRequests instead (see routes/v1/apiKeyRequest.routes.js).
 */
const router = Router();

router.post("/", validateCreateApiKey, createApiKey);
router.get("/", listApiKeys);
router.delete("/:id", validateDeleteApiKey, deleteApiKey);
router.post("/:id/rotate", validateRotateApiKey, rotateApiKey);
router.patch("/:id/toggle", validateDeleteApiKey, toggleApiKey);

export default router;
