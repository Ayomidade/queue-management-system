import crypto from "crypto";
import Webhook from "../models/webhook.model.js";
import { validateWebhookUrl } from "../utils/security.js";

const SIGNATURE_HEADER = "x-cue-signature";
const TIMEOUT_MS = 10000;

const signPayload = (payload, secret) => {
  if (!secret) return null;
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
};

export const dispatchWebhook = async (event, payload, branchId = null) => {
  try {
    const query = { isActive: true, events: event };
    if (branchId) {
      query.$or = [{ branch: branchId }, { branch: null }];
    } else {
      query.branch = null;
    }

    const hooks = await Webhook.find(query);

    const results = await Promise.allSettled(
      hooks.map(async (hook) => {
        const body = {
          event,
          timestamp: new Date().toISOString(),
          data: payload,
        };

        const headers = { "Content-Type": "application/json" };
        const sig = signPayload(body, hook.secret);
        if (sig) headers[SIGNATURE_HEADER] = sig;

        const validation = await validateWebhookUrl(hook.url);
        if (!validation.valid) {
          return { hookId: hook._id, status: "error", error: validation.message };
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
          const res = await fetch(validation.url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
            redirect: "manual",
          });

          clearTimeout(timer);

          if (!res.ok) {
            await Webhook.findByIdAndUpdate(hook._id, {
              $inc: { failureCount: 1 },
              lastTriggeredAt: new Date(),
            });
            return { hookId: hook._id, status: "failed", code: res.status };
          }

          await Webhook.findByIdAndUpdate(hook._id, {
            failureCount: 0,
            lastTriggeredAt: new Date(),
          });
          return { hookId: hook._id, status: "delivered" };
        } catch (err) {
          clearTimeout(timer);
          await Webhook.findByIdAndUpdate(hook._id, {
            $inc: { failureCount: 1 },
            lastTriggeredAt: new Date(),
          });
          return { hookId: hook._id, status: "error", error: err.message };
        }
      }),
    );

    return results.map((r) => r.value || r.reason);
  } catch {
    return [];
  }
};
