import { apiClient } from "../../lib/apiClient";

export const sendAgentMessage = (messages, token) =>
  apiClient.post("/agent/chat", { messages }, { token });

export const fetchBranchPeakHours = (branchId, days, token) =>
  apiClient.get(
    `/advanced-analytics/branch/${branchId}/peak-hours?days=${days || 7}`,
    { token },
  );

export const fetchStaffLeaderboard = (branchId, period, token) =>
  apiClient.get(
    `/advanced-analytics/branch/${branchId}/leaderboard?period=${period || "today"}`,
    { token },
  );

export const fetchWaitTargets = (branchId, token) =>
  apiClient.get(`/advanced-analytics/branch/${branchId}/wait-targets`, {
    token,
  });

export const updateWaitTargets = (branchId, targets, token) =>
  apiClient.put(
    `/advanced-analytics/branch/${branchId}/wait-targets`,
    { targets },
    { token },
  );

export const exportAnalyticsCSV = (branchId, date, token) =>
  apiClient.get(`/export/branch/${branchId}/csv?date=${date || ""}`, {
    token,
  });

export const fetchWebhooks = (token) => apiClient.get("/webhooks", { token });
export const createWebhook = (data, token) =>
  apiClient.post("/webhooks", data, { token });
export const deleteWebhook = (id, token) =>
  apiClient.delete(`/webhooks/${id}`, { token });
export const toggleWebhook = (id, token) =>
  apiClient.patch(`/webhooks/${id}/toggle`, {}, { token });

export const updateBranchNotifications = (branchId, data, token) =>
  apiClient.patch(`/branches/${branchId}`, data, { token });
