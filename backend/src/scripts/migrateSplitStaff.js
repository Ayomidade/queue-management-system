import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Staff from "../models/staff.model.js";
import Admin from "../models/admin.model.js";
import Manager from "../models/manager.model.js";
import Superadmin from "../models/superadmin.model.js";
import Branch from "../models/branch.model.js";

dotenv.config();

/**
 * Splits the legacy multi-role `staffs` collection into four collections
 * after the four-model split (Phase 13 / WP1):
 *
 *   role "superadmin" → superadmins   (Superadmin model)
 *   role "admin"      → admins        (Admin model, bank from branch→Branch.bank)
 *   role "manager"    → managers      (Manager model, bank denormalized from branch)
 *   role "staff"/none → stays in staffs (Staff model, role field stripped)
 *
 * Managers/Admins without a branch get bank=null (Admin requires bank —
 * those docs are reported and skipped so the script never half-writes).
 *
 * Usage:
 *   node src/scripts/migrateSplitStaff.js --dry-run   # report only
 *   node src/scripts/migrateSplitStaff.js             # migrate for real
 *
 * Safe to re-run: source docs are only deleted after a successful insert
 * into the target collection (and only when not in dry-run mode).
 */
const isDryRun = process.argv.includes("--dry-run");

const run = async () => {
  await connectDB();

  const legacyDocs = await Staff.find({}).lean();
  console.log(
    `Found ${legacyDocs.length} legacy staff document(s)${isDryRun ? " (dry-run)" : ""}.`,
  );

  const buckets = { superadmin: [], admin: [], manager: [], staff: [] };
  for (const doc of legacyDocs) {
    const role = doc.role || "staff";
    if (buckets[role]) buckets[role].push(doc);
    else buckets.staff.push(doc);
  }

  // Denormalize bank for admins/managers via their branch → Branch.bank.
  const branchIds = [
    ...new Set(
      [...buckets.admin, ...buckets.manager]
        .map((d) => d.branch)
        .filter(Boolean)
        .map(String),
    ),
  ];
  const branches = await Branch.find({ _id: { $in: branchIds } })
    .select("bank")
    .lean();
  const bankByBranch = Object.fromEntries(
    branches.map((b) => [String(b._id), b.bank]),
  );

  const stripCommon = (doc) => {
    const { role, ...rest } = doc;
    delete rest.__v;
    return rest;
  };

  const admins = [];
  const skippedAdmins = [];
  for (const doc of buckets.admin) {
    const bank = doc.branch ? bankByBranch[String(doc.branch)] : null;
    if (!bank) {
      skippedAdmins.push({ id: doc._id, email: doc.email, reason: "no branch/bank" });
      continue;
    }
    admins.push({ ...stripCommon(doc), bank });
  }

  const managers = [];
  const skippedManagers = [];
  for (const doc of buckets.manager) {
    const bank = doc.branch ? bankByBranch[String(doc.branch)] : null;
    if (!doc.branch || !bank) {
      skippedManagers.push({ id: doc._id, email: doc.email, reason: "no branch/bank" });
      continue;
    }
    const { counter, queues, isEmailVerified, ...rest } = stripCommon(doc);
    managers.push({ ...rest, branch: doc.branch, bank });
  }

  // Staff: drop role (and anything manager/admin-specific that leaked in).
  const staffs = buckets.staff.map((doc) => {
    const { role, ...rest } = stripCommon(doc);
    return rest;
  });

  const superadmins = buckets.superadmin.map(stripCommon);

  const report = (label, arr, skipped = []) => {
    console.log(`  ${label}: ${arr.length} to migrate` + (skipped.length ? `, ${skipped.length} skipped` : ""));
    skipped.forEach((s) => console.log(`    skip ${s.email} (${s.reason})`));
  };

  console.log("Plan:");
  report("superadmins", superadmins);
  report("admins", admins, skippedAdmins);
  report("managers", managers, skippedManagers);
  report("staff (role stripped)", staffs);
  console.log(
    `  (superadmins/admins/managers who can't migrate stay in staffs untouched)`,
  );

  if (isDryRun) {
    console.log("Dry-run complete — no writes performed.");
    return;
  }

  // Insert with insertMany so pre("save") bcrypt hooks do NOT re-hash
  // already-hashed passwords from the legacy collection.
  const insert = async (Model, docs, label) => {
    if (!docs.length) return;
    try {
      await Model.insertMany(docs, { ordered: false });
      console.log(`Inserted ${docs.length} → ${Model.modelName}`);
    } catch (err) {
      // Duplicate email (already migrated / exists in target) — abort this
      // bucket so we don't leave a partial silent state without visibility.
      throw new Error(`Failed inserting ${label}: ${err.message}`);
    }
  };

  await insert(Superadmin, superadmins, "superadmins");
  await insert(Admin, admins, "admins");
  await insert(Manager, managers, "managers");

  // Staff stay in place; just strip the role field (and confirm counts).
  if (staffs.length) {
    await Staff.updateMany(
      { _id: { $in: staffs.map((s) => s._id) } },
      { $unset: { role: 1 } },
    );
    console.log(`Stripped role from ${staffs.length} staff document(s).`);
  }

  // Delete successfully moved source docs (their _id no longer exists in staffs
  // as an authoritative record — copies live in the new collections).
  const movedIds = [
    ...superadmins.map((d) => d._id),
    ...admins.map((d) => d._id),
    ...managers.map((d) => d._id),
  ];
  if (movedIds.length) {
    const res = await Staff.deleteMany({ _id: { $in: movedIds } });
    console.log(`Removed ${res.deletedCount} migrated source document(s) from staffs.`);
  }

  console.log("Migration complete.");
};

run()
  .catch((error) => {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
