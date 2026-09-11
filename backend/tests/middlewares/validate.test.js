import { describe, it, expect, vi } from "vitest";
import validate from "../../src/middlewares/validate.js";
import { validationResult } from "express-validator";

vi.mock("express-validator", () => ({
  validationResult: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

describe("validate middleware", () => {
  it("calls next when no validation errors", () => {
    validationResult.mockReturnValue({ isEmpty: () => true });
    const req = {};
    const res = mockRes();
    validate(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("returns 400 with error messages when validation fails", () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [
        { msg: "Email is required" },
        { msg: "Invalid email format" },
      ],
    });
    const req = {};
    const res = mockRes();
    validate(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Validation failed",
      errors: ["Email is required", "Invalid email format"],
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
