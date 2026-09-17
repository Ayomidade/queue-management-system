import ApiKey from "../models/apiKey.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { parsePagination, paginatedResponse } from "../utils/pagination.js";
import { validationResult } from "express-validator";

/**
 * API Key Controller
 *
 * Handles CRUD operations for API keys. All endpoints here require
 * admin authentication (JWT-based, since this is system management).
 *
 * Important: The raw API key is only returned ONCE — at creation or rotation.
 * After that, only the hash is stored. Admins must copy it immediately.
 */

/**
 * POST /api/v1/api-keys
 *
 * Create a new API key for a bank/partner.
 * Returns the raw key ONCE — it cannot be retrieved again.
 *
 * The raw key format: `cue_<96 hex chars>`
 * Example: `cue_a1b2c3d4e5f6...`
 */
export const createApiKey = async (req, res, next) => {
  try {
    // Check for validation errors from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, {
        statusCode: 400,
        message: "Validation failed",
        errors: errors.array().map((e) => e.msg),
      });
    }

    const { bankName, label, scopes, rateLimit, expiresAt } = req.body;

    // Generate a new random API key and its bcrypt hash
    const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();

    // Create the key document in the database
    const apiKey = await ApiKey.create({
      bankName,
      label: label || "",
      keyHash,
      keyPrefix,
      scopes: scopes || ["branches:read", "tickets:read"],
      rateLimit: rateLimit || 100,
      expiresAt: expiresAt || null,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "API key created. Copy it now — it won't be shown again.",
      data: {
        id: apiKey._id,
        bankName: apiKey.bankName,
        label: apiKey.label,
        // The raw key is returned ONLY here. Store it securely.
        key: rawKey,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        rateLimit: apiKey.rateLimit,
        isActive: apiKey.isActive,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/api-keys
 *
 * List all API keys. Supports pagination and filtering by bank name.
 * Returns key metadata WITHOUT the hash or raw key.
 * Only the last 8 characters (keyPrefix) are shown for identification.
 */
export const listApiKeys = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    // Build filter from query params
    const filter = {};
    if (req.query.bankName) {
      filter.bankName = { $regex: req.query.bankName, $options: "i" };
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    const [keys, total] = await Promise.all([
      ApiKey.find(filter)
        .select("-keyHash") // Never expose the hash
        .sort("-createdAt")
        .skip(skip)
        .limit(limit),
      ApiKey.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      statusCode: 200,
      message: "API keys fetched",
      data: paginatedResponse(keys, total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/api-keys/:id
 *
 * Permanently revoke (delete) an API key.
 * The key immediately stops working for all requests.
 */
export const deleteApiKey = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, {
        statusCode: 400,
        message: "Validation failed",
        errors: errors.array().map((e) => e.msg),
      });
    }

    const key = await ApiKey.findByIdAndDelete(req.params.id);

    if (!key) {
      return sendError(res, {
        statusCode: 404,
        message: "API key not found",
      });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: `API key for "${key.bankName}" has been permanently revoked`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/api-keys/:id/rotate
 *
 * Rotate an API key: generate a new key and set a 24-hour grace period
 * on the old key. This allows banks to migrate without downtime.
 *
 * Flow:
 * 1. New key is generated and stored
 * 2. Old key gets a 24h grace period (still works temporarily)
 * 3. After 24h, the old key stops working
 *
 * Returns both the new raw key and info about the old key's grace period.
 */
export const rotateApiKey = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, {
        statusCode: 400,
        message: "Validation failed",
        errors: errors.array().map((e) => e.msg),
      });
    }

    const oldKey = await ApiKey.findById(req.params.id);

    if (!oldKey) {
      return sendError(res, {
        statusCode: 404,
        message: "API key not found",
      });
    }

    // Generate a new key
    const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();

    // Update the existing document with the new key hash
    // and set a 24-hour grace period for the old key
    oldKey.keyHash = keyHash;
    oldKey.keyPrefix = keyPrefix;
    oldKey.gracePeriodEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await oldKey.save();

    return sendSuccess(res, {
      statusCode: 200,
      message: "API key rotated. New key shown below. Old key valid for 24 hours.",
      data: {
        id: oldKey._id,
        bankName: oldKey.bankName,
        label: oldKey.label,
        // The new raw key — copy it now, it won't be shown again
        key: rawKey,
        keyPrefix: oldKey.keyPrefix,
        oldKeyValidUntil: oldKey.gracePeriodEndsAt,
        scopes: oldKey.scopes,
        rateLimit: oldKey.rateLimit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/api-keys/:id/toggle
 *
 * Enable or disable an API key without deleting it.
 * Useful for temporarily suspending a bank's access.
 */
export const toggleApiKey = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, {
        statusCode: 400,
        message: "Validation failed",
        errors: errors.array().map((e) => e.msg),
      });
    }

    const key = await ApiKey.findByIdAndUpdate(
      req.params.id,
      [{ $set: { isActive: { $not: "$isActive" } } }],
      { returnDocument: "after" },
    ).select("-keyHash");

    if (!key) {
      return sendError(res, {
        statusCode: 404,
        message: "API key not found",
      });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: `API key ${key.isActive ? "enabled" : "disabled"}`,
      data: key,
    });
  } catch (error) {
    next(error);
  }
};
