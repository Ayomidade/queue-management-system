import Staff from "../models/staff.model.js";
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
 */
export const getAdminOverview = async (req, res, next) => {
  try {
    // Only admins can access this endpoint
    if (req.role !== "admin") {
      const error = new Error("Access denied: admin only");
      error.statusCode = 403;
      return next(error);
    }

    // Bank scoping: when the request carries a bank context (v1 API key),
    // only return that bank's branches and managers.
    const branchFilter = { isActive: true };
    if (req.bankName) {
      branchFilter.bank = req.bankName;
    }

    let managerFilter = { role: "manager", isActive: true };
    // If bankScope populated bankBranchIds, restrict managers to those branches.
    if (req.bankName && Array.isArray(req.bankBranchIds)) {
      managerFilter = {
        ...managerFilter,
        branch: { $in: req.bankBranchIds },
      };
    }

    const [branches, managers, totalStaff] = await Promise.all([
      Branch.find(branchFilter).sort({ createdAt: -1 }),
      Staff.find(managerFilter)
        .select("name email branch")
        .populate("branch", "name location"),
      Staff.countDocuments(
        req.bankName && Array.isArray(req.bankBranchIds)
          ? { isActive: true, branch: { $in: req.bankBranchIds } }
          : { isActive: true },
      ),
    ]);

    // Count staff per manager's branch
    const managerBranchIds = managers.map((m) => m.branch?._id).filter(Boolean);
    const staffCounts = await Staff.aggregate([
      {
        $match: {
          isActive: true,
          branch: { $in: managerBranchIds },
          role: "staff",
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
