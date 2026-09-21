import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * ApiKey Model
 *
 * Represents an API key issued to a bank/partner for integrating with Cue.
 * Each key is tied to a bank (tenant) and carries scoped permissions.
 *
 * The raw key is only shown once at creation time (or rotation).
 * What's stored in the DB is a bcrypt hash of the key, similar to
 * how passwords are stored — so even a DB leak doesn't expose raw keys.
 *
 * Key format: `cue_<48 random hex chars>` (96 chars total)
 * Example:    `cue_a1b2c3d4e5f6...`
 */

// Allowed permission scopes for API keys.
// A key can have multiple scopes depending on what the bank needs.
const VALID_SCOPES = [
  "branches:read", // Read branch info, queues, counters, board data
  "tickets:write", // Create/cancel tickets (kiosk, appointment, customer)
  "tickets:read", // Read ticket status, position, ETA
  "staff:read", // Read staff list
  "analytics:read", // Read analytics, reports
  "webhooks:manage", // Create/delete/toggle webhooks
  "admin", // Full access (system management)
];

const apiKeySchema = new mongoose.Schema(
  {
    // The bank/partner this key belongs to. Used for multi-tenant data isolation.
    bankName: {
      type: String,
      required: [true, "Bank name is required"],
      trim: true,
      index: true,
    },

    // Human-readable label to identify what this key is for.
    // e.g., "Production Backend", "Kiosk Tablet #3", "Lobby Display"
    label: {
      type: String,
      trim: true,
      default: "",
    },

    // Bcrypt hash of the raw API key. The raw key is only shown once.
    keyHash: {
      type: String,
      required: true,
      unique: true,
    },

    // The last 8 characters of the raw key, stored in plaintext.
    // Used to help admins identify which key is which (e.g., "key ends in ...a1b2c3d4").
    keyPrefix: {
      type: String,
      required: true,
    },

    // Permission scopes this key grants. Checked by requireScope middleware.
    scopes: {
      type: [String],
      enum: VALID_SCOPES,
      default: ["branches:read", "tickets:read"],
      validate: {
        validator: (scopes) => scopes.every((s) => VALID_SCOPES.includes(s)),
        message: "Invalid scope(s) provided",
      },
    },

    // Rate limit: max requests per minute for this key.
    // Banks can request higher limits for high-traffic integrations.
    rateLimit: {
      type: Number,
      default: 100, // 100 requests per minute by default
      min: [1, "Rate limit must be at least 1"],
      max: [10000, "Rate limit cannot exceed 10,000 per minute"],
    },

    // Whether this key is currently active. Disabled keys are rejected immediately.
    isActive: {
      type: Boolean,
      default: true,
    },

    defaultStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    // Timestamp of the last time this key was used to make a request.
    // Updated by the authenticateApiKey middleware.
    lastUsedAt: {
      type: Date,
      default: null,
    },

    // Optional expiration date. If set, the key is rejected after this date.
    // null means the key never expires.
    expiresAt: {
      type: Date,
      default: null,
    },

    // For key rotation: when a key is rotated, the old key stays valid
    // until `gracePeriodEndsAt` passes. This lets banks migrate without downtime.
    gracePeriodEndsAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  },
);

// Index for fast lookup by key hash during authentication.
// Also a compound index on bankName for tenant-scoped queries.
apiKeySchema.index({ bankName: 1, isActive: 1 });

/**
 * Generate a new raw API key and its hash.
 * Returns { rawKey, keyHash, keyPrefix }.
 *
 * The raw key is what gets sent to the admin once.
 * The hash is what gets stored in the DB.
 * The prefix (last 8 chars) helps admins identify keys.
 */
apiKeySchema.statics.generateKey = async function () {
  // Generate a random 48-byte hex string (96 chars)
  const rawKey = `cue_${crypto.randomBytes(48).toString("hex")}`;
  const keyHash = await bcrypt.hash(rawKey, 12); // 12 salt rounds for API keys
  const keyPrefix = rawKey.slice(-8); // last 8 chars for display

  return { rawKey, keyHash, keyPrefix };
};

/**
 * Verify a raw API key against a stored hash.
 * Returns the matching ApiKey document or null.
 *
 * This is called by the authenticateApiKey middleware.
 * We use a linear scan because:
 * 1. The number of active API keys per deployment is small (tens, not millions)
 * 2. bcrypt.compare is the bottleneck, not the query
 * 3. We need to check grace period keys too
 */
apiKeySchema.statics.verifyKey = async function (rawKey) {
  // Find all potentially valid keys (active, or in grace period)
  const candidates = await this.find({
    $or: [{ isActive: true }, { gracePeriodEndsAt: { $gt: new Date() } }],
  }).select("+keyHash");

  // Check each candidate until we find a match
  for (const candidate of candidates) {
    const isMatch = await bcrypt.compare(rawKey, candidate.keyHash);
    if (isMatch) {
      return candidate;
    }
  }

  return null;
};

const ApiKey = mongoose.model("ApiKey", apiKeySchema);
export default ApiKey;
