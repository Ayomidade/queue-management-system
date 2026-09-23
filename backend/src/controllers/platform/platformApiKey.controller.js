import ApiKey from "../../models/apiKey.model.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { parsePagination, paginatedResponse } from "../../utils/pagination.js";
import { validationResult } from "express-validator";

/**
 * Platform API key controller — superadmin-only key lifecycle.
 *
 * Replaces the old /api/v1/api-keys routes (authorize("admin")) which
 * let ANY bank admin see ALL banks' keys — a multi-tenancy hole.
 *
 * The raw API key is only returned ONCE — at creation or rotation.
 * Bank admins never call these endpoints; they submit ApiKeyRequests instead.
 */

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, {
      statusCode: 400,
      message: "Validation failed",
      errors: errors.array().map((e) => e.msg),
    });
    return false;
  }
  return true;
};

/**
 * POST /api/platform/api-keys
 * Create a key for a bank. Returns raw key ONCE.
 */
export const createApiKey = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;

    const { bankName, label, scopes, rateLimit, expiresAt } = req.body;
    const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();

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
        key: rawKey,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        rateLimit: apiKey.rateLimit,
        isActive: apiKey.isActive,
        requestCount: apiKey.requestCount || 0,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/platform/api-keys
 * List all keys across banks (metadata only, no hash/raw key).
 */
export const listApiKeys = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const filter = {};
    if (req.query.bankName) {
      filter.bankName = { $regex: req.query.bankName, $options: "i" };
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    const [keys, total] = await Promise.all([
      ApiKey.find(filter)
        .select("-keyHash")
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
 * DELETE /api/platform/api-keys/:id
 * Permanently revoke (delete) a key.
 */
export const deleteApiKey = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;

    const key = await ApiKey.findByIdAndDelete(req.params.id);
    if (!key) {
      return sendError(res, { statusCode: 404, message: "API key not found" });
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
 * POST /api/platform/api-keys/:id/rotate
 * Rotate a key: new key generated, old key valid for 24h grace period.
 * Raw key returned ONCE to superadmin only (bank admin does NOT get a
 * rotation reveal — approval-time reveal only).
 */
export const rotateApiKey = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;

    const oldKey = await ApiKey.findById(req.params.id);
    if (!oldKey) {
      return sendError(res, { statusCode: 404, message: "API key not found" });
    }

    const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();

    oldKey.keyHash = keyHash;
    oldKey.keyPrefix = keyPrefix;
    oldKey.gracePeriodEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await oldKey.save();

    return sendSuccess(res, {
      statusCode: 200,
      message:
        "API key rotated. New key shown below. Old key valid for 24 hours.",
      data: {
        id: oldKey._id,
        bankName: oldKey.bankName,
        label: oldKey.label,
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
 * PATCH /api/platform/api-keys/:id/toggle
 * Suspend (disable) or re-enable a key without deleting it.
 */
export const toggleApiKey = async (req, res, next) => {
  try {
    if (!handleValidation(req, res)) return;

    const key = await ApiKey.findByIdAndUpdate(
      req.params.id,
      [{ $set: { isActive: { $not: "$isActive" } } }],
      { returnDocument: "after" },
    ).select("-keyHash");

    if (!key) {
      return sendError(res, { statusCode: 404, message: "API key not found" });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: `API key ${key.isActive ? "enabled" : "suspended"}`,
      data: key,
    });
  } catch (error) {
    next(error);
  }
};
