import Webhook from "../models/webhook.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import crypto from "crypto";
import Branch from "../models/branch.model.js";
import { validateWebhookUrl } from "../utils/security.js";

export const createWebhook = async (req, res, next) => {
  try {
    const { url, events, branchId } = req.body;

    if (!url || !events || !events.length) {
      return sendError(res, {
        statusCode: 400,
        message: "url and events array are required",
      });
    }

    if (!branchId) {
      return sendError(res, {
        statusCode: 400,
        message: "branchId is required for tenant webhooks",
      });
    }

    const branch = await Branch.findById(branchId);
    const allowedBranch =
      branch &&
      (req.role === "manager"
        ? String(req.user.branch) === String(branch._id)
        : req.user?.bank && branch.bank === req.user.bank);
    if (!allowedBranch) {
      return sendError(res, { statusCode: 403, message: "Branch is outside your tenant" });
    }

    const validation = await validateWebhookUrl(url);
    if (!validation.valid) {
      return sendError(res, { statusCode: 400, message: validation.message });
    }

    const webhook = await Webhook.create({
      branch: branch._id,
      url: validation.url,
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
      filter.branch = req.user.branch;
    } else if (req.role === "admin" && req.user.bank) {
      const branches = await Branch.find({ bank: req.user.bank }).select("_id");
      filter.branch = { $in: branches.map((branch) => branch._id) };
    } else {
      filter.branch = null;
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
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) {
      return sendError(res, { statusCode: 404, message: "Webhook not found" });
    }
    const branch = await Branch.findById(webhook.branch);
    const allowed =
      branch &&
      (req.role === "manager"
        ? String(req.user.branch) === String(branch._id)
        : req.user?.bank && branch.bank === req.user.bank);
    if (!allowed) {
      return sendError(res, { statusCode: 404, message: "Webhook not found" });
    }
    await webhook.deleteOne();
    return sendSuccess(res, { statusCode: 200, message: "Webhook deleted" });
  } catch (error) {
    next(error);
  }
};

export const toggleWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) {
      return sendError(res, { statusCode: 404, message: "Webhook not found" });
    }
    const branch = await Branch.findById(webhook.branch);
    const allowed =
      branch &&
      (req.role === "manager"
        ? String(req.user.branch) === String(branch._id)
        : req.user?.bank && branch.bank === req.user.bank);
    if (!allowed) {
      return sendError(res, { statusCode: 404, message: "Webhook not found" });
    }
    webhook.isActive = !webhook.isActive;
    await webhook.save();
    return sendSuccess(res, {
      statusCode: 200,
      message: `Webhook ${webhook.isActive ? "enabled" : "disabled"}`,
      data: {
        id: webhook._id,
        url: webhook.url,
        events: webhook.events,
        branch: webhook.branch,
        isActive: webhook.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};
