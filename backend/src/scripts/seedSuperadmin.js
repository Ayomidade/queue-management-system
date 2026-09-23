import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Staff from "../models/staff.model.js";

dotenv.config();

/**
 * Seeds the platform superadmin account.
 *
 * The superadmin is the ONLY persona who logs in with email/password
 * (JWT) for the /platform console. They manage API keys and usage
 * monitoring across all banks — they are not bank-scoped.
 *
 * Required env vars:
 *   SEED_SUPERADMIN_EMAIL
 *   SEED_SUPERADMIN_PASSWORD
 * Optional:
 *   SEED_SUPERADMIN_NAME (default "Platform Superadmin")
 */
const run = async () => {
  const email = process.env.SEED_SUPERADMIN_EMAIL;
  const password = process.env.SEED_SUPERADMIN_PASSWORD;
  const name = process.env.SEED_SUPERADMIN_NAME || "Platform Superadmin";

  if (!email || !password) {
    throw new Error(
      "SEED_SUPERADMIN_EMAIL and SEED_SUPERADMIN_PASSWORD must be set in your .env",
    );
  }

  await connectDB();

  const existingSuperadmin = await Staff.findOne({ role: "superadmin" });
  if (existingSuperadmin) {
    console.log(
      `A superadmin already exists (${existingSuperadmin.email}). Nothing to do.`,
    );
    return;
  }

  const existingEmail = await Staff.findOne({ email });
  if (existingEmail) {
    throw new Error(
      `A staff member with email ${email} already exists but isn't a superadmin. Choose a different SEED_SUPERADMIN_EMAIL.`,
    );
  }

  const superadmin = await Staff.create({
    name,
    email,
    password,
    role: "superadmin",
  });

  console.log("Superadmin account created:");
  console.log(`  Email: ${superadmin.email}`);
  console.log(`  Role:  ${superadmin.role}`);
};

run()
  .catch((error) => {
    console.error("Failed to seed superadmin:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
