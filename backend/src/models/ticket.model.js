import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    kioskId: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },

    queue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Queue",
      required: true,
      index: true,
    },

    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    ticketNumber: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["waiting", "called", "skipped", "cancelled", "completed"],
      default: "waiting",
      index: true,
    },

    priority: {
      type: String,
      enum: ["normal", "priority"],
      default: "normal",
    },

    isAppointment: {
      type: Boolean,
      default: false,
    },

    scheduledFor: {
      type: Date,
      default: null,
    },

    publicTokenHash: {
      type: String,
      default: null,
      index: true,
    },

    guestName: {
      type: String,
      trim: true,
      default: null,
    },

    guestPhone: {
      type: String,
      trim: true,
      default: null,
    },

    guestEmail: {
      type: String,
      trim: true,
      default: null,
    },

    purpose: {
      type: String,
      trim: true,
      default: null,
    },

    servedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    calledAt: Date,
    completedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true },
);

ticketSchema.index({ queue: 1, ticketNumber: 1 }, { unique: true });

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;
