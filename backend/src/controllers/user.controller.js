import { sendSuccess } from "../utils/response.js";

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

export const adminOnlyPing = async (req, res, next) => {
  try {
    return sendSuccess(res, {
      statusCode: 200,
      message: "Welcome Admin",
    });
  } catch (error) {
    next(error);
  }
};
