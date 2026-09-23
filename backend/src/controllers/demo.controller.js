import Staff from "../models/staff.model.js";
import { sendSuccess } from "../utils/response.js";

/**
 * GET /api/v1/demo/users
 *
 * Returns all active staff members (Staff collection only after the
 * four-model split — managers/admins live in their own collections
 * and are not demo personas).
 * Used by the demo frontend's user switcher dropdown.
 * No auth required — this is public demo data.
 */
export const getDemoUsers = async (req, res, next) => {
  try {
    const staffMembers = await Staff.find({ isActive: true })
      .select("name email branch")
      .lean();

    const users = staffMembers.map((s) => ({
      id: s._id,
      name: s.name,
      email: s.email,
      // Staff collection has no role field — the collection IS the role.
      role: "staff",
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
