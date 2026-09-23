import { v1Api } from "../../lib/apiClient";

/**
 * Staff Management API
 *
 * Functions for manager/admin to manage staff and counters.
 * All functions use API key auth (v1 routes).
 */

/** Fetch all staff members (admin sees all, manager sees own branch) */
export const fetchStaffList = (apiKey) => v1Api.get("/staff", { apiKey });

/** Create a new staff member */
export const createStaff = (data, apiKey) =>
  v1Api.post("/staff", data, { apiKey });

/** Assign queues to a staff member */
export const assignQueuesToStaff = (staffId, queueIds, apiKey) =>
  v1Api.patch(`/staff/${staffId}/queues`, { queues: queueIds }, { apiKey });

/** Deactivate a staff member */
export const deactivateStaffApi = (staffId, apiKey) =>
  v1Api.delete(`/staff/${staffId}`, { apiKey });

/** Fetch counters for a branch */
export const fetchBranchCounters = (branchId, apiKey) =>
  v1Api.get(`/counters/${branchId}`, { apiKey });

/** Create a new counter */
export const createCounter = (data, apiKey) =>
  v1Api.post("/counters", data, { apiKey });

/** Assign a staff member to a counter */
export const assignStaffToCounter = (counterId, staffId, apiKey) =>
  v1Api.patch(
    `/counters/${counterId}/assign-staff`,
    { staffId },
    { apiKey },
  );

/** Unassign staff from a counter */
export const unassignStaffFromCounter = (counterId, apiKey) =>
  v1Api.patch(`/counters/${counterId}/unassign-staff`, {}, { apiKey });

/** Fetch queues for a branch (to populate queue assignment selects) */
export const fetchBranchQueues = (apiKey) => v1Api.get("/queues", { apiKey });
