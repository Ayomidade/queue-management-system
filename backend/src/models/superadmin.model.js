import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * Superadmin model — platform operator.
 *
 * One collection per role after the four-model split (Phase 13 / WP1).
 * Superadmins are NOT bank-scoped: they manage API keys, usage
 * monitoring, and key-request approval across all banks.
 *
 * Login: POST /api/platform/login (JWT with kind="superadmin").
 * Seeded via `npm run seed:superadmin` — never created at runtime.
 */
const superadminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Superadmin name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // True when the account was created with a temporary password and
    // the user must set a new one on first login.
    mustChangePassword: {
      type: Boolean,
      default: false,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

superadminSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

superadminSchema.methods.comparePassword = async function (candidatepassword) {
  return await bcrypt.compare(candidatepassword, this.password);
};

export default mongoose.model("Superadmin", superadminSchema);
