import Staff from "../models/staff.model.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const getMyProfile = async (req, res, next) => {
  try {
    return sendSuccess(res, {
      statusCode: 200,
      message: "Profile fetched successfully",
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, {
        statusCode: 400,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return sendError(res, {
        statusCode: 400,
        message: "New password must be at least 8 characters",
      });
    }

    if (currentPassword === newPassword) {
      return sendError(res, {
        statusCode: 400,
        message: "New password must be different from current password",
      });
    }

    const account = await Staff.findById(req.user._id).select("+password");
    if (!account) {
      return sendError(res, {
        statusCode: 404,
        message: "Account not found",
      });
    }

    const isMatch = await account.comparePassword(currentPassword);
    if (!isMatch) {
      return sendError(res, {
        statusCode: 400,
        message: "Current password is incorrect",
      });
    }

    account.password = newPassword;
    await account.save();

    return sendSuccess(res, {
      statusCode: 200,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};
