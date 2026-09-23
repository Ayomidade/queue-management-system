import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * Staff model — front-desk staff only.
 *
 * After the four-model split (Phase 13 / WP1), this collection holds
 * solely staff members. Role is implied by the collection itself, so
 * there is no `role` field. Managers live in Manager, bank admins in
 * Admin, platform operators in Superadmin.
 */
const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Staff name is required"],
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
      default: null,
    },

    counter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Counter",
      default: null,
    },

    queues: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Queue",
      },
    ],

    isEmailVerified: {
      type: Boolean,
      default: false,
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

// Hash password before saving
staffSchema.pre("save", async function () {
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

// Compare password method
staffSchema.methods.comparePassword = async function (candidatepassword) {
  return await bcrypt.compare(candidatepassword, this.password);
};

export default mongoose.model("Staff", staffSchema);
