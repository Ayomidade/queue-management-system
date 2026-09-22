import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Staff from "../models/staff.model.js";
import Branch from "../models/branch.model.js";
import Queue from "../models/queue.model.js";
import Counter from "../models/counter.model.js";
import ApiKey from "../models/apiKey.model.js";

dotenv.config();

/* -------------------------------------------------- *
 *  Default values — override via env vars if needed   *
 * -------------------------------------------------- */
const SEED = {
  // Bank (used for multi-tenant isolation on branches + API keys)
  bankName: process.env.SEED_BANK_NAME || "Cue Demo",

  // Branch
  branchName: process.env.SEED_BRANCH_NAME || "Main Branch",
  branchLocation: process.env.SEED_BRANCH_LOCATION || "Downtown",

  // Queues
  queue1: process.env.SEED_QUEUE_1 || "General Service",
  queue2: process.env.SEED_QUEUE_2 || "Priority Service",

  // Counters
  counter1: process.env.SEED_COUNTER_1 || "Counter 1",
  counter2: process.env.SEED_COUNTER_2 || "Counter 2",

  // Admin
  adminName: process.env.SEED_ADMIN_NAME || "System Admin",
  adminEmail: process.env.SEED_ADMIN_EMAIL || "admin@queue.com",
  adminPassword: process.env.SEED_ADMIN_PASSWORD || "Admin@1234",

  // Manager
  managerName: process.env.SEED_MANAGER_NAME || "Branch Manager",
  managerEmail: process.env.SEED_MANAGER_EMAIL || "manager@queue.com",
  managerPassword: process.env.SEED_MANAGER_PASSWORD || "Manager@1234",

  // Staff
  staffName: process.env.SEED_STAFF_NAME || "Front Desk Staff",
  staffEmail: process.env.SEED_STAFF_EMAIL || "staff@queue.com",
  staffPassword: process.env.SEED_STAFF_PASSWORD || "Staff@1234",
};

const log = (label, value) => console.log(`  ${label}: ${value}`);

const run = async () => {
  await connectDB();
  console.log("\n🌱  Seeding database…\n");

  /* ------ Branch ------ */
  let branch = await Branch.findOne({ name: SEED.branchName, bank: SEED.bankName });
  if (!branch) {
    branch = await Branch.create({
      name: SEED.branchName,
      location: SEED.branchLocation,
      bank: SEED.bankName,
    });
    console.log("✅  Branch created:");
    log("Name", branch.name);
    log("Location", branch.location);
    log("Bank", SEED.bankName);
  } else {
    console.log(`ℹ️   Branch "${branch.name}" already exists — skipping.`);
  }

  /* ------ Queues ------ */
  const queueNames = [SEED.queue1, SEED.queue2];
  const queues = [];
  for (const name of queueNames) {
    let queue = await Queue.findOne({ branch: branch._id, serviceName: name });
    if (!queue) {
      queue = await Queue.create({ branch: branch._id, serviceName: name });
      console.log(`✅  Queue created: ${queue.serviceName}`);
    } else {
      console.log(`ℹ️   Queue "${name}" already exists — skipping.`);
    }
    queues.push(queue);
  }

  /* ------ Counters ------ */
  const counterLabels = [SEED.counter1, SEED.counter2];
  const counters = [];
  for (const label of counterLabels) {
    let counter = await Counter.findOne({ branch: branch._id, label });
    if (!counter) {
      counter = await Counter.create({ branch: branch._id, label });
      console.log(`✅  Counter created: ${counter.label}`);
    } else {
      console.log(`ℹ️   Counter "${label}" already exists — skipping.`);
    }
    counters.push(counter);
  }

  /* ------ Helper to create a unique staff or skip ------ */
  const ensureStaff = async ({ name, email, password, role, branchId, counterId }) => {
    let s = await Staff.findOne({ email });
    if (s) {
      console.log(`ℹ️   Staff "${email}" already exists — skipping.`);
      return s;
    }
    s = await Staff.create({
      name,
      email,
      password,
      role,
      branch: branchId,
      counter: counterId || null,
    });
    console.log(`✅  Staff created: ${role}`);
    log("Email", s.email);
    log("Password", password);
    log("Branch", branch.name);
    if (counterId) log("Counter", counters.find((c) => String(c._id) === String(counterId))?.label || counterId);
    return s;
  };

  /* ------ Admin ------ */
  await ensureStaff({
    name: SEED.adminName,
    email: SEED.adminEmail,
    password: SEED.adminPassword,
    role: "admin",
    branchId: branch._id,
  });

  /* ------ Manager (assigned to counter 2) ------ */
  await ensureStaff({
    name: SEED.managerName,
    email: SEED.managerEmail,
    password: SEED.managerPassword,
    role: "manager",
    branchId: branch._id,
    counterId: counters[1]?._id,
  });

  /* ------ Staff (assigned to counter 1) ------ */
  await ensureStaff({
    name: SEED.staffName,
    email: SEED.staffEmail,
    password: SEED.staffPassword,
    role: "staff",
    branchId: branch._id,
    counterId: counters[0]?._id,
  });

  /* ------ Demo API Key ------ */
  let rawApiKey = null;
  let demoApiKey = await ApiKey.findOne({ bankName: SEED.bankName, label: "Demo API Key" });
  if (demoApiKey) {
    console.log(`ℹ️   Demo API key already exists — skipping.`);
  } else {
    const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();
    demoApiKey = await ApiKey.create({
      bankName: SEED.bankName,
      label: "Demo API Key",
      keyHash,
      keyPrefix,
      scopes: ["admin"],
      rateLimit: 1000,
      isActive: true,
    });
    rawApiKey = rawKey;
    console.log("✅  API key created: Demo API Key");
  }

  /* ------ Link API key to staff member ------ */
  const staffMember = await Staff.findOne({ email: SEED.staffEmail });
  if (demoApiKey && staffMember) {
    await ApiKey.updateOne(
      { _id: demoApiKey._id },
      { $set: { defaultStaffId: staffMember._id } },
    );
    console.log(`✅  API key linked to staff: ${staffMember.name}`);
  }

  /* ------ Summary ------ */
  console.log("\n🎉  Seed complete!\n");

  console.log("───────────────────────────────────");
  console.log("  DEMO ENVIRONMENT");
  console.log("───────────────────────────────────");
  log("Bank", SEED.bankName);
  log("Branch", `${branch.name} (${branch.location})`);
  log("Queues", queueNames.join(", "));
  log("Counters", `${counterLabels[0]} (staff), ${counterLabels[1]} (manager)`);
  console.log("───────────────────────────────────");
  console.log("  TEST ACCOUNTS (email / password)");
  console.log("───────────────────────────────────");
  log("Admin", `${SEED.adminEmail} / ${SEED.adminPassword}`);
  log("Manager", `${SEED.managerEmail} / ${SEED.managerPassword}`);
  log("Staff", `${SEED.staffEmail} / ${SEED.staffPassword}`);
  console.log("───────────────────────────────────");

  if (rawApiKey) {
    console.log("  API KEY (paste into frontend .env as VITE_DEMO_API_KEY):");
    console.log(`  ${rawApiKey}`);
  } else {
    console.log("  API KEY: already seeded (check DB for Demo API Key)");
  }

  console.log("───────────────────────────────────\n");
};

run()
  .catch((error) => {
    console.error("❌  Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
