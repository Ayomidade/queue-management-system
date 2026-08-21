import User from "../models/user.model.js";
import Staff from "../models/staff.model.js";
import Token from "../models/token.model.js";
import { sendEmail } from "../services/email.service.js";
import jwt from "jsonwebtoken";
import { sendSuccess, sendError } from "../utils/response.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

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

    // Send email verification
    const rawToken = Token.generateToken();
    await Token.create({
      user: user._id,
      userModel: "User",
      type: "verification",
      token: Token.hashToken(rawToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    });

    sendEmail({
      to: user.email,
      subject: "Verify your Cue email",
      html: `<h2>Welcome to Cue</h2><p>Click the link below to verify your email address:</p><p><a href="${FRONTEND_URL}/verify-email?token=${rawToken}">Verify Email</a></p><p>This link expires in 24 hours.</p>`,
    }).catch(() => {});

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
          isEmailVerified: user.isEmailVerified,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return sendError(res, { statusCode: 400, message: "Token is required" });
    }

    const hashed = Token.hashToken(token);
    const doc = await Token.findOne({
      token: hashed,
      type: "verification",
      expiresAt: { $gt: new Date() },
    });

    if (!doc) {
      return sendError(res, {
        statusCode: 400,
        message: "Invalid or expired verification token",
      });
    }

    const user = await User.findByIdAndUpdate(
      doc.user,
      { isEmailVerified: true },
      { new: true },
    );

    if (!user) {
      return sendError(res, { statusCode: 404, message: "User not found" });
    }

    await Token.deleteOne({ _id: doc._id });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Email verified successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return sendError(res, { statusCode: 400, message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether user exists
      return sendSuccess(res, {
        statusCode: 200,
        message: "If an account exists, a verification email has been sent",
      });
    }

    if (user.isEmailVerified) {
      return sendSuccess(res, {
        statusCode: 200,
        message: "Email is already verified",
      });
    }

    // Remove old verification tokens
    await Token.deleteMany({ user: user._id, type: "verification" });

    const rawToken = Token.generateToken();
    await Token.create({
      user: user._id,
      userModel: "User",
      type: "verification",
      token: Token.hashToken(rawToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    sendEmail({
      to: user.email,
      subject: "Verify your Cue email",
      html: `<h2>Verify your email</h2><p>Click the link below to verify your email address:</p><p><a href="${FRONTEND_URL}/verify-email?token=${rawToken}">Verify Email</a></p><p>This link expires in 24 hours.</p>`,
    }).catch(() => {});

    return sendSuccess(res, {
      statusCode: 200,
      message: "If an account exists, a verification email has been sent",
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return sendError(res, { statusCode: 400, message: "Email is required" });
    }

    // Check both User and Staff models
    let account = await User.findOne({ email });
    let userModel = "User";
    if (!account) {
      account = await Staff.findOne({ email });
      userModel = "Staff";
    }

    // Always return success to prevent email enumeration
    if (!account) {
      return sendSuccess(res, {
        statusCode: 200,
        message: "If an account exists, a reset link has been sent",
      });
    }

    // Remove old reset tokens
    await Token.deleteMany({ user: account._id, type: "passwordReset" });

    const rawToken = Token.generateToken();
    await Token.create({
      user: account._id,
      userModel,
      type: "passwordReset",
      token: Token.hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    sendEmail({
      to: account.email,
      subject: "Reset your Cue password",
      html: `<h2>Password Reset</h2><p>Click the link below to reset your password:</p><p><a href="${FRONTEND_URL}/reset-password?token=${rawToken}">Reset Password</a></p><p>This link expires in 1 hour.</p><p>If you didn't request this, ignore this email.</p>`,
    }).catch(() => {});

    return sendSuccess(res, {
      statusCode: 200,
      message: "If an account exists, a reset link has been sent",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return sendError(res, {
        statusCode: 400,
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return sendError(res, {
        statusCode: 400,
        message: "Password must be at least 8 characters",
      });
    }

    const hashed = Token.hashToken(token);
    const doc = await Token.findOne({
      token: hashed,
      type: "passwordReset",
      expiresAt: { $gt: new Date() },
    });

    if (!doc) {
      return sendError(res, {
        statusCode: 400,
        message: "Invalid or expired reset token",
      });
    }

    const Model = doc.userModel === "Staff" ? Staff : User;
    const account = await Model.findById(doc.user).select("+password");

    if (!account) {
      return sendError(res, { statusCode: 404, message: "Account not found" });
    }

    account.password = newPassword;
    await account.save();
    await Token.deleteOne({ _id: doc._id });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Password reset successfully",
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
          isEmailVerified: user.isEmailVerified,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};
