import Webhook from "../models/webhook.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import crypto from "crypto";

export const createWebhook = async (req, res, next) => {
  try {
    const { url, events, branchId } = req.body;

    if (!url || !events || !events.length) {
      return sendError(res, {
        statusCode: 400,
        message: "url and events array are required",
      });
    }

    try {
      new URL(url);
    } catch {
      return sendError(res, { statusCode: 400, message: "Invalid URL" });
    }

    const webhook = await Webhook.create({
      branch: branchId || null,
      url,
      events,
      secret: crypto.randomBytes(32).toString("hex"),
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Webhook created",
      data: {
        id: webhook._id,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret,
        branch: webhook.branch,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listWebhooks = async (req, res, next) => {
  try {
    const filter = {};
    if (req.role === "manager" && req.user.branch) {
      filter.$or = [{ branch: req.user.branch }, { branch: null }];
    } else if (req.role !== "admin") {
      filter.branch = req.user.branch;
    }

    const webhooks = await Webhook.find(filter).select("-secret").sort("-createdAt");

    return sendSuccess(res, {
      statusCode: 200,
      message: "Webhooks fetched",
      data: webhooks,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findByIdAndDelete(req.params.id);
    if (!webhook) {
      return sendError(res, { statusCode: 404, message: "Webhook not found" });
    }
    return sendSuccess(res, { statusCode: 200, message: "Webhook deleted" });
  } catch (error) {
    next(error);
  }
};

export const toggleWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findByIdAndUpdate(
      req.params.id,
      [{ $set: { isActive: { $not: "$isActive" } } }],
      { returnDocument: "after" },
    ).select("-secret");

    if (!webhook) {
      return sendError(res, { statusCode: 404, message: "Webhook not found" });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: `Webhook ${webhook.isActive ? "enabled" : "disabled"}`,
      data: webhook,
    });
  } catch (error) {
    next(error);
  }
};
