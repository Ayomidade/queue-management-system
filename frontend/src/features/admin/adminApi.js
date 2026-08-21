import { apiClient } from "../../lib/apiClient";

export const fetchBranches = (token) => apiClient.get("/branches", { token });
export const createBranch = (data, token) =>
  apiClient.post("/branches", data, { token });
export const deleteBranch = (id, token) =>
  apiClient.delete(`/branches/${id}`, { token });

export const createQueue = (data, token) =>
  apiClient.post("/queues", data, { token });
export const deleteQueue = (id, token) =>
  apiClient.delete(`/queues/${id}`, { token });

export const fetchAllStaff = (token) => apiClient.get("/staff", { token });
export const createStaffAdmin = (data, token) =>
  apiClient.post("/staff", data, { token });
export const reassignStaffBranch = (staffId, branchId, token) =>
  apiClient.patch(`/staff/${staffId}/assign`, { branchId }, { token });
export const deactivateStaffAdmin = (staffId, token) =>
  apiClient.delete(`/staff/${staffId}`, { token });
