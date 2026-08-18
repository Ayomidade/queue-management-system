import { validationResult } from "express-validator";
import { sendError } from "../utils/response.js";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, {
      statusCode: 400,
      message: "Validation failed",
      errors: errors.array().map((err) => err.msg),
    });
  }
  next();
};

export default validate;
