import PushSubscription from "../models/pushSubscription.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { getVapidPublicKey } from "../services/push.service.js";

export const getPublicKey = async (req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    return sendError(res, {
      statusCode: 503,
      message: "Push notifications not configured",
    });
  }
  return sendSuccess(res, {
    statusCode: 200,
    message: "VAPID public key",
    data: { publicKey: key },
  });
};

export const subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return sendError(res, {
        statusCode: 400,
        message: "endpoint, keys.p256dh, and keys.auth are required",
      });
    }

    await PushSubscription.findOneAndUpdate(
      { user: req.user._id, endpoint },
      {
        user: req.user._id,
        userModel: req.role === "staff" || req.role === "manager" ? "Staff" : "User",
        endpoint,
        keys,
      },
      { upsert: true, returnDocument: "after" },
    );

    return sendSuccess(res, {
      statusCode: 201,
      message: "Push subscription saved",
    });
  } catch (error) {
    next(error);
  }
};

export const unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return sendError(res, {
        statusCode: 400,
        message: "endpoint is required",
      });
    }

    await PushSubscription.deleteOne({ user: req.user._id, endpoint });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Push subscription removed",
    });
  } catch (error) {
    next(error);
  }
};
