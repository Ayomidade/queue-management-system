import Branch from "../models/branch.model.js";
import Queue from "../models/queue.model.js";
import Counter from "../models/counter.model.js";
import Ticket from "../models/ticket.model.js";
import { sendSuccess } from "../utils/response.js";
import { parsePagination, paginatedResponse } from "../utils/pagination.js";

export const createBranch = async (req, res, next) => {
  try {
    const { name, location, address, phone, email, coordinates, operatingHours } = req.body;

    // Bank scope: API-key path uses key.bankName; JWT dashboard uses Admin.bank.
    const bank = req.bankName || (req.role === "admin" ? req.user?.bank : null);
    const branchData = { name, location, address, phone, email, coordinates, operatingHours };
    if (bank) {
      branchData.bank = bank;
    }

    const branch = await Branch.create(branchData);
    return sendSuccess(res, {
      statusCode: 201,
      message: "Branch created successfully",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBranches = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { isActive: true };

    // Bank scope: API-key (req.bankName) or JWT admin (Admin.bank).
    const bank = req.bankName || (req.role === "admin" ? req.user?.bank : null);
    if (bank) {
      filter.bank = bank;
    }

    const [total, branches] = await Promise.all([
      Branch.countDocuments(filter),
      Branch.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);
    return sendSuccess(res, {
      statusCode: 200,
      message: "Branches fetched successfully",
      ...paginatedResponse(branches, total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

export const getSingleBranch = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Bank scope: API-key or JWT admin (Admin.bank).
    const bank = req.bankName || (req.role === "admin" ? req.user?.bank : null);
    const filter = { _id: id };
    if (bank) {
      filter.bank = bank;
    }
    if (req.bankName) {
      filter.bank = req.bankName;
    }

    const branch = await Branch.findOne(filter);

    if (!branch) {
      const error = new Error("Branch not found");
      error.statusCode = 404;
      return next(error);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Branch fetched successfully",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      "name",
      "location",
      "address",
      "phone",
      "email",
      "coordinates",
      "operatingHours",
      "maxAppointmentsPerSlot",
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      const error = new Error("No valid fields provided for update");
      error.statusCode = 400;
      return next(error);
    }

    // Bank scope: API-key or JWT admin (Admin.bank).
    const bank = req.bankName || (req.role === "admin" ? req.user?.bank : null);
    const filter = { _id: id };
    if (bank) {
      filter.bank = bank;
    }

    const branch = await Branch.findOneAndUpdate(filter, updates, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!branch) {
      const error = new Error("Branch not found");
      error.statusCode = 404;
      return next(error);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Branch updated successfully",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bank = req.bankName || (req.role === "admin" ? req.user?.bank : null);
    const filter = { _id: id, isActive: true };
    if (bank) {
      filter.bank = bank;
    }

    const branch = await Branch.findOneAndUpdate(filter, { isActive: false });

    if (!branch) {
      const error = new Error("Branch not found");
      error.statusCode = 404;
      return next(error);
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Branch deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicBranch = async (req, res, next) => {
  try {
    const { branchId } = req.params;

    // Optional bank-scoping: validate branch belongs to this bank if in v1 mode
    const filter = { _id: branchId, isActive: true };
    if (req.bankName) {
      filter.bank = req.bankName;
    }

    const branch = await Branch.findOne(filter).select("name location isActive");

    if (!branch) {
      const error = new Error("Branch not found");
      error.statusCode = 404;
      return next(error);
    }

    const [queues, counters, waitingCounts] = await Promise.all([
      Queue.find({ branch: branchId, isActive: true }).select("serviceName lastTicketNumber"),
      Counter.find({ branch: branchId }).select("label isOpen"),
      Ticket.aggregate([
        { $match: { branch: branch._id, status: "waiting" } },
        { $group: { _id: "$queue", waiting: { $sum: 1 } } },
      ]),
    ]);

    const waitingMap = waitingCounts.reduce(
      (map, w) => ({ ...map, [w._id.toString()]: w.waiting }),
      {},
    );

    return sendSuccess(res, {
      statusCode: 200,
      message: "Branch info fetched successfully",
      data: {
        branch: {
          id: branch._id,
          name: branch.name,
          location: branch.location,
        },
        queues: queues.map((q) => ({
          id: q._id,
          serviceName: q.serviceName,
          waiting: waitingMap[q._id.toString()] || 0,
        })),
        counters: {
          total: counters.length,
          open: counters.filter((c) => c.isOpen).length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getNearestBranches = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      const error = new Error("lat and lng query parameters are required");
      error.statusCode = 400;
      return next(error);
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (isNaN(userLat) || isNaN(userLng)) {
      const error = new Error("Invalid lat/lng values");
      error.statusCode = 400;
      return next(error);
    }

    const branches = await Branch.find({
      isActive: true,
      "coordinates.lat": { $ne: null },
      "coordinates.lng": { $ne: null },
    });

    const branchIds = branches.map((b) => b._id);

    const [waitingCounts, counterCounts] = await Promise.all([
      Ticket.aggregate([
        { $match: { branch: { $in: branchIds }, status: "waiting" } },
        { $group: { _id: "$branch", waiting: { $sum: 1 } } },
      ]),
      Counter.aggregate([
        { $match: { branch: { $in: branchIds } } },
        {
          $group: {
            _id: "$branch",
            total: { $sum: 1 },
            open: { $sum: { $cond: ["$isOpen", 1, 0] } },
          },
        },
      ]),
    ]);

    const waitingMap = waitingCounts.reduce(
      (map, w) => ({ ...map, [String(w._id)]: w.waiting }),
      {},
    );
    const counterMap = counterCounts.reduce(
      (map, c) => ({ ...map, [String(c._id)]: c }),
      {},
    );

    const enriched = branches.map((b) => {
      const dist = haversineKm(
        userLat,
        userLng,
        b.coordinates.lat,
        b.coordinates.lng,
      );
      const id = String(b._id);
      const counters = counterMap[id] || { total: 0, open: 0 };
      return {
        id: b._id,
        name: b.name,
        location: b.location,
        address: b.address,
        distanceKm: Math.round(dist * 10) / 10,
        waiting: waitingMap[id] || 0,
        counters: { total: counters.total, open: counters.open },
      };
    });

    enriched.sort((a, b) => a.distanceKm - b.distanceKm);

    return sendSuccess(res, {
      statusCode: 200,
      message: "Nearest branches fetched",
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
};
