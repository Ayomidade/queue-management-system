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
    // 9022551093
    // phone: {
    //   type: String,
    //   trim: true,
    // },

    // email:{
    //   type: String,
    //   trim: true,
    // },

    isActive: {
      type: Boolean,
      // index: true,
      default: true,
    },
  },
  { timestamps: true },
);

branchSchema.index({ name: 1, isActive: 1 }, { unique: true });

const Branch = mongoose.model("Branch", branchSchema);
export default Branch;
