import mongoose from "mongoose";

/**
 * ApiKeyRequest — bank admin's request for an API key for their bank.
 *
 * Flow:
 * 1. Bank admin (admin role, via API-key auth) POSTs a request with
 *    label, scopes, rateLimit. bankName is forced from their API key.
 * 2. Superadmin reviews it on /platform and approves or rejects.
 * 3. On approve: an ApiKey is created, the raw key is returned once to
 *    the superadmin, AND the raw key is AES-256-GCM-encrypted onto this
 *    document so the bank admin can reveal it once from request status.
 * 4. Bank admin's first GET of the approved request returns the raw key,
 *    then ciphertext is wiped permanently (bankKeyRevealedAt set).
 *
 * Rotation reveals are NOT staged here (approval only).
 */
const apiKeyRequestSchema = new mongoose.Schema(
  {
    bankName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    // The bank admin (Admin collection) who submitted the request.
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    label: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },
    scopes: {
      type: [String],
      default: ["branches:read", "tickets:read"],
    },
    rateLimit: {
      type: Number,
      default: 100,
      min: 1,
      max: 10000,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    // The platform superadmin who approved or rejected the request.
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Superadmin",
      default: null,
    },
    reviewNote: {
      type: String,
      default: "",
      maxlength: 500,
    },
    // Set when approved — links to the created ApiKey document.
    apiKey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApiKey",
      default: null,
    },
    // AES-256-GCM ciphertext of the raw key, staged for bank admin's
    // one-time reveal. Wiped after bankKeyRevealedAt is set.
    encryptedRawKey: {
      type: String,
      default: null,
    },
    rawKeyStagedAt: {
      type: Date,
      default: null,
    },
    bankKeyRevealedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Fast lookup of a bank's outstanding requests.
apiKeyRequestSchema.index({ bankName: 1, status: 1, createdAt: -1 });

const ApiKeyRequest = mongoose.model("ApiKeyRequest", apiKeyRequestSchema);
export default ApiKeyRequest;
