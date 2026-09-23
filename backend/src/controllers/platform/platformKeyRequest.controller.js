import ApiKey from "../../models/apiKey.model.js";
import ApiKeyRequest from "../../models/apiKeyRequest.model.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { parsePagination, paginatedResponse } from "../../utils/pagination.js";
import { encryptKey } from "../../utils/keyWrap.js";
import { validationResult } from "express-validator";

/**
 * Platform key-request controller — superadmin reviews bank admin
 * API key requests: approve (creates key + stages encrypted raw key)
 * or reject.
 *
 * Dual reveal on approve:
 * 1. Raw key returned ONCE to superadmin in this response.
 * 2. Raw key AES-256-GCM-encrypted onto the request doc so the bank
 *    admin can reveal it once from their request status (WP4).
 */

/**
 * GET /api/platform/key-requests?status=pending&page=1
 * List bank admin key requests, optionally filtered by status.
 */
export const listKeyRequests = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const filter = {};
    if (req.query.status && ["pending", "approved", "rejected"].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.bankName) {
      filter.bankName = { $regex: req.query.bankName, $options: "i" };
    }

    const [requests, total] = await Promise.all([
      ApiKeyRequest.find(filter)
        .select("-encryptedRawKey") // never leak ciphertext in list view
        .populate("requestedBy", "name email")
        .populate("reviewedBy", "name email")
        .sort("-createdAt")
        .skip(skip)
        .limit(limit),
      ApiKeyRequest.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      statusCode: 200,
      message: "Key requests fetched",
      data: paginatedResponse(requests, total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/platform/key-requests/:id
 * Body: { action: "approve" | "reject", reviewNote?, scopes?, rateLimit?, label? }
 *
 * approve:
 *  - Creates an ApiKey from the request (superadmin may override scopes/rateLimit/label)
 *  - Encrypts raw key onto request for bank admin's one-time reveal
 *  - Returns raw key ONCE to superadmin
 *
 * reject:
 *  - Marks request rejected with optional note
 */
export const reviewKeyRequest = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, {
        statusCode: 400,
        message: "Validation failed",
        errors: errors.array().map((e) => e.msg),
      });
    }

    const { action, reviewNote, scopes, rateLimit, label } = req.body;

    const request = await ApiKeyRequest.findById(req.params.id);
    if (!request) {
      return sendError(res, { statusCode: 404, message: "Key request not found" });
    }
    if (request.status !== "pending") {
      return sendError(res, {
        statusCode: 400,
        message: `Request already ${request.status}`,
      });
    }

    if (action === "reject") {
      request.status = "rejected";
      request.reviewedBy = req.user._id;
      request.reviewNote = reviewNote || "";
      await request.save();

      return sendSuccess(res, {
        statusCode: 200,
        message: "Key request rejected",
        data: {
          id: request._id,
          status: request.status,
          reviewNote: request.reviewNote,
        },
      });
    }

    if (action !== "approve") {
      return sendError(res, {
        statusCode: 400,
        message: 'action must be "approve" or "reject"',
      });
    }

    // Approve: create the actual ApiKey.
    const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();
    const finalScopes = scopes?.length ? scopes : request.scopes;
    const finalRateLimit = rateLimit || request.rateLimit;
    const finalLabel = label || request.label;

    const apiKey = await ApiKey.create({
      bankName: request.bankName,
      label: finalLabel,
      keyHash,
      keyPrefix,
      scopes: finalScopes,
      rateLimit: finalRateLimit,
      expiresAt: null,
    });

    // Stage encrypted raw key for the bank admin's one-time reveal.
    request.status = "approved";
    request.reviewedBy = req.user._id;
    request.reviewNote = reviewNote || "";
    request.apiKey = apiKey._id;
    request.scopes = finalScopes;
    request.rateLimit = finalRateLimit;
    request.label = finalLabel;
    request.encryptedRawKey = encryptKey(rawKey);
    request.rawKeyStagedAt = new Date();
    await request.save();

    return sendSuccess(res, {
      statusCode: 200,
      message:
        "Key request approved. Copy the raw key now — it won't be shown again to you.",
      data: {
        id: request._id,
        status: request.status,
        bankName: request.bankName,
        apiKey: {
          id: apiKey._id,
          keyPrefix: apiKey.keyPrefix,
          scopes: apiKey.scopes,
          rateLimit: apiKey.rateLimit,
        },
        // Raw key ONCE to superadmin.
        key: rawKey,
      },
    });
  } catch (error) {
    next(error);
  }
};
