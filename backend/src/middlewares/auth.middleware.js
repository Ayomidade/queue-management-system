import Staff from "../models/staff.model.js";
import { sendError } from "../utils/response.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, {
        statusCode: 401,
        message: "Not authorized, no token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    const jwt = (await import("jsonwebtoken")).default;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const account = await Staff.findById(decoded.id).select("-password");

    if (!account) {
      return sendError(res, {
        statusCode: 401,
        message: "Account associated with token no longer exists",
      });
    }

    req.user = account;
    req.role = decoded.role;
    next();
  } catch (error) {
    return sendError(res, { statusCode: 401, message: "Invalid or expired token" });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, { statusCode: 401, message: "Not authenticated" });
    }
    if (!roles.includes(req.role)) {
      return sendError(res, {
        statusCode: 403,
        message: "Access denied: insufficient permissions",
      });
    }
    next();
  };
};
