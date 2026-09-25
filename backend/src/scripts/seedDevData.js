import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Superadmin from "../models/superadmin.model.js";
import Admin from "../models/admin.model.js";
import Manager from "../models/manager.model.js";
import Staff from "../models/staff.model.js";
import Branch from "../models/branch.model.js";
import Queue from "../models/queue.model.js";
import Counter from "../models/counter.model.js";

const banks = [
  {
    slug: "wema",
    name: "Wema Bank",
    admin: { name: "Wema Bank Admin", email: "admin.wema@cue.local" },
    manager: { name: "Wema Branch Manager", email: "manager.wema@cue.local" },
    staff: [
      { name: "Wema Staff One", email: "staff.wema.1@cue.local" },
      { name: "Wema Staff Two", email: "staff.wema.2@cue.local" },
      { name: "Wema Staff Three", email: "staff.wema.3@cue.local" },
      { name: "Wema Staff Four", email: "staff.wema.4@cue.local" },
    ],
    branches: [
      { name: "Wema Bank - Central", location: "Lagos Central", lat: 6.5244, lng: 3.3792 },
      { name: "Wema Bank - Lekki", location: "Lekki", lat: 6.4474, lng: 3.4733 },
      { name: "Wema Bank - Airport", location: "Ikeja", lat: 6.5774, lng: 3.3212 },
    ],
  },
  {
    slug: "demo",
    name: "Demo Trust Bank",
    admin: { name: "Demo Bank Admin", email: "admin.demo@cue.local" },
    manager: { name: "Demo Branch Manager", email: "manager.demo@cue.local" },
    staff: [
      { name: "Demo Staff One", email: "staff.demo.1@cue.local" },
      { name: "Demo Staff Two", email: "staff.demo.2@cue.local" },
      { name: "Demo Staff Three", email: "staff.demo.3@cue.local" },
      { name: "Demo Staff Four", email: "staff.demo.4@cue.local" },
    ],
    branches: [
      { name: "Demo Bank - Central", location: "Abuja Central", lat: 9.0765, lng: 7.3986 },
      { name: "Demo Bank - Maitama", location: "Maitama", lat: 9.0835, lng: 7.4265 },
      { name: "Demo Bank - Airport", location: "Ikeja", lat: 6.5774, lng: 3.3212 },
    ],
  },
];

const upsertAccount = async (Model, email, data) => {
  const existing = await Model.findOne({ email });
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return existing;
  }
  return Model.create({ email, ...data });
};

const upsertBranch = async (bank, data) => {
  const existing = await Branch.findOne({ bank, name: data.name });
  const values = {
    bank,
    ...data,
    operatingHours: {
      monday: { open: "08:00", close: "18:00" },
      tuesday: { open: "08:00", close: "18:00" },
      wednesday: { open: "08:00", close: "18:00" },
      thursday: { open: "08:00", close: "18:00" },
      friday: { open: "08:00", close: "18:00" },
      saturday: { open: "09:00", close: "15:00" },
      sunday: { open: "09:00", close: "14:00" },
    },
    maxAppointmentsPerSlot: 5,
    isActive: true,
    dayOpen: true,
  };
  if (existing) {
    Object.assign(existing, values);
    await existing.save();
    return existing;
  }
  return Branch.create(values);
};

const upsertQueue = async (branch, serviceName) => {
  const existing = await Queue.findOne({ branch, serviceName });
  if (existing) {
    existing.isActive = true;
    await existing.save();
    return existing;
  }
  return Queue.create({ branch, serviceName, isActive: true });
};

const upsertCounter = async (branch, label, assignedStaff) => {
  const existing = await Counter.findOne({ branch, label });
  const values = { branch, label, assignedStaff, isOpen: true };
  if (existing) {
    Object.assign(existing, values);
    await existing.save();
    return existing;
  }
  return Counter.create(values);
};

const run = async () => {
  const password =
    process.env.SEED_DEFAULT_PASSWORD || process.env.SEED_SUPERADMIN_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error(
      "Set SEED_DEFAULT_PASSWORD (or SEED_SUPERADMIN_PASSWORD) to at least 8 characters before seeding",
    );
  }

  const superadminEmail =
    process.env.SEED_SUPERADMIN_EMAIL || "superadmin@cue.local";
  const superadminName =
    process.env.SEED_SUPERADMIN_NAME || "Cue Platform Superadmin";

  await connectDB();

  await upsertAccount(Superadmin, superadminEmail, {
    name: superadminName,
    password,
    isActive: true,
    mustChangePassword: false,
  });

  const summary = [];

  for (const bankConfig of banks) {
    await upsertAccount(Admin, bankConfig.admin.email, {
      name: bankConfig.admin.name,
      password,
      bank: bankConfig.name,
      isActive: true,
      mustChangePassword: false,
    });

    const branches = [];
    for (const branchData of bankConfig.branches) {
      const branch = await upsertBranch(bankConfig.name, {
        name: branchData.name,
        location: branchData.location,
        address: `${branchData.location} test location`,
        phone: "+2348000000000",
        email: `${bankConfig.slug}.${branches.length + 1}@cue.local`,
        coordinates: { lat: branchData.lat, lng: branchData.lng },
      });
      branches.push(branch);
      await upsertQueue(branch._id, "Teller");
      await upsertQueue(branch._id, "Customer Service");
    }

    const manager = await upsertAccount(Manager, bankConfig.manager.email, {
      name: bankConfig.manager.name,
      password,
      branch: branches[0]._id,
      bank: bankConfig.name,
      isActive: true,
      mustChangePassword: false,
    });

    const staff = [];
    for (let index = 0; index < bankConfig.staff.length; index += 1) {
      const branch = branches[index % branches.length];
      const account = await upsertAccount(
        Staff,
        bankConfig.staff[index].email,
        {
          name: bankConfig.staff[index].name,
          password,
          branch: branch._id,
          isActive: true,
          isEmailVerified: true,
          mustChangePassword: false,
        },
      );
      staff.push({ account, branch });
    }

    for (let index = 0; index < 3; index += 1) {
      const branch = branches[index];
      const assigned = staff.find((entry) => String(entry.branch._id) === String(branch._id));
      await upsertCounter(branch._id, `Counter ${index + 1}`, assigned?.account._id || null);
      if (assigned) {
        assigned.account.counter = (
          await Counter.findOne({ branch: branch._id, label: `Counter ${index + 1}` })
        )._id;
        await assigned.account.save();
      }
    }

    summary.push({
      bank: bankConfig.name,
      admin: bankConfig.admin.email,
      manager: bankConfig.manager.email,
      branches: branches.map((branch) => branch.name),
      staff: bankConfig.staff.map((entry) => entry.email),
      counters: ["Counter 1", "Counter 2", "Counter 3"],
    });
  }

  console.log("Development seed completed.");
  console.log(`Superadmin: ${superadminEmail}`);
  console.log(`Password: ${password}`);
  for (const bank of summary) {
    console.log(`\n${bank.bank}`);
    console.log(`  Admin: ${bank.admin}`);
    console.log(`  Manager: ${bank.manager}`);
    console.log(`  Branches: ${bank.branches.join(", ")}`);
    console.log(`  Staff: ${bank.staff.join(", ")}`);
    console.log(`  Counters: ${bank.counters.join(", ")}`);
  }
  console.log("\nEach branch has Teller and Customer Service queues.");
};

run()
  .catch((error) => {
    console.error("Failed to seed development data:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
