import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError, registerUnauthorizedHandler } from "../apiClient";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  registerUnauthorizedHandler(null);
});

describe("ApiError", () => {
  it("stores message, status, and errors", () => {
    const err = new ApiError("Not found", 404, ["id invalid"]);
    expect(err.message).toBe("Not found");
    expect(err.status).toBe(404);
    expect(err.errors).toEqual(["id invalid"]);
    expect(err instanceof Error).toBe(true);
  });
});

describe("apiClient.get", () => {
  it("returns parsed JSON on success", async () => {
    const { apiClient } = await import("../apiClient");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "success", data: { id: 1 } }),
    });

    const result = await apiClient.get("/test");
    expect(result).toEqual({ status: "success", data: { id: 1 } });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/test"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("throws ApiError on non-ok response", async () => {
    const { apiClient } = await import("../apiClient");
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({ message: "Bad request", errors: ["field required"] }),
    });

    await expect(apiClient.get("/test")).rejects.toThrow(ApiError);
  });

  it("calls unauthorized handler on 401 with token", async () => {
    const { apiClient } = await import("../apiClient");
    const handler = vi.fn();
    registerUnauthorizedHandler(handler);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: "Unauthorized" }),
    });

    try {
      await apiClient.get("/test", { token: "some-token" });
    } catch {
      // expected
    }
    expect(handler).toHaveBeenCalled();
  });

  it("does not call unauthorized handler on 401 without token", async () => {
    const { apiClient } = await import("../apiClient");
    const handler = vi.fn();
    registerUnauthorizedHandler(handler);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: "Unauthorized" }),
    });

    try {
      await apiClient.get("/test");
    } catch {
      // expected
    }
    expect(handler).not.toHaveBeenCalled();
  });
});
