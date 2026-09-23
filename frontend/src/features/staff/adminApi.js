import { v1Api } from "../../lib/apiClient";

/**
 * Admin & Analytics API
 *
 * Functions for admin overview and branch analytics.
 * All functions use API key auth (v1 routes).
 */

/** Admin overview — cross-branch dashboard with managers and staff counts */
export const fetchAdminOverview = (apiKey) => v1Api.get("/admin", { apiKey });

/** Branch analytics — live dashboard for a single branch */
export const fetchBranchAnalytics = (branchId, apiKey) =>
  v1Api.get(`/analytics/branch/${branchId}`, { apiKey });

/** Branch staff performance — tickets served per staff member today */
export const fetchBranchStaffPerformance = (branchId, apiKey) =>
  v1Api.get(`/analytics/branch/${branchId}/staff-performance`, { apiKey });

/** Create a new branch */
export const createBranch = (data, apiKey) =>
  v1Api.post("/branches", data, { apiKey });
