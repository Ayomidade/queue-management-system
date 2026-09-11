import { describe, it, expect, vi } from "vitest";
import errorHandler from "../../src/middlewares/error.middleware.js";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockReq = {};
const mockNext = vi.fn();

describe("errorHandler", () => {
  it("returns 500 for unknown errors", () => {
    const res = mockRes();
    const err = new Error("Something broke");
    errorHandler(err, mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", message: "Something broke" }),
    );
  });

  it("uses err.statusCode when set", () => {
    const res = mockRes();
    const err = new Error("Not found");
    err.statusCode = 404;
    errorHandler(err, mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("handles duplicate key error (code 11000)", () => {
    const res = mockRes();
    const err = new Error("dup key");
    err.code = 11000;
    err.keyValue = { email: "test@test.com" };
    errorHandler(err, mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "email already exists." }),
    );
  });

  it("handles Mongoose ValidationError", () => {
    const res = mockRes();
    const err = new Error("validation failed");
    err.name = "ValidationError";
    err.errors = {
      name: { message: "Name is required" },
      email: { message: "Invalid email" },
    };
    errorHandler(err, mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Name is required, Invalid email",
      }),
    );
  });

  it("handles CastError (invalid ObjectId)", () => {
    const res = mockRes();
    const err = new Error("cast error");
    err.name = "CastError";
    errorHandler(err, mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid ID format" }),
    );
  });

  it("handles JsonWebTokenError", () => {
    const res = mockRes();
    const err = new Error("jwt malformed");
    err.name = "JsonWebTokenError";
    errorHandler(err, mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid token" }),
    );
  });

  it("handles TokenExpiredError", () => {
    const res = mockRes();
    const err = new Error("jwt expired");
    err.name = "TokenExpiredError";
    errorHandler(err, mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Token expired" }),
    );
  });
});
