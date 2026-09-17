import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireScope, apiKeyRateLimit } from "../../src/middlewares/apiKey.middleware.js";

/**
 * Tests for API Key middleware
 *
 * Tests the requireScope and apiKeyRateLimit middlewares.
 * authenticateApiKey is tested separately since it requires MongoDB mocking.
 */

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

describe("requireScope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls next when key has the required scope", () => {
    const req = {
      apiKey: { scopes: ["tickets:read", "tickets:write"] },
    };
    const res = mockRes();
    requireScope("tickets:read")(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("calls next when key has admin scope (bypasses scope check)", () => {
    const req = {
      apiKey: { scopes: ["admin"] },
    };
    const res = mockRes();
    requireScope("tickets:write")(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("returns 403 when key is missing required scope", () => {
    const req = {
      apiKey: { scopes: ["branches:read"] },
    };
    const res = mockRes();
    requireScope("tickets:write")(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Missing required scope(s)"),
      }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("returns 401 when apiKey is not set (auth not run first)", () => {
    const req = {};
    const res = mockRes();
    requireScope("tickets:read")(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("checks for multiple required scopes", () => {
    const req = {
      apiKey: { scopes: ["tickets:read"] },
    };
    const res = mockRes();
    requireScope("tickets:read", "tickets:write")(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("passes when key has all required scopes", () => {
    const req = {
      apiKey: { scopes: ["tickets:read", "tickets:write", "analytics:read"] },
    };
    const res = mockRes();
    requireScope("tickets:read", "tickets:write")(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("works with empty scopes array", () => {
    const req = {
      apiKey: { scopes: [] },
    };
    const res = mockRes();
    requireScope("tickets:read")(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("apiKeyRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls next and sets rate limit headers", () => {
    const req = {
      apiKey: { _id: "test123", rateLimit: 100 },
    };
    const res = mockRes();
    apiKeyRateLimit(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 100);
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 99);
    expect(res.setHeader).toHaveBeenCalledWith(
      "X-RateLimit-Reset",
      expect.any(Number),
    );
  });

  it("returns 401 when apiKey is not set", () => {
    const req = {};
    const res = mockRes();
    apiKeyRateLimit(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("allows requests within rate limit", () => {
    const req = {
      apiKey: { _id: "test456", rateLimit: 5 },
    };
    const res = mockRes();

    // Make 5 requests (within limit)
    for (let i = 0; i < 5; i++) {
      apiKeyRateLimit(req, res, mockNext);
    }
    expect(mockNext).toHaveBeenCalledTimes(5);
  });
});
