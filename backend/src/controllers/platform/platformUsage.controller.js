import ApiKey from "../../models/apiKey.model.js";
import ApiKeyUsage from "../../models/apiKeyUsage.model.js";
import ApiKeyRequest from "../../models/apiKeyRequest.model.js";
import { sendSuccess } from "../../utils/response.js";
import { usageDateKey } from "../../utils/keyWrap.js";

/**
 * Platform usage controller — API usage monitoring for superadmin.
 *
 * Data sources:
 * - ApiKey.requestCount        → lifetime total per key
 * - ApiKeyUsage {apiKey,date}  → daily buckets for charts
 * - ApiKeyRequest              → pending request counts
 */

/**
 * GET /api/platform/overview
 * High-level platform stats for the Overview tab.
 */
export const getPlatformOverview = async (req, res, next) => {
  try {
    const today = usageDateKey();
    const sevenDaysAgo = usageDateKey(
      new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    );

    const [totalKeys, activeKeys, pendingRequests, todayUsage, weekUsage] =
      await Promise.all([
        ApiKey.countDocuments(),
        ApiKey.countDocuments({ isActive: true }),
        ApiKeyRequest.countDocuments({ status: "pending" }),
        ApiKeyUsage.aggregate([
          { $match: { date: today } },
          { $group: { _id: null, total: { $sum: "$count" } } },
        ]),
        ApiKeyUsage.aggregate([
          { $match: { date: { $gte: sevenDaysAgo, $lte: today } } },
          { $group: { _id: null, total: { $sum: "$count" } } },
        ]),
      ]);

    return sendSuccess(res, {
      statusCode: 200,
      message: "Platform overview fetched",
      data: {
        totalKeys,
        activeKeys,
        suspendedKeys: totalKeys - activeKeys,
        pendingRequests,
        requestsToday: todayUsage[0]?.total || 0,
        requestsLast7Days: weekUsage[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/platform/usage?days=7
 * Daily request totals for the last N days (default 7),
 * plus a per-key breakdown for the same window.
 */
export const getPlatformUsage = async (req, res, next) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);
    const end = new Date();
    const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
    const startKey = usageDateKey(start);
    const endKey = usageDateKey(end);

    const [daily, byKey] = await Promise.all([
      ApiKeyUsage.aggregate([
        { $match: { date: { $gte: startKey, $lte: endKey } } },
        { $group: { _id: "$date", total: { $sum: "$count" } } },
        { $sort: { _id: 1 } },
      ]),
      ApiKeyUsage.aggregate([
        { $match: { date: { $gte: startKey, $lte: endKey } } },
        { $group: { _id: "$apiKey", total: { $sum: "$count" } } },
        { $sort: { total: -1 } },
        { $limit: 50 },
      ]),
    ]);

    // Resolve key metadata for the per-key breakdown.
    const keyIds = byKey.map((e) => e._id);
    const keyDocs = await ApiKey.find({ _id: { $in: keyIds } })
      .select("bankName label keyPrefix isActive requestCount")
      .lean();
    const keyById = Object.fromEntries(keyDocs.map((k) => [String(k._id), k]));

    const byKeyWithMeta = byKey.map((entry) => ({
      apiKey: entry._id,
      requests: entry.total,
      bankName: keyById[String(entry._id)]?.bankName || "Unknown",
      label: keyById[String(entry._id)]?.label || "",
      keyPrefix: keyById[String(entry._id)]?.keyPrefix || "",
      isActive: keyById[String(entry._id)]?.isActive ?? null,
      lifetimeRequests: keyById[String(entry._id)]?.requestCount || 0,
    }));

    return sendSuccess(res, {
      statusCode: 200,
      message: "Usage fetched",
      data: {
        days,
        startDate: startKey,
        endDate: endKey,
        daily: daily.map((d) => ({ date: d._id, requests: d.total })),
        byKey: byKeyWithMeta,
      },
    });
  } catch (error) {
    next(error);
  }
};
