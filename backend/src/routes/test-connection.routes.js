import { Router } from "express";
import { authenticateApiKey } from "../middlewares/apiKey.middleware.js";

const router = Router();

/**
 * GET /api/test-connection
 * Validate an API key without rate limiting or bank scoping.
 * Returns key basic info so the caller can verify it's working.
 */
router.get("/", async (req, res) => {
  try {
    // authenticateApiKey already attached req.apiKey and req.bankName
    // or sent a 401/403 already; if we get here the key is valid.
    const key = req.apiKey;
    return res.json({
      statusCode: 200,
      message: "API key is valid",
      data: {
        bankName: key.bankName,
        keyPrefix: key.keyPrefix,
        scopes: key.scopes,
        rateLimit: key.rateLimit,
        isActive: key.isActive,
        createdAt: key.createdAt,
      },
    });
  } catch (error) {
    // authenticateApiKey sends its own error; this is a safety net.
    return res.status(500).json({
      statusCode: 500,
      message: "Internal error during key validation",
    });
  }
});

export default router;