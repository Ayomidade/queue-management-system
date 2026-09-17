import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import ApiKey from "../models/apiKey.model.js";

/**
 * Seed Script: Create Default Admin API Key
 *
 * Creates a system-wide admin API key with full permissions.
 * This key is used for system management and should be stored securely.
 *
 * Usage:
 *   npm run seed:apikey
 *
 * Environment variables:
 *   SEED_API_KEY_BANK_NAME  - Bank name for the key (default: "System Admin")
 *   SEED_API_KEY_LABEL      - Label for the key (default: "System Admin Key")
 *   SEED_API_KEY_RATE_LIMIT - Rate limit per minute (default: 1000)
 */

dotenv.config();

const run = async () => {
  const bankName = process.env.SEED_API_KEY_BANK_NAME || "System Admin";
  const label = process.env.SEED_API_KEY_LABEL || "System Admin Key";
  const rateLimit = parseInt(process.env.SEED_API_KEY_RATE_LIMIT, 10) || 1000;

  await connectDB();

  // Check if a system admin key already exists
  const existing = await ApiKey.findOne({ bankName, label });
  if (existing) {
    console.log(`API key "${label}" for "${bankName}" already exists. Nothing to do.`);
    return;
  }

  // Generate a new API key
  const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();

  // Create the key with full admin permissions
  const apiKey = await ApiKey.create({
    bankName,
    label,
    keyHash,
    keyPrefix,
    scopes: ["admin"], // Full system access
    rateLimit,
    isActive: true,
  });

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Admin API Key Created Successfully");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Bank:       ${apiKey.bankName}`);
  console.log(`  Label:      ${apiKey.label}`);
  console.log(`  Key ID:     ${apiKey._id}`);
  console.log(`  Scopes:     ${apiKey.scopes.join(", ")}`);
  console.log(`  Rate Limit: ${apiKey.rateLimit} requests/minute`);
  console.log("");
  console.log("  YOUR API KEY (copy it now, it won't be shown again):");
  console.log(`  ${rawKey}`);
  console.log("");
  console.log("  Use this key in the X-API-Key header:");
  console.log(`  X-API-Key: ${rawKey}`);
  console.log("═══════════════════════════════════════════════════\n");
};

run()
  .catch((error) => {
    console.error("Failed to seed API key:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
