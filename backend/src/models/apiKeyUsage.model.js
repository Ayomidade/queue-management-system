import mongoose from "mongoose";

/**
 * ApiKeyUsage — daily request-count buckets per API key.
 *
 * One document per (apiKey, date) pair. The authenticateApiKey middleware
 * fire-and-forget $inc-upserts on every authenticated request, giving us
 * cheap "requests today / last N days" charts without per-request log rows.
 *
 * date is stored as "YYYY-MM-DD" (UTC) for simple string grouping.
 */
const apiKeyUsageSchema = new mongoose.Schema(
  {
    apiKey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApiKey",
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

// One bucket per key per day — enables atomic $inc + upsert.
apiKeyUsageSchema.index({ apiKey: 1, date: 1 }, { unique: true });

// Old buckets aren't needed forever; TTL as a safety net (365 days).
apiKeyUsageSchema.index({ date: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const ApiKeyUsage = mongoose.model("ApiKeyUsage", apiKeyUsageSchema);
export default ApiKeyUsage;
