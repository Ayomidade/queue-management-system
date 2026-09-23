import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * Manager model — branch manager.
 *
 * One collection per role after the four-model split (Phase 13 / WP1).
 *
 * Managers are branch-scoped operators: they create and deactivate staff,
 * oversee counters and analytics for their branch, and open/close the
 * branch day. They are NOT assigned to a queue or counter and cannot
 * serve tickets.
 *
 * Fields are intentionally tailored (no counter, no queues[]):
 *   name, email, password, branch, bank, isActive, mustChangePassword
 *
 * `bank` is denormalized from `branch → Branch.bank` at creation time
 * so bank-scoped queries don't need an extra join.
 */
const managerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Manager name is required"],
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

    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Manager must be assigned to a branch"],
    },

    // Denormalized tenant from the branch at creation (Branch.bank).
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

managerSchema.pre("save", async function () {
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

managerSchema.methods.comparePassword = async function (candidatepassword) {
  return await bcrypt.compare(candidatepassword, this.password);
};

export default mongoose.model("Manager", managerSchema);
