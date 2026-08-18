import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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

    calledAt: Date,
    completedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true },
);

ticketSchema.index({ queue: 1, ticketNumber: 1 }, { unique: true });

ticketSchema.index(
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["waiting", "called"] } },
  },
);

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;
