import mongoose from "mongoose";
import Ticket from "../models/ticket.model.js";
import Queue from "../models/queue.model.js";
import Staff from "../models/staff.model.js";
import { sendSuccess, sendError } from "../utils/response.js";

const getDayRange = (dateInput) => {
  const start = dateInput ? new Date(dateInput) : new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const exportAnalyticsCSV = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { date } = req.query;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return sendError(res, { statusCode: 400, message: "Invalid branch ID" });
    }

    if (req.role === "manager" && String(req.user.branch) !== branchId) {
      return sendError(res, { statusCode: 403, message: "Access denied" });
    }

    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    const { start, end } = getDayRange(date);

    const [statusCounts, tickets, staffPerf] = await Promise.all([
      Ticket.aggregate([
        { $match: { branch: branchObjectId, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Ticket.find({
        branch: branchObjectId,
        createdAt: { $gte: start, $lte: end },
      })
        .populate("queue", "serviceName")
        .sort({ createdAt: 1 }),
      Ticket.aggregate([
        {
          $match: {
            branch: branchObjectId,
            status: "completed",
            servedBy: { $ne: null },
            createdAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: "$servedBy", ticketsServed: { $sum: 1 } } },
        { $sort: { ticketsServed: -1 } },
      ]),
    ]);

    const staffDocs = await Staff.find({
      _id: { $in: staffPerf.map((e) => e._id) },
    }).select("name");
    const nameMap = Object.fromEntries(
      staffDocs.map((s) => [s._id.toString(), s.name]),
    );

    const header =
      "Ticket Number,Status,Priority,Service,Created At,Called At,Completed At,Served By\n";
    const rows = tickets.map((t) => {
      const waitMs = t.calledAt && t.createdAt ? (t.calledAt - t.createdAt) / 60000 : "";
      const handleMs = t.completedAt && t.calledAt ? (t.completedAt - t.calledAt) / 60000 : "";
      return [
        t.ticketNumber,
        t.status,
        t.priority,
        t.queue?.serviceName || "",
        t.createdAt?.toISOString() || "",
        t.calledAt?.toISOString() || "",
        t.completedAt?.toISOString() || "",
        nameMap[t.servedBy?.toString()] || "",
      ].join(",");
    });

    const csv = header + rows.join("\n");

    const summary = Object.fromEntries(statusCounts.map((e) => [e._id, e.count]));
    const summaryHeader = "\n\nSummary\nStatus,Count\n";
    const summaryRows = Object.entries(summary)
      .map(([k, v]) => `${k},${v}`)
      .join("\n");
    const staffHeader = "\n\nStaff Performance\nName,Tickets Served\n";
    const staffRows = staffPerf
      .map((e) => `${nameMap[e._id.toString()] || "Unknown"},${e.ticketsServed}`)
      .join("\n");

    const fullCSV = csv + summaryHeader + summaryRows + staffHeader + staffRows;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="analytics-${branchId}-${start.toISOString().slice(0, 10)}.csv"`,
    );
    return res.send(fullCSV);
  } catch (error) {
    next(error);
  }
};

export const exportAnalyticsPDF = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { date } = req.query;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return sendError(res, { statusCode: 400, message: "Invalid branch ID" });
    }

    if (req.role === "manager" && String(req.user.branch) !== branchId) {
      return sendError(res, { statusCode: 403, message: "Access denied" });
    }

    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    const { start, end } = getDayRange(date);

    const [statusCounts, waitAgg, staffPerf] = await Promise.all([
      Ticket.aggregate([
        { $match: { branch: branchObjectId, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        {
          $match: {
            branch: branchObjectId,
            createdAt: { $gte: start, $lte: end },
            calledAt: { $ne: null },
          },
        },
        { $group: { _id: null, avgWaitMs: { $avg: { $subtract: ["$calledAt", "$createdAt"] } } } },
      ]),
      Ticket.aggregate([
        {
          $match: {
            branch: branchObjectId,
            status: "completed",
            servedBy: { $ne: null },
            createdAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: "$servedBy", ticketsServed: { $sum: 1 } } },
        { $sort: { ticketsServed: -1 } },
      ]),
    ]);

    const staffDocs = await Staff.find({
      _id: { $in: staffPerf.map((e) => e._id) },
    }).select("name");
    const nameMap = Object.fromEntries(
      staffDocs.map((s) => [s._id.toString(), s.name]),
    );

    const counts = Object.fromEntries(statusCounts.map((e) => [e._id, e.count]));
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    const avgWait = waitAgg.length ? Math.round(waitAgg[0].avgWaitMs / 60000) : 0;

    const report = {
      date: start.toISOString().slice(0, 10),
      totalTickets: total,
      avgWaitMinutes: avgWait,
      statusBreakdown: counts,
      staffPerformance: staffPerf.map((e) => ({
        name: nameMap[e._id.toString()] || "Unknown",
        ticketsServed: e.ticketsServed,
      })),
    };

    const html = `
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: system-ui, sans-serif; padding: 40px; color: #1a1a1a; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #666; margin-bottom: 30px; }
  table { border-collapse: collapse; width: 100%; margin: 20px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
  .stat-box { background: #f9f9f9; padding: 16px; border-radius: 8px; }
  .stat-value { font-size: 28px; font-weight: 700; }
  .stat-label { color: #666; font-size: 13px; }
</style></head>
<body>
  <h1>Cue Analytics Report</h1>
  <p class="subtitle">Branch: ${branchId} | Date: ${report.date}</p>
  <div class="stat-grid">
    <div class="stat-box"><div class="stat-value">${report.totalTickets}</div><div class="stat-label">Total Tickets</div></div>
    <div class="stat-box"><div class="stat-value">${report.avgWaitMinutes}m</div><div class="stat-label">Avg Wait</div></div>
    <div class="stat-box"><div class="stat-value">${report.statusBreakdown.completed || 0}</div><div class="stat-label">Completed</div></div>
  </div>
  <h2>Status Breakdown</h2>
  <table>
    <tr><th>Status</th><th>Count</th></tr>
    ${Object.entries(report.statusBreakdown).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}
  </table>
  <h2>Staff Performance</h2>
  <table>
    <tr><th>Name</th><th>Tickets Served</th></tr>
    ${report.staffPerformance.map((s) => `<tr><td>${s.name}</td><td>${s.ticketsServed}</td></tr>`).join("")}
  </table>
  <p style="color:#999; margin-top:40px; font-size:12px;">Generated by Cue Queue Management System</p>
</body></html>`;

    res.setHeader("Content-Type", "text/html");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="analytics-${branchId}-${report.date}.html"`,
    );
    return res.send(html);
  } catch (error) {
    next(error);
  }
};
