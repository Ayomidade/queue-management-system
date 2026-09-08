import { apiClient } from "../../lib/apiClient";

export const getNearestBranches = ({ lat, lng }) =>
  apiClient.get(`/branches/nearest?lat=${lat}&lng=${lng}`);
