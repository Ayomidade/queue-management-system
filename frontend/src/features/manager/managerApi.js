import { apiClient } from "../../lib/apiClient";

export const fetchBranchAnalytics = (branchId, token) =>
  apiClient.get(`/analytics/branch/${branchId}`, { token });
export const fetchStaffPerformance = (branchId, token) =>
  apiClient.get(`/analytics/branch/${branchId}/staff-performance`, { token });

export const fetchStaffList = (token) => apiClient.get("/staff", { token });
export const createStaff = (data, token) =>
  apiClient.post("/staff", data, { token });
export const deactivateStaff = (staffId, token) =>
  apiClient.delete(`/staff/${staffId}`, { token });

export const fetchBranchCounters = (branchId, token) =>
  apiClient.get(`/counters/${branchId}`, { token });
export const createCounter = (data, token) =>
  apiClient.post("/counters", data, { token });
export const assignStaffToCounter = (counterId, staffId, token) =>
  apiClient.patch(
    `/counters/${counterId}/assign-staff`,
    { staffId },
    { token },
  );
export const unassignStaffFromCounter = (counterId, token) =>
  apiClient.patch(`/counters/${counterId}/unassign-staff`, {}, { token });
export const openCounter = (counterId, token) =>
  apiClient.patch(`/counters/${counterId}/open`, {}, { token });
export const closeCounter = (counterId, token) =>
  apiClient.patch(`/counters/${counterId}/close`, {}, { token });

export const fetchBranchTickets = (branchId, status, token) =>
  apiClient.get(
    `/tickets/branch/${branchId}${status ? `?status=${status}` : ""}`,
    { token },
  );
export const recallTicket = (ticketId, token) =>
  apiClient.patch(`/tickets/${ticketId}/recall`, {}, { token });
export const setTicketPriority = (ticketId, priority, token) =>
  apiClient.patch(`/tickets/${ticketId}/priority`, { priority }, { token });

export const closeDay = (token) =>
  apiClient.post("/tickets/close-day", {}, { token });
export const openDay = (token) =>
  apiClient.post("/tickets/open-day", {}, { token });
