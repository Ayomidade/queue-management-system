import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireStaffServing, authorize } from "../../src/middlewares/auth.middleware.js";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

describe("requireStaffServing (WP5 — manager/admin cannot serve)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows staff (kind=staff)", () => {
    requireStaffServing({ kind: "staff", role: "staff" }, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("allows staff when only role is set (legacy tokens)", () => {
    requireStaffServing({ role: "staff" }, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("blocks manager with 403 and a clear message", () => {
    const res = mockRes();
    requireStaffServing({ kind: "manager", role: "manager" }, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Managers cannot serve tickets",
      }),
    );
  });

  it("blocks admin with 403", () => {
    const res = mockRes();
    requireStaffServing({ kind: "admin", role: "admin" }, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Only staff can serve tickets",
      }),
    );
  });

  it("blocks superadmin with 403", () => {
    const res = mockRes();
    requireStaffServing({ kind: "superadmin" }, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("blocks unauthenticated (no kind/role)", () => {
    const res = mockRes();
    requireStaffServing({}, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("prefers kind over role when they disagree", () => {
    // kind is the signed claim from the four-model split JWT.
    const res = mockRes();
    requireStaffServing({ kind: "manager", role: "staff" }, res, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("authorize still works for oversight roles (regression)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows manager on authorize('manager','admin')", () => {
    authorize("manager", "admin")(
      { user: { _id: "x" }, role: "manager" },
      mockRes(),
      mockNext,
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it("blocks manager on authorize('staff')", () => {
    const res = mockRes();
    authorize("staff")(
      { user: { _id: "x" }, role: "manager" },
      res,
      mockNext,
    );
    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
