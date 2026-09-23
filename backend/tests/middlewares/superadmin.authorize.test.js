import { describe, it, expect, vi, beforeEach } from "vitest";
import { authorize } from "../../src/middlewares/auth.middleware.js";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

/**
 * Superadmin role tests for authorize().
 *
 * Superadmin is a platform operator (JWT at /platform) and must only
 * pass routes that explicitly list "superadmin". Bank routes list
 * "admin"/"manager" only — superadmin does NOT inherit bank access.
 */
describe("authorize — superadmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows superadmin on superadmin-only routes", () => {
    const req = { user: { id: "1" }, role: "superadmin" };
    const res = mockRes();
    authorize("superadmin")(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("rejects superadmin from bank admin routes", () => {
    const req = { user: { id: "1" }, role: "superadmin" };
    const res = mockRes();
    authorize("admin")(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("rejects superadmin from admin+manager routes", () => {
    const req = { user: { id: "1" }, role: "superadmin" };
    const res = mockRes();
    authorize("admin", "manager")(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("rejects bank admin from superadmin-only routes", () => {
    const req = { user: { id: "1" }, role: "admin" };
    const res = mockRes();
    authorize("superadmin")(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
