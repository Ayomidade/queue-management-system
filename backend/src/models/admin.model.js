import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * Admin model — bank-scoped bank administrator.
 *
 * One collection per role after the four-model split (Phase 13 / WP1).
 * `bank` is the admin's tenant affiliation (denormalized at registration).
 *
 * NOTE: Runtime data scoping for API-key requests still comes from the
 * API key (`req.bankName`), not from this field. `bank` is enforced to
 * match the key's bank whenever both identities are present (tenantMatch).
 */
const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Admin name is required"],
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

    // Tenant this admin belongs to. Compared against ApiKey.bankName
    // on requests that carry both identities (tenantMatch middleware).
    bank: {
      type: String,
      required: [true, "Bank name is required"],
      trim: true,
      index: true,
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
  },
  { timestamps: true },
);

adminSchema.pre("save", async function () {
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

adminSchema.methods.comparePassword = async function (candidatepassword) {
  return await bcrypt.compare(candidatepassword, this.password);
};

export default mongoose.model("Admin", adminSchema);
