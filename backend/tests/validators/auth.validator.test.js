import { describe, it, expect } from "vitest";
import { validationResult } from "express-validator";
import {
  loginStaffValidator,
  loginManagerValidator,
  loginAdminValidator,
  registerAdminValidator,
  registerWithInviteValidator,
  createManagerInviteValidator,
  createStaffInviteValidator,
  changePasswordValidator,
} from "../../src/validators/auth.validator.js";

/** Run a chain of express-validator checks against a fake body. */
const run = async (chain, body) => {
  const req = { body, headers: {}, cookies: {} };
  await Promise.all(chain.map((v) => v.run(req)));
  return validationResult(req).array().map((e) => e.msg);
};

describe("auth validators", () => {
  it.each([
    ["staff", loginStaffValidator],
    ["manager", loginManagerValidator],
    ["admin", loginAdminValidator],
  ])("login %s accepts valid credentials", async (_kind, chain) => {
    const errors = await run(chain, {
      email: "user@example.com",
      password: "secret123",
    });
    expect(errors).toHaveLength(0);
  });

  it("login rejects missing password", async () => {
    const errors = await run(loginStaffValidator, {
      email: "user@example.com",
    });
    expect(errors).toContain("Password is required.");
  });

  it("login rejects invalid email", async () => {
    const errors = await run(loginAdminValidator, {
      email: "not-an-email",
      password: "secret123",
    });
    expect(errors.some((m) => m.includes("Invalid email"))).toBe(true);
  });

  it("registerAdmin requires bankName", async () => {
    const errors = await run(registerAdminValidator, {
      name: "Ada",
      email: "ada@example.com",
      password: "secret123",
    });
    expect(errors).toContain("Bank name is required.");
  });

  it("registerAdmin requires min-8 password", async () => {
    const errors = await run(registerAdminValidator, {
      name: "Ada",
      email: "ada@example.com",
      password: "short",
      bankName: "Acme Bank",
    });
    expect(errors).toContain("Password must be at least 8 characters long.");
  });

  it("registerAdmin accepts a full valid payload", async () => {
    const errors = await run(registerAdminValidator, {
      name: "Ada",
      email: "ada@example.com",
      password: "secret123",
      bankName: "Acme Bank",
    });
    expect(errors).toHaveLength(0);
  });

  it("registerWithInvite requires a token", async () => {
    const errors = await run(registerWithInviteValidator, {
      name: "Bob",
      email: "bob@example.com",
      password: "secret123",
    });
    expect(errors).toContain("Invite token is required.");
  });

  it("registerWithInvite accepts a full valid payload", async () => {
    const token = "a".repeat(64);
    const errors = await run(registerWithInviteValidator, {
      token,
      name: "Bob",
      email: "bob@example.com",
      password: "secret123",
    });
    expect(errors).toHaveLength(0);
  });

  it("createManagerInvite rejects expiresInDays out of range", async () => {
    const errors = await run(createManagerInviteValidator, {
      expiresInDays: 40,
    });
    expect(errors.some((m) => m.includes("between 1 and 30"))).toBe(true);
  });

  it("createStaffInvite rejects non-mongo branch", async () => {
    const errors = await run(createStaffInviteValidator, {
      branch: "not-an-id",
    });
    expect(errors).toContain("Invalid branch ID");
  });

  it("createStaffInvite accepts optional branch + days", async () => {
    const errors = await run(createStaffInviteValidator, {
      branch: "507f1f77bcf86cd799439011",
      expiresInDays: 7,
    });
    expect(errors).toHaveLength(0);
  });

  it("changePassword enforces min-8 new password", async () => {
    const errors = await run(changePasswordValidator, {
      currentPassword: "oldpass123",
      newPassword: "short",
    });
    expect(errors).toContain("New password must be at least 8 characters");
  });
});
