import { describe, it, expect } from "vitest";
import { validationResult } from "express-validator";
import {
  createManagerValidator,
  assignManagerBranchValidator,
} from "../../src/validators/manager.validator.js";
import {
  createStaffValidator,
  assignStaffValidator,
} from "../../src/validators/staff.validator.js";

const run = async (chain, body) => {
  const req = { body, headers: {}, cookies: {} };
  await Promise.all(chain.map((v) => v.run(req)));
  return validationResult(req).array().map((e) => e.msg);
};

describe("manager validators", () => {
  it("createManager requires name, email, branch", async () => {
    const errors = await run(createManagerValidator, {});
    expect(errors).toContain("Manager name is required");
    expect(errors).toContain("Email is required");
    expect(errors).toContain("Branch is required");
  });

  it("createManager treats password as optional", async () => {
    const errors = await run(createManagerValidator, {
      name: "Mia Manager",
      email: "mia@example.com",
      branch: "507f1f77bcf86cd799439011",
    });
    expect(errors).toHaveLength(0);
  });

  it("createManager rejects short password when provided", async () => {
    const errors = await run(createManagerValidator, {
      name: "Mia Manager",
      email: "mia@example.com",
      branch: "507f1f77bcf86cd799439011",
      password: "short",
    });
    expect(errors).toContain("Password must be at least 8 characters");
  });

  it("assignManagerBranch requires a valid branchId", async () => {
    const errors = await run(assignManagerBranchValidator, { branchId: "x" });
    expect(errors).toContain("Invalid branch ID");
  });
});

describe("staff validators (WP4 — password optional)", () => {
  it("createStaff accepts payload without password (temp-password path)", async () => {
    const errors = await run(createStaffValidator, {
      name: "Sam Staff",
      email: "sam@example.com",
      branch: "507f1f77bcf86cd799439011",
    });
    expect(errors).toHaveLength(0);
  });

  it("createStaff still rejects short explicit password", async () => {
    const errors = await run(createStaffValidator, {
      name: "Sam Staff",
      email: "sam@example.com",
      password: "short",
    });
    expect(errors).toContain("Password must be at least 8 characters");
  });

  it("createStaff requires name and email", async () => {
    const errors = await run(createStaffValidator, {});
    expect(errors).toContain("Staff name is required");
    expect(errors).toContain("Email is required");
  });

  it("assignStaffValidator requires mongo branchId", async () => {
    const errors = await run(assignStaffValidator, {});
    expect(errors).toContain("Branch ID is required");
  });
});
