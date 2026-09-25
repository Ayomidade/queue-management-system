import { apiClient } from "../../lib/apiClient";

/**
 * Staff management API — JWT `/api/*` surface (Phase 13 WP6).
 *
 * All functions take a Bearer `token` from AuthContext.
 * Branch scoping (admin bank / manager branch) is enforced server-side.
 */

/** Fetch staff (admin: bank-scoped; manager: own branch) */
export const fetchStaffList = (token) =>
  apiClient.get("/staff", { token });

/** Create staff — password optional (server may return tempPassword) */
export const createStaff = (data, token) =>
  apiClient.post("/staff", data, { token });

/** Fetch managers (admin only, bank-scoped) */
export const fetchManagers = (token) =>
  apiClient.get("/managers", { token });

/**
 * Create a manager (admin only) — POST /managers.
 * Body: { name, email, branch, password? }. Omit password → server
 * generates Cue-XXXXXX-XXXXXX and returns it once as tempPassword.
 */
export const createManager = (data, token) =>
  apiClient.post("/managers", data, { token });

/** Soft-deactivate a manager (admin only) */
export const deactivateManagerApi = (managerId, token) =>
  apiClient.delete(`/managers/${managerId}`, { token });

/** Assign queues to a staff member */
export const assignQueuesToStaff = (staffId, queueIds, token) =>
  apiClient.patch(`/staff/${staffId}/queues`, { queues: queueIds }, { token });

/** Soft-deactivate a staff member */
export const deactivateStaffApi = (staffId, token) =>
  apiClient.delete(`/staff/${staffId}`, { token });

/** Fetch counters for a branch */
export const fetchBranchCounters = (branchId, token) =>
  apiClient.get(`/counters/${branchId}`, { token });

/** Create a new counter */
export const createCounter = (data, token) =>
  apiClient.post("/counters", data, { token });

/** Assign a staff member to a counter */
export const assignStaffToCounter = (counterId, staffId, token) =>
  apiClient.patch(`/counters/${counterId}/assign-staff`, { staffId }, { token });

/** Unassign staff from a counter */
export const unassignStaffFromCounter = (counterId, token) =>
  apiClient.patch(`/counters/${counterId}/unassign-staff`, {}, { token });

/** Fetch queues for the signed-in identity's scope */
export const fetchBranchQueues = (token) =>
  apiClient.get("/queues", { token });
