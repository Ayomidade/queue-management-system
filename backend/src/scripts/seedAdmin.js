import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/user.model.js";

dotenv.config();

const run = async () => {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "System Admin";

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in your .env",
    );
  }

  await connectDB();

  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin) {
    console.log(
      `An admin already exists (${existingAdmin.email}). Nothing to do.`,
    );
    return;
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new Error(
      `A user with email ${email} already exists but isn't an admin. Choose a different SEED_ADMIN_EMAIL.`,
    );
  }

  const admin = await User.create({ name, email, password, role: "admin" });

  console.log("Admin account created:");
  console.log(`  Email: ${admin.email}`);
  console.log(`  Role:  ${admin.role}`);
};

run()
  .catch((error) => {
    console.error("Failed to seed admin:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
