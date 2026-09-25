import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import ApiKeyRequest from "../models/apiKeyRequest.model.js";
import ApiKey from "../models/apiKey.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { parsePagination, paginatedResponse } from "../utils/pagination.js";
import { decryptKey } from "../utils/keyWrap.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

/**
 * Bank-admin API key request routes — JWT-authenticated (Phase 13 WP4).
 *
 * Same behavior as the v1 API-key version, but identity comes from the
 * admin's JWT (`req.user`) instead of the API key header. This is the
 * path the dashboard will use once WP6 moves it off v1.
 *
 * bankName is ALWAYS forced from Admin.bank (never from the body).
 *
 * One-time reveal:
 *   GET /api/admin/api-key-requests/:id
 *   If status=approved and bankKeyRevealedAt is null, returns the raw key
 *   (decrypted from the staged ciphertext), wipes ciphertext, and sets
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

/**
 * Live health of the linked ApiKey for the bank admin's status list.
 * - not approved yet → null
 * - approved but ApiKey missing/deleted → "revoked" (superadmin revoke)
 * - ApiKey.isActive false → "suspended"
 * - else → "active"
 */
export const resolveKeyStatus = (request, keyDoc) => {
  if (request.status !== "approved") return null;
  if (!request.apiKey || !keyDoc) return "revoked";
  return keyDoc.isActive ? "active" : "suspended";
};

/**
 * Safe list/detail item — ciphertext is never included in JSON.
 * canRevealKey needs encryptedRawKey present on the in-memory doc
 * (do NOT select it out before this call).
 */
export const mapBankKeyRequest = (r, keyDoc = null) => ({
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
  keyStatus: resolveKeyStatus(r, keyDoc),
  keyPrefix: keyDoc?.keyPrefix || null,
  createdAt: r.createdAt,
});

// Only bank admins may request keys for their bank.
router.use(protect, authorize("admin"));

/**
 * POST /api/admin/api-key-requests
 * Body: { label?, scopes?, rateLimit? }
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

      // Bank scope always comes from the JWT identity (Admin.bank).
      const bankName = req.user.bank;
      if (!bankName) {
        return sendError(res, {
          statusCode: 400,
          message: "Admin has no bank — cannot request API keys",
        });
      }

      // Prevent duplicate pending requests for the same bank.
      const existingPending = await ApiKeyRequest.findOne({
        bankName,
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
        bankName,
        // Admin collection ref (WP1 changed requestedBy → Admin).
        requestedBy: req.user._id,
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
 * GET /api/admin/api-key-requests
 * List this admin's bank requests (metadata only; ciphertext never included).
 *
 * Loads encryptedRawKey only so canRevealKey can be computed, then strips
 * it from the JSON payload. Also joins ApiKey for keyStatus (active /
 * suspended / revoked) so revoke/suspend shows up for the bank admin.
 */
router.get("/", async (req, res, next) => {
  try {
    const bankName = req.user.bank;
    if (!bankName) {
      return sendError(res, {
        statusCode: 400,
        message: "Admin has no bank — cannot list API key requests",
      });
    }

    const { page, limit, skip } = parsePagination(req.query);
    const filter = { bankName };

    const [requests, total] = await Promise.all([
      ApiKeyRequest.find(filter)
        .sort("-createdAt")
        .skip(skip)
        .limit(limit),
      ApiKeyRequest.countDocuments(filter),
    ]);

    // Batch-load linked keys (missing doc → revoked after superadmin delete).
    const keyIds = requests.map((r) => r.apiKey).filter(Boolean);
    const keys = keyIds.length
      ? await ApiKey.find({ _id: { $in: keyIds } })
          .select("keyPrefix isActive")
          .lean()
      : [];
    const keyById = new Map(keys.map((k) => [String(k._id), k]));

    const data = requests.map((r) =>
      mapBankKeyRequest(r, r.apiKey ? keyById.get(String(r.apiKey)) : null),
    );

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
 * GET /api/admin/api-key-requests/:id
 * One-time raw-key reveal for an approved request (bank-scoped by JWT).
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

      const bankName = req.user.bank;
      if (!bankName) {
        return sendError(res, {
          statusCode: 400,
          message: "Admin has no bank — cannot fetch API key requests",
        });
      }

      // Always scope the lookup to this bank — never leak another bank's request.
      // Keep encryptedRawKey on the doc only long enough to attempt reveal;
      // it is stripped from the response payload via mapBankKeyRequest.
      const request = await ApiKeyRequest.findOne({
        _id: req.params.id,
        bankName,
      });

      if (!request) {
        return sendError(res, { statusCode: 404, message: "Request not found" });
      }

      let rawKey = null;
      let justRevealed = false;

      if (request.status === "approved" && !request.bankKeyRevealedAt) {
        if (request.encryptedRawKey) {
          try {
            rawKey = decryptKey(request.encryptedRawKey);
            // Wipe ciphertext permanently after successful decrypt.
            await ApiKeyRequest.updateOne(
              { _id: request._id },
              {
                $set: { bankKeyRevealedAt: new Date() },
                $unset: { encryptedRawKey: 1 },
              },
            );
            justRevealed = true;
            // In-memory wipe so the response mapper can't leak ciphertext.
            request.encryptedRawKey = null;
            request.bankKeyRevealedAt = new Date();
          } catch {
            // Decryption failed (wrong secret / corruption) — don't leak internals.
            rawKey = null;
          }
        }
      }

      let keyDoc = null;
      if (request.apiKey) {
        keyDoc = await ApiKey.findById(request.apiKey)
          .select("keyPrefix isActive")
          .lean();
      }

      const mapped = mapBankKeyRequest(request, keyDoc);

      return sendSuccess(res, {
        statusCode: 200,
        message: justRevealed
          ? "API key revealed — copy it now, it won't be shown again"
          : "API key request fetched",
        data: {
          ...mapped,
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
