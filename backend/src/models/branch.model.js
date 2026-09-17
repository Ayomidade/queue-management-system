import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    // Identifies which bank/partner owns this branch.
    // Set from the API key's bankName during creation.
    // Used for multi-tenant data isolation — each API key can only
    // access branches belonging to its bank.
    bank: {
      type: String,
      required: [true, "Bank name is required for multi-tenant isolation"],
      trim: true,
      index: true,
    },

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

    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    operatingHours: {
      type: Map,
      of: new mongoose.Schema({
        open: { type: String, default: "09:00" },
        close: { type: String, default: "17:00" },
      }, { _id: false }),
      default: {},
    },

    maxAppointmentsPerSlot: {
      type: Number,
      default: 5,
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

    waitTimeTargets: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true },
);

// Branch names must be unique within a bank, not globally.
// Two different banks can have branches with the same name.
branchSchema.index({ name: 1, bank: 1, isActive: 1 }, { unique: true });

const Branch = mongoose.model("Branch", branchSchema);
export default Branch;
