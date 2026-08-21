import mongoose from "mongoose";
import crypto from "crypto";

const tokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "userModel",
    required: true,
    index: true,
  },

  userModel: {
    type: String,
    required: true,
    enum: ["User", "Staff"],
  },

  type: {
    type: String,
    required: true,
    enum: ["verification", "passwordReset"],
  },

  token: {
    type: String,
    required: true,
    index: true,
  },

  expiresAt: {
    type: Date,
    required: true,
  },
});

// Auto-expire old tokens
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Generate a random hex token
tokenSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString("hex");
};

// Hash the token for storage (so raw token is only sent via email)
tokenSchema.statics.hashToken = function (raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
};

export default mongoose.model("Token", tokenSchema);
