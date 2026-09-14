import mongoose from "mongoose";

const webhookSchema = new mongoose.Schema(
  {
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    events: [
      {
        type: String,
        required: true,
      },
    ],
    secret: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastTriggeredAt: {
      type: Date,
      default: null,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

webhookSchema.index({ branch: 1, isActive: 1 });

const Webhook = mongoose.model("Webhook", webhookSchema);
export default Webhook;
