import { describe, it, expect } from "vitest";
import { parsePagination, paginatedResponse } from "../../src/utils/pagination.js";

describe("parsePagination", () => {
  it("returns defaults when query is empty", () => {
    const result = parsePagination({});
    expect(result).toEqual({ page: 1, limit: 25, skip: 0 });
  });

  it("parses page and limit from query", () => {
    const result = parsePagination({ page: "3", limit: "10" });
    expect(result).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  it("clamps page to minimum 1", () => {
    const result = parsePagination({ page: "-5" });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it("clamps page to 1 for non-numeric strings", () => {
    const result = parsePagination({ page: "abc" });
    expect(result.page).toBe(1);
  });

  it("caps limit to maxLimit", () => {
    const result = parsePagination({ limit: "500" });
    expect(result.limit).toBe(100);
  });

  it("uses custom defaults", () => {
    const result = parsePagination({}, { defaultLimit: 10, maxLimit: 50 });
    expect(result).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it("respects custom maxLimit", () => {
    const result = parsePagination({ limit: "100" }, { maxLimit: 50 });
    expect(result.limit).toBe(50);
  });

  it("treats limit 0 as missing (uses default)", () => {
    const result = parsePagination({ limit: "0" });
    expect(result.limit).toBe(25);
  });

  it("calculates skip correctly for page 5, limit 20", () => {
    const result = parsePagination({ page: "5", limit: "20" });
    expect(result.skip).toBe(80);
  });
});

describe("paginatedResponse", () => {
  it("returns data and meta", () => {
    const docs = [{ id: 1 }, { id: 2 }];
    const result = paginatedResponse(docs, 50, 1, 25);
    expect(result).toEqual({
      data: docs,
      meta: { page: 1, limit: 25, total: 50, totalPages: 2 },
    });
  });

  it("calculates totalPages with ceiling", () => {
    const result = paginatedResponse([], 51, 1, 25);
    expect(result.meta.totalPages).toBe(3);
  });

  it("handles zero total", () => {
    const result = paginatedResponse([], 0, 1, 25);
    expect(result.meta.totalPages).toBe(0);
  });
});
