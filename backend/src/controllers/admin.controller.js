import Staff from "../models/staff.model.js";
import Branch from "../models/branch.model.js";
import { sendSuccess } from "../utils/response.js";

/**
 * GET /api/v1/admin/overview
 *
 * Admin-only endpoint that returns a cross-branch overview:
 * - All branches with basic info
 * - All managers with their staff counts
 * - Summary totals
 */
export const getAdminOverview = async (req, res, next) => {
  try {
    // Only admins can access this endpoint
    if (req.role !== "admin") {
      const error = new Error("Access denied: admin only");
      error.statusCode = 403;
      return next(error);
    }

    const [branches, managers, totalStaff] = await Promise.all([
      Branch.find({ isActive: true }).sort({ createdAt: -1 }),
      Staff.find({ role: "manager", isActive: true })
        .select("name email branch")
        .populate("branch", "name location"),
      Staff.countDocuments({ isActive: true }),
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
