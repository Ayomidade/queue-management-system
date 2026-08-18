import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { sendSuccess, sendError } from "../utils/response.js";

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, {
        statusCode: 400,
        message: "User already exists",
      });
    }

    const user = await User.create({ name, email, password, role: "customer" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "4d" },
    );

    return sendSuccess(res, {
      statusCode: 201,
      message: "User registered successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, {
        statusCode: 400,
        message: "All fields are required",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return sendError(res, {
        statusCode: 400,
        message: "Invalid credentials",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, {
        statusCode: 400,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    return sendSuccess(res, {
      statusCode: 200,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};
