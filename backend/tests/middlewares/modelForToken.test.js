import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { modelForToken, authorize } from "../../src/middlewares/auth.middleware.js";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

/**
 * modelForToken — picks which of the four collections a JWT refers to.
 *
 * After the split, every login signs { id, kind, role } where kind and
 * role are the same string. Old tokens that only have `role` still work
 * (fallback), unknown kinds return null (protect → 401).
 */
describe("modelForToken", () => {
  it("resolves kind=staff to the Staff model", () => {
    const Model = modelForToken({ id: "x", kind: "staff", role: "staff" });
    expect(Model).toBeTruthy();
    expect(Model.modelName).toBe("Staff");
  });

  it("resolves kind=admin to the Admin model", () => {
    const Model = modelForToken({ id: "x", kind: "admin", role: "admin" });
    expect(Model.modelName).toBe("Admin");
  });

  it("resolves kind=manager to the Manager model", () => {
    const Model = modelForToken({ id: "x", kind: "manager", role: "manager" });
    expect(Model.modelName).toBe("Manager");
  });

  it("resolves kind=superadmin to the Superadmin model", () => {
    const Model = modelForToken({ id: "x", kind: "superadmin", role: "superadmin" });
    expect(Model.modelName).toBe("Superadmin");
  });

  it("falls back to role claim for pre-split tokens (no kind)", () => {
    const Model = modelForToken({ id: "x", role: "admin" });
    expect(Model.modelName).toBe("Admin");
  });

  it("returns null for unknown kind", () => {
    expect(modelForToken({ id: "x", kind: "customer", role: "customer" })).toBeNull();
  });

  it("returns null for missing payload", () => {
    expect(modelForToken(null)).toBeNull();
    expect(modelForToken(undefined)).toBeNull();
    expect(modelForToken({})).toBeNull();
  });
});

describe("authorize — four kinds (post-split roles)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows each kind on its own route", () => {
    for (const kind of ["staff", "admin", "manager", "superadmin"]) {
      mockNext.mockClear();
      authorize(kind)({ user: { id: "1" }, role: kind }, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalled();
    }
  });

  it("rejects manager from admin-only routes", () => {
    authorize("admin")({ user: { id: "1" }, role: "manager" }, mockRes(), mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("rejects staff from manager+admin routes", () => {
    authorize("admin", "manager")(
      { user: { id: "1" }, role: "staff" },
      mockRes(),
      mockNext,
    );
    expect(mockNext).not.toHaveBeenCalled();
  });
});
