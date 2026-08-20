import { apiClient } from "../../lib/apiClient";

export const registerCustomer = (data) =>
  apiClient.post("/auth/register", data);
export const loginCustomer = (data) => apiClient.post("/auth/login", data);
export const loginStaff = (data) => apiClient.post("/staff/login", data);
