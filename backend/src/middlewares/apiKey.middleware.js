import ApiKey from "../models/apiKey.model.js";
import ApiKeyUsage from "../models/apiKeyUsage.model.js";
import { sendError } from "../utils/response.js";
import { usageDateKey } from "../utils/keyWrap.js";

/**
 * API Key Authentication Middleware
 *
 * Authenticates requests using the X-API-Key header.
 * On success, attaches `req.apiKey` (the ApiKey document) and `req.bankName`
 * to the request for downstream controllers to use.
 *
 * Usage:
 *   router.get("/endpoint", authenticateApiKey, requireScope("tickets:read"), handler)
 *
 * The key is looked up by hashing it with bcrypt and comparing against stored hashes.
 * This is intentionally slow (bcrypt) to prevent timing attacks.
 *
 * After authentication, we update `lastUsedAt` fire-and-forget (don't await).
 */

export const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return sendError(res, {
        statusCode: 401,
        message: "API key required. Pass it via the X-API-Key header.",
      });
    }

    // Verify the key against all stored hashes.
    // Returns the matching ApiKey document or null.
    const keyDoc = await ApiKey.verifyKey(apiKey);

    if (!keyDoc) {
      return sendError(res, {
        statusCode: 401,
        message: "Invalid or revoked API key",
      });
    }

    // Check if the key has expired
    if (keyDoc.expiresAt && keyDoc.expiresAt < new Date()) {
      return sendError(res, {
        statusCode: 401,
        message: "API key has expired",
      });
    }

    // Check if the key is active (not disabled)
    if (!keyDoc.isActive) {
      return sendError(res, {
        statusCode: 403,
        message: "API key has been disabled. Contact support.",
      });
    }

    // Attach key info to request for downstream use
    req.apiKey = keyDoc;
    req.bankName = keyDoc.bankName;

    // Update lastUsedAt + usage counters fire-and-forget (non-blocking).
    // We use updateOne instead of save to avoid triggering middleware.
    // Usage tracking:
    //   - ApiKey.requestCount  → lifetime total (cheap $inc)
    //   - ApiKeyUsage          → daily bucket {apiKey, date:"YYYY-MM-DD"} for charts
    const today = usageDateKey();
    ApiKey.updateOne(
      { _id: keyDoc._id },
      {
        $set: { lastUsedAt: new Date() },
        $inc: { requestCount: 1 },
      },
    ).exec().catch(() => {}); // silently ignore errors

    ApiKeyUsage.updateOne(
      { apiKey: keyDoc._id, date: today },
      { $inc: { count: 1 } },
      { upsert: true },
    ).exec().catch(() => {});

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require Scope Middleware
 *
 * Checks that the authenticated API key includes the specified permission scope.
 * Must be used AFTER authenticateApiKey middleware.
 *
 * Usage:
 *   router.post("/tickets", authenticateApiKey, requireScope("tickets:write"), handler)
 *
 * The "admin" scope grants access to everything, so it bypasses scope checks.
 */

export const requireScope = (...requiredScopes) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return sendError(res, {
        statusCode: 401,
        message: "Authentication required before scope check",
      });
    }

    const keyScopes = req.apiKey.scopes || [];

    // Admin scope grants full access — skip individual scope checks
    if (keyScopes.includes("admin")) {
      return next();
    }

    // Check if the key has ALL required scopes
    const hasAllScopes = requiredScopes.every((scope) =>
      keyScopes.includes(scope),
    );

    if (!hasAllScopes) {
      return sendError(res, {
        statusCode: 403,
        message: `Missing required scope(s): ${requiredScopes.join(", ")}. Your key has: ${keyScopes.join(", ") || "none"}`,
      });
    }

    next();
  };
};

/**
 * API Key Rate Limiter
 *
 * Rate limits based on API key identity (not IP). This is more appropriate
 * for a multi-tenant API because:
 * - Multiple banks may share the same IP (e.g., behind a proxy)
 * - Each bank's key should have its own rate limit
 * - IP-based limiting doesn't work for server-to-server calls
 *
 * The rate limit is stored in-memory per key. For production, consider
 * Redis-backed rate limiting for multi-instance deployments.
 *
 * Usage:
 *   router.get("/endpoint", authenticateApiKey, apiKeyRateLimit, handler)
 */

// In-memory store for rate limit counters.
// Key: ApiKey._id, Value: { count, resetAt }
// Resets every minute (sliding window).
const rateLimitStore = new Map();

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [keyId, entry] of rateLimitStore) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(keyId);
    }
  }
}, 5 * 60 * 1000);

export const apiKeyRateLimit = (req, res, next) => {
  if (!req.apiKey) {
    return sendError(res, {
      statusCode: 401,
      message: "Authentication required before rate limit check",
    });
  }

  const keyId = req.apiKey._id.toString();
  const maxRequests = req.apiKey.rateLimit || 100;
  const windowMs = 60 * 1000; // 1 minute window

  const now = Date.now();
  const entry = rateLimitStore.get(keyId);

  if (!entry || entry.resetAt <= now) {
    // New window — start counting
    rateLimitStore.set(keyId, { count: 1, resetAt: now + windowMs });
  } else {
    // Existing window — increment count
    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

      return sendError(res, {
        statusCode: 429,
        message: `Rate limit exceeded. Max ${maxRequests} requests per minute. Try again in ${retryAfter}s.`,
      });
    }
  }

  // Add rate limit headers to response
  const remaining = maxRequests - (rateLimitStore.get(keyId)?.count || 0);
  res.setHeader("X-RateLimit-Limit", maxRequests);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, remaining));
  res.setHeader("X-RateLimit-Reset", Math.ceil((rateLimitStore.get(keyId)?.resetAt || now + windowMs) / 1000));

  next();
};
