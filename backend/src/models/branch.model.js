import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Branch name is required"],
      unique: true,
      trim: true,
    },

    location: {
      type: String,
      required: [true, "Branch location is required"],
      trim: true,
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    dayOpen: {
      type: Boolean,
      default: true,
    },

    lastOpenedAt: {
      type: Date,
      default: null,
    },

    lastClosedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

branchSchema.index({ name: 1, isActive: 1 }, { unique: true });

const Branch = mongoose.model("Branch", branchSchema);
export default Branch;
