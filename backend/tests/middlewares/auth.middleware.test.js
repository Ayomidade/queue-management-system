import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { authorize } from "../../src/middlewares/auth.middleware.js";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

describe("authorize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls next when role is allowed", () => {
    const req = { user: { id: "1" }, role: "admin" };
    const res = mockRes();
    authorize("admin", "manager")(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("returns 403 when role is not allowed", () => {
    const req = { user: { id: "1" }, role: "customer" };
    const res = mockRes();
    authorize("admin", "manager")(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Access denied: insufficient permissions" }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("returns 401 when user is not set", () => {
    const req = {};
    const res = mockRes();
    authorize("admin")(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Not authenticated" }),
    );
  });

  it("works with a single allowed role", () => {
    const req = { user: { id: "1" }, role: "staff" };
    const res = mockRes();
    authorize("staff")(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("rejects when single role does not match", () => {
    const req = { user: { id: "1" }, role: "staff" };
    const res = mockRes();
    authorize("admin")(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
