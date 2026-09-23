import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Admin from "../models/admin.model.js";

dotenv.config();

/**
 * Seeds a bank admin into the Admin collection.
 *
 * NOTE: In the real product, bank admins self-register via
 * POST /api/auth/register/admin (WP3). This script remains only for
 * local development convenience.
 *
 * Required env vars:
 *   SEED_ADMIN_EMAIL
 *   SEED_ADMIN_PASSWORD
 *   SEED_ADMIN_BANK   (tenant this admin belongs to)
 * Optional:
 *   SEED_ADMIN_NAME (default "System Admin")
 */
const run = async () => {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const bank = process.env.SEED_ADMIN_BANK;
  const name = process.env.SEED_ADMIN_NAME || "System Admin";

  if (!email || !password || !bank) {
    throw new Error(
      "SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, and SEED_ADMIN_BANK must be set in your .env",
    );
  }

  await connectDB();

  const existingAdmin = await Admin.findOne({});
  if (existingAdmin) {
    console.log(
      `An admin already exists (${existingAdmin.email}). Nothing to do.`,
    );
    return;
  }

  const existingEmail = await Admin.findOne({ email });
  if (existingEmail) {
    throw new Error(
      `An admin with email ${email} already exists. Choose a different SEED_ADMIN_EMAIL.`,
    );
  }

  const admin = await Admin.create({
    name,
    email,
    password,
    bank,
  });

  console.log("Admin account created:");
  console.log(`  Email: ${admin.email}`);
  console.log(`  Bank:  ${admin.bank}`);
};

run()
  .catch((error) => {
    console.error("Failed to seed admin:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
