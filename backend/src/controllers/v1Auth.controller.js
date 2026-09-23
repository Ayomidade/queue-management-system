import { sendSuccess } from "../utils/response.js";

/**
 * GET /api/v1/auth/me
 *
 * Returns the staff identity resolved from the API key.
 * Used by the demo frontend to populate auth state (id, branch, role).
 */
export const getme = async (req, res, next) => {
  try {
    return sendSuccess(res, {
      statusCode: 200,
      message: "Current staff identity",
      data: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        branch: req.user.branch,
        counter: req.user.counter,
        queues: req.user.queues || [],
      },
    });
  } catch (error) {
    next(error);
  }
};
