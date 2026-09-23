import { describe, it, expect, vi, beforeEach } from "vitest";
import { tenantMatch } from "../../src/middlewares/tenantMatch.js";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

/**
 * tenantMatch — admin.bank must equal key.bankName when both present.
 *
 * After the four-model split, Admin carries a denormalized `bank` while
 * API-key requests still scope by `req.bankName`. A mismatch means the
 * admin is using another bank's key — refuse the request.
 */
describe("tenantMatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes when banks match", () => {
    const req = { role: "admin", user: { bank: "Acme Bank" }, bankName: "Acme Bank" };
    tenantMatch(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("403 when admin bank differs from API key bank", () => {
    const req = { role: "admin", user: { bank: "Acme Bank" }, bankName: "Other Bank" };
    const res = mockRes();
    tenantMatch(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Admin bank does not match API key bank",
      }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("passes when role is not admin (nothing to compare)", () => {
    const req = { role: "staff", user: {}, bankName: "Acme Bank" };
    tenantMatch(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("passes when no API key bank is present (JWT-only dashboard)", () => {
    const req = { role: "admin", user: { bank: "Acme Bank" } };
    tenantMatch(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("passes when admin has no bank field (defensive)", () => {
    const req = { role: "admin", user: {}, bankName: "Acme Bank" };
    tenantMatch(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});
