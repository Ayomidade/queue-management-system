import { Router } from "express";
import { body, param } from "express-validator";
import { validationResult } from "express-validator";
import ApiKeyRequest from "../../models/apiKeyRequest.model.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { parsePagination, paginatedResponse } from "../../utils/pagination.js";
import { decryptKey } from "../../utils/keyWrap.js";
import { authorize } from "../../middlewares/auth.middleware.js";

/**
 * Bank admin API key request routes (v1, API-key authenticated).
 *
 * Bank admins cannot create/list/revoke keys directly (that's superadmin-
 * only on /api/platform). Instead they submit a request for their own bank;
 * the superadmin approves or rejects it on the platform dashboard.
 *
 * bankName is ALWAYS taken from the authenticated API key (req.bankName),
 * never from the request body — a bank cannot request keys for another bank.
 *
 * One-time reveal:
 *   GET /api/v1/api-key-requests/:id
 *   If status=approved and bankKeyRevealedAt is null, returns the raw key
 *   (decrypted from the staged ciphertext), wipes the ciphertext, and sets
 *   bankKeyRevealedAt. Subsequent GETs return metadata only (no raw key).
 */
const router = Router();

const BANK_REQUESTABLE_SCOPES = [
  "branches:read",
  "tickets:read",
  "tickets:write",
  "staff:read",
  "analytics:read",
  "webhooks:manage",
  // "admin" is reserved for superadmin-created keys only.
];

// Only bank admins may request keys for their bank.
router.use(authorize("admin"));

/**
 * POST /api/v1/api-key-requests
 * Body: { label?, scopes?, rateLimit? }
 * Creates a pending request scoped to the API key's bank.
 */
router.post(
  "/",
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
      const invalid = scopes.filter((s) => !BANK_REQUESTABLE_SCOPES.includes(s));
      if (invalid.length > 0) {
        throw new Error(
          `Scope(s) not requestable by bank admin: ${invalid.join(", ")}`,
        );
      }
      return true;
    }),
  body("rateLimit")
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage("Rate limit must be between 1 and 10,000"),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, {
          statusCode: 400,
          message: "Validation failed",
          errors: errors.array().map((e) => e.msg),
        });
      }

      if (!req.bankName) {
        return sendError(res, {
          statusCode: 400,
          message: "Bank context missing — API key has no bankName",
        });
      }

      // Prevent duplicate pending requests for the same bank.
      const existingPending = await ApiKeyRequest.findOne({
        bankName: req.bankName,
        status: "pending",
      });
      if (existingPending) {
        return sendError(res, {
          statusCode: 409,
          message: "You already have a pending API key request",
        });
      }

      const { label, scopes, rateLimit } = req.body;

      const request = await ApiKeyRequest.create({
        bankName: req.bankName,
        requestedBy: req.user?._id || req.user?.id,
        label: label || "",
        scopes: scopes?.length
          ? scopes
          : ["branches:read", "tickets:read", "tickets:write"],
        rateLimit: rateLimit || 100,
        status: "pending",
      });

      return sendSuccess(res, {
        statusCode: 201,
        message: "API key request submitted for superadmin review",
        data: {
          id: request._id,
          bankName: request.bankName,
          label: request.label,
          scopes: request.scopes,
          rateLimit: request.rateLimit,
          status: request.status,
          createdAt: request.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/api-key-requests
 * List this bank's requests (metadata only; ciphertext never included).
 */
router.get("/", async (req, res, next) => {
  try {
    if (!req.bankName) {
      return sendError(res, {
        statusCode: 400,
        message: "Bank context missing — API key has no bankName",
      });
    }

    const { page, limit, skip } = parsePagination(req.query);
    const filter = { bankName: req.bankName };

    const [requests, total] = await Promise.all([
      ApiKeyRequest.find(filter)
        .select("-encryptedRawKey")
        .sort("-createdAt")
        .skip(skip)
        .limit(limit),
      ApiKeyRequest.countDocuments(filter),
    ]);

    // Surface whether a reveal is still available (approved but not yet shown).
    const data = requests.map((r) => ({
      id: r._id,
      bankName: r.bankName,
      label: r.label,
      scopes: r.scopes,
      rateLimit: r.rateLimit,
      status: r.status,
      reviewNote: r.reviewNote,
      apiKey: r.apiKey,
      canRevealKey:
        r.status === "approved" &&
        !!r.encryptedRawKey &&
        !r.bankKeyRevealedAt,
      revealedAt: r.bankKeyRevealedAt,
      createdAt: r.createdAt,
    }));

    return sendSuccess(res, {
      statusCode: 200,
      message: "API key requests fetched",
      data: paginatedResponse(data, total, page, limit),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/api-key-requests/:id
 * One-time raw-key reveal for an approved request.
 *
 * First call (approved + ciphertext present + not yet revealed):
 *   → decrypts, returns raw key, wipes ciphertext, sets bankKeyRevealedAt
 * Subsequent calls:
 *   → returns metadata only (rawKey: null)
 */
router.get(
  "/:id",
  param("id").isMongoId().withMessage("Invalid request ID"),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, {
          statusCode: 400,
          message: "Validation failed",
          errors: errors.array().map((e) => e.msg),
        });
      }

      if (!req.bankName) {
        return sendError(res, {
          statusCode: 400,
          message: "Bank context missing — API key has no bankName",
        });
      }

      // Always scope the lookup to this bank — never leak another bank's request.
      const request = await ApiKeyRequest.findOne({
        _id: req.params.id,
        bankName: req.bankName,
      }).select("-encryptedRawKey");

      if (!request) {
        return sendError(res, { statusCode: 404, message: "Request not found" });
      }

      let rawKey = null;
      let justRevealed = false;

      // Fetch ciphertext separately only if we might reveal it.
      if (
        request.status === "approved" &&
        !request.bankKeyRevealedAt
      ) {
        const full = await ApiKeyRequest.findById(request._id).select(
          "encryptedRawKey",
        );
        if (full?.encryptedRawKey) {
          try {
            rawKey = decryptKey(full.encryptedRawKey);
            // Wipe ciphertext permanently after successful decrypt.
            await ApiKeyRequest.updateOne(
              { _id: request._id },
              {
                $set: { bankKeyRevealedAt: new Date() },
                $unset: { encryptedRawKey: 1 },
              },
            );
            justRevealed = true;
          } catch {
            // Decryption failed (wrong secret / corruption) — don't leak internals.
            rawKey = null;
          }
        }
      }

      return sendSuccess(res, {
        statusCode: 200,
        message: justRevealed
          ? "API key revealed — copy it now, it won't be shown again"
          : "API key request fetched",
        data: {
          id: request._id,
          bankName: request.bankName,
          label: request.label,
          scopes: request.scopes,
          rateLimit: request.rateLimit,
          status: request.status,
          reviewNote: request.reviewNote,
          apiKey: request.apiKey,
          revealedAt: request.bankKeyRevealedAt,
          // Raw key only on the one-time reveal; null afterwards.
          key: rawKey,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
