import Branch from "../models/branch.model.js";
import { sendError } from "../utils/response.js";

/**
 * Bank Scope Middleware
 *
 * Ensures multi-tenant data isolation by filtering queries to only
 * return data belonging to the bank identified by the API key.
 *
 * This middleware:
 * 1. Finds all branches belonging to `req.bankName`
 * 2. Attaches the branch IDs to `req.bankBranchIds`
 * 3. Attaches a pre-built filter `{ branch: { $in: [...] } }` to `req.bankFilter`
 *
 * Downstream controllers use `req.bankFilter` to scope their queries.
 * This is a "middleware sets up, controller uses" pattern.
 *
 * Usage in v1 routes:
 *   router.get("/", authenticateApiKey, bankScope, listBranches)
 *
 * In the controller:
 *   const filter = { ...req.bankFilter, isActive: true };
 *   const branches = await Branch.find(filter);
 *
 * If the bank has no branches yet, the middleware still passes —
 * the controller will just return empty results.
 */

export const bankScope = async (req, res, next) => {
  try {
    // API key authentication must run first
    if (!req.bankName) {
      return sendError(res, {
        statusCode: 401,
        message: "Bank scope requires API key authentication",
      });
    }

    // Find all active branches belonging to this bank
    const branches = await Branch.find({
      bank: req.bankName,
      isActive: true,
    }).select("_id");

    // Extract branch IDs for use in downstream queries
    const bankBranchIds = branches.map((b) => b._id);

    // Pre-built filter for controllers to spread into their queries.
    // Usage: { ...req.bankFilter, status: "waiting" }
    req.bankBranchIds = bankBranchIds;
    req.bankFilter = { branch: { $in: bankBranchIds } };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate Branch Ownership Middleware
 *
 * Checks that a specific branch belongs to the requesting bank.
 * Used for endpoints that take a branchId parameter (e.g., GET /v1/board/:branchId).
 *
 * If the branch doesn't belong to the bank, returns 404 (not 403)
 * to prevent leaking information about other banks' branches.
 *
 * Usage:
 *   router.get("/:branchId", authenticateApiKey, bankScope, validateBranchOwnership, handler)
 */

export const validateBranchOwnership = async (req, res, next) => {
  try {
    const branchId = req.params.branchId || req.params.id || req.body.branchId;

    if (!branchId) {
      return sendError(res, {
        statusCode: 400,
        message: "Branch ID is required",
      });
    }

    // Check if this branch belongs to the requesting bank
    const branch = await Branch.findOne({
      _id: branchId,
      bank: req.bankName,
      isActive: true,
    });

    // console.log(req)

    if (!branch) {
      // Return 404, not 403, to avoid leaking other banks' branch IDs
      return sendError(res, {
        statusCode: 404,
        message: "Branch not found",
      });
    }

    // Attach the branch document for downstream use
    req.branch = branch;
    next();
  } catch (error) {
    next(error);
  }
};
