import Staff from "../models/staff.model.js";
import { sendSuccess } from "../utils/response.js";

/**
 * GET /api/v1/demo/users
 *
 * Returns all active staff members from the Staff model.
 * Used by the demo frontend's user switcher dropdown.
 * No auth required — this is public demo data.
 */
export const getDemoUsers = async (req, res, next) => {
  try {
    const staffMembers = await Staff.find({ isActive: true })
      .select("name email role branch")
      .lean();

    const users = staffMembers.map((s) => ({
      id: s._id,
      name: s.name,
      email: s.email,
      role: s.role,
      type: "staff",
      branch: s.branch,
    }));

    return sendSuccess(res, {
      statusCode: 200,
      message: "Demo users",
      data: users,
    });
  } catch (error) {
    next(error);
  }
};
