import Staff from "../models/staff.model.js";
import Manager from "../models/manager.model.js";
import Branch from "../models/branch.model.js";
import { sendSuccess } from "../utils/response.js";

/**
 * GET /api/v1/admin/overview
 *
 * Bank-scoped admin-only endpoint that returns a cross-branch overview
 * for THIS admin's bank only (Option B multi-tenancy):
 * - All branches belonging to req.bankName (if v1/API-key context)
 * - All managers whose branch is in req.bankBranchIds
 * - Summary totals scoped to that bank
 *
 * Legacy JWT admins without req.bankName keep the old unscoped behavior
 * (single-deployment / non-tenanted mode).
 *
 * After the four-model split, managers live in the Manager collection
 * (no role field to filter on).
 */
export const getAdminOverview = async (req, res, next) => {
  try {
    // JWT path: only admins. API-key path (v1): the key itself is the
    // bank identity — requireScope("analytics:read") already gated access,
    // and resolveStaffUser always sets role "staff" (not "admin").
    const isApiKeyIntegration = !!req.apiKey;
    if (!isApiKeyIntegration && req.role !== "admin") {
      const error = new Error("Access denied: admin only");
      error.statusCode = 403;
      return next(error);
    }

    // Bank scope: API-key path uses key.bankName; JWT dashboard uses Admin.bank.
    const bank = req.bankName || req.user?.bank || null;

    const branchFilter = { isActive: true };
    if (bank) {
      branchFilter.bank = bank;
    }

    let managerFilter = { isActive: true };
    if (bank) {
      // JWT path has no bankScope middleware — filter Manager by denormalized bank.
      // API-key path may also have bankBranchIds from bankScope.
      if (Array.isArray(req.bankBranchIds) && req.bankBranchIds.length >= 0 && req.bankName) {
        managerFilter = {
          ...managerFilter,
          branch: { $in: req.bankBranchIds },
        };
      } else {
        managerFilter = { ...managerFilter, bank };
      }
    }

    const [branches, managers] = await Promise.all([
      Branch.find(branchFilter).sort({ createdAt: -1 }),
      Manager.find(managerFilter)
        .select("name email branch bank")
        .populate("branch", "name location"),
    ]);

    // Staff count: prefer bank branch ids (API key) or this bank's branches (JWT).
    let staffBranchFilter = { isActive: true };
    if (bank) {
      if (Array.isArray(req.bankBranchIds) && req.bankName) {
        staffBranchFilter = { isActive: true, branch: { $in: req.bankBranchIds } };
      } else {
        const bankBranchIds = branches.map((b) => b._id);
        staffBranchFilter = { isActive: true, branch: { $in: bankBranchIds } };
      }
    }
    const totalStaff = await Staff.countDocuments(staffBranchFilter);

    // Count staff per manager's branch (Staff collection = all staff)
    const managerBranchIds = managers.map((m) => m.branch?._id).filter(Boolean);
    const staffCounts = await Staff.aggregate([
      {
        $match: {
          isActive: true,
          branch: { $in: managerBranchIds },
        },
      },
      { $group: { _id: "$branch", count: { $sum: 1 } } },
    ]);

    const staffCountByBranch = {};
    staffCounts.forEach((entry) => {
      staffCountByBranch[entry._id.toString()] = entry.count;
    });

    // Enrich managers with their staff count
    const enrichedManagers = managers.map((m) => ({
      id: m._id,
      name: m.name,
      email: m.email,
      branch: m.branch
        ? { id: m.branch._id, name: m.branch.name, location: m.branch.location }
        : null,
      staffCount: m.branch ? staffCountByBranch[m.branch._id.toString()] || 0 : 0,
    }));

    return sendSuccess(res, {
      statusCode: 200,
      message: "Admin overview fetched successfully",
      data: {
        summary: {
          totalBranches: branches.length,
          totalManagers: managers.length,
          totalStaff,
        },
        branches: branches.map((b) => ({
          id: b._id,
          name: b.name,
          location: b.location,
          dayOpen: b.dayOpen,
        })),
        managers: enrichedManagers,
      },
    });
  } catch (error) {
    next(error);
  }
};
