import mongoose from "mongoose";
import crypto from "crypto";

/**
 * Invite — single-use registration token for Manager or Staff accounts.
 *
 * Flow (Phase 13 / WP3):
 * 1. Admin creates a bank-scoped manager invite (or admin/manager creates
 *    a branch-scoped staff invite). The raw token is returned ONCE.
 * 2. Creator sends the link to the person: /register/<kind>?token=...
 * 3. Invitee opens the link, sets name/email/password, redeems the token.
 * 4. Token is hashed at rest (SHA-256), expires in 7 days, single-use.
 *
 * Separate from Token model (which requires an existing user) because
 * invites are issued BEFORE the account exists.
 */
const inviteSchema = new mongoose.Schema(
  {
    // SHA-256 of the raw token — raw is only in the one-time API response.
    // `unique` already creates the index; do not also set `index: true`.
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    kind: {
      type: String,
      enum: ["manager", "staff"],
      required: true,
    },

    // Manager invites are bank-scoped (who the manager belongs to).
    bank: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    // Staff invites are branch-scoped (which branch the staff joins).
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    // Who issued the invite (Admin for manager invites; Admin or Manager for staff).
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "invitedByModel",
      required: true,
    },
    invitedByModel: {
      type: String,
      enum: ["Admin", "Manager"],
      required: true,
    },

    // No `index: true` here — the TTL index below is the only expiresAt index
    // (declaring both triggers Mongoose's duplicate-index warning).
    expiresAt: {
      type: Date,
      required: true,
    },

    // Set when redeemed — second redeem attempt fails.
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Auto-expire abandoned invites (TTL index).
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/** Raw token generator (hex). */
inviteSchema.statics.generateRawToken = function () {
  return crypto.randomBytes(32).toString("hex");
};

/** SHA-256 hash for storage/lookup. */
inviteSchema.statics.hashToken = function (raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
};

const Invite = mongoose.model("Invite", inviteSchema);
export default Invite;
