import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, "Counter label is required"],
      trim: true, // e.g "counter 1", "Window A"
    },

    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },

    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null, // null until a staff is assigned
    },

    isOpen: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicate counter labels inside the same branch
counterSchema.index({ label: 1, branch: 1 }, { unique: true });

export default mongoose.model("Counter", counterSchema);
