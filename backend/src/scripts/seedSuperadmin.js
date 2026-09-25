import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Superadmin from "../models/superadmin.model.js";

dotenv.config();

/**
 * Seeds the platform superadmin account (Superadmin collection).
 *
 * The superadmin is the ONLY persona who logs in with email/password
 * at /platform (JWT with kind="superadmin"). They manage API keys and
 * usage monitoring across all banks — they are not bank-scoped.
 *
 * After the four-model split, bank admins onboard through the protected
 * registration endpoint; they are NOT created by this script.
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

  const existingSuperadmin = await Superadmin.findOne({});
  if (existingSuperadmin) {
    console.log(
      `A superadmin already exists (${existingSuperadmin.email}). Nothing to do.`,
    );
    return;
  }

  const existingEmail = await Superadmin.findOne({ email });
  if (existingEmail) {
    throw new Error(
      `A superadmin with email ${email} already exists. Choose a different SEED_SUPERADMIN_EMAIL.`,
    );
  }

  const superadmin = await Superadmin.create({
    name,
    email,
    password,
  });

  console.log("Superadmin account created:");
  console.log(`  Email: ${superadmin.email}`);
  console.log(`  Kind:  superadmin`);
};

run()
  .catch((error) => {
    console.error("Failed to seed superadmin:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
