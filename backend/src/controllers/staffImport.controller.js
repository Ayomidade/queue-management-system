import Staff from "../models/staff.model.js";
import { sendSuccess, sendError } from "../utils/response.js";

const parseCSV = (text) => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length < headers.length) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });
    rows.push(row);
  }

  return rows;
};

export const bulkImportStaff = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, {
        statusCode: 400,
        message: "CSV file is required",
      });
    }

    const csv = req.file.buffer.toString("utf-8");
    const rows = parseCSV(csv);

    if (!rows.length) {
      return sendError(res, {
        statusCode: 400,
        message: "No valid rows found in CSV. Expected headers: name, email, password, role (optional, default: staff)",
      });
    }

    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      if (!row.name || !row.email || !row.password) {
        results.errors.push({
          email: row.email || "unknown",
          error: "Missing name, email, or password",
        });
        results.skipped++;
        continue;
      }

      const existing = await Staff.findOne({ email: row.email.toLowerCase() });
      if (existing) {
        results.errors.push({ email: row.email, error: "Already exists" });
        results.skipped++;
        continue;
      }

      try {
        await Staff.create({
          name: row.name,
          email: row.email.toLowerCase(),
          password: row.password,
          role: row.role === "manager" ? "manager" : "staff",
          branch: req.user.role === "manager" ? req.user.branch : row.branch || null,
          isEmailVerified: false,
        });
        results.created++;
      } catch (err) {
        results.errors.push({ email: row.email, error: err.message });
        results.skipped++;
      }
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Import complete",
      data: results,
    });
  } catch (error) {
    next(error);
  }
};
