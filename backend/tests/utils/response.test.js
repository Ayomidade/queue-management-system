import { describe, it, expect, vi } from "vitest";
import { sendSuccess, sendError } from "../../src/utils/response.js";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("sendSuccess", () => {
  it("returns 200 with default message", () => {
    const res = mockRes();
    sendSuccess(res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      message: "Request successful",
    });
  });

  it("returns custom statusCode and message", () => {
    const res = mockRes();
    sendSuccess(res, { statusCode: 201, message: "Created" });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      message: "Created",
    });
  });

  it("includes data when provided", () => {
    const res = mockRes();
    sendSuccess(res, { data: { id: 1, name: "Test" } });
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      message: "Request successful",
      data: { id: 1, name: "Test" },
    });
  });

  it("includes meta when provided", () => {
    const res = mockRes();
    sendSuccess(res, { meta: { page: 1, total: 10 } });
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      message: "Request successful",
      meta: { page: 1, total: 10 },
    });
  });

  it("omits data and meta when null", () => {
    const res = mockRes();
    sendSuccess(res, { data: null, meta: null });
    const payload = res.json.mock.calls[0][0];
    expect(payload).not.toHaveProperty("data");
    expect(payload).not.toHaveProperty("meta");
  });
});

describe("sendError", () => {
  it("returns 500 with default message", () => {
    const res = mockRes();
    sendError(res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Something went wrong",
    });
  });

  it("returns custom statusCode and message", () => {
    const res = mockRes();
    sendError(res, { statusCode: 404, message: "Not found" });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Not found",
    });
  });

  it("includes errors when provided", () => {
    const res = mockRes();
    sendError(res, { statusCode: 400, errors: ["email required"] });
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Something went wrong",
      errors: ["email required"],
    });
  });

  it("omits errors when null", () => {
    const res = mockRes();
    sendError(res, { errors: null });
    const payload = res.json.mock.calls[0][0];
    expect(payload).not.toHaveProperty("errors");
  });
});
