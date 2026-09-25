import { apiClient } from "../../lib/apiClient";

/**
 * Admin & analytics API — JWT `/api/*` surface (Phase 13 WP6).
 * Bank scope comes from Admin.bank / Manager.branch server-side.
 */

/** Admin overview — cross-branch dashboard for this admin's bank */
export const fetchAdminOverview = (token) =>
  apiClient.get("/admin/overview", { token });

/** Branch analytics — live dashboard for a single branch */
export const fetchBranchAnalytics = (branchId, token) =>
  apiClient.get(`/analytics/branch/${branchId}`, { token });

/** Branch staff performance — tickets served per staff member today */
export const fetchBranchStaffPerformance = (branchId, token) =>
  apiClient.get(`/analytics/branch/${branchId}/staff-performance`, { token });

/** Create a new branch (admin) */
export const createBranch = (data, token) =>
  apiClient.post("/branches", data, { token });

/** List branches (admin) */
export const fetchBranches = (token) =>
  apiClient.get("/branches", { token });
