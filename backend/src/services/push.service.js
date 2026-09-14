import webpush from "web-push";
import { config } from "dotenv";
import PushSubscription from "../models/pushSubscription.model.js";

config();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@cue-queue.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export const getVapidPublicKey = () => VAPID_PUBLIC_KEY;

export const sendPushNotification = async (userId, userModel, payload) => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  try {
    const subscriptions = await PushSubscription.find({ user: userId, userModel });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            JSON.stringify(payload),
          );
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await PushSubscription.deleteOne({ _id: sub._id });
          }
          throw err;
        }
      }),
    );

    return results;
  } catch {
    return [];
  }
};

export const sendPushToBranch = async (branchId, role, payload) => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  try {
    const Staff = (await import("../models/staff.model.js")).default;
    const staff = await Staff.find({ branch: branchId, isActive: true }).select("_id");

    const results = await Promise.allSettled(
      staff.map((s) => sendPushNotification(s._id, "Staff", payload)),
    );

    return results;
  } catch {
    return [];
  }
};

export const sendPushToBranchManagers = async (branchId, payload) => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  try {
    const Staff = (await import("../models/staff.model.js")).default;
    const managers = await Staff.find({
      branch: branchId,
      role: "manager",
      isActive: true,
    }).select("_id");

    const results = await Promise.allSettled(
      managers.map((m) => sendPushNotification(m._id, "Staff", payload)),
    );

    return results;
  } catch {
    return [];
  }
};
