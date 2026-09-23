import { describe, it, expect } from "vitest";
import Staff from "../../src/models/staff.model.js";
import Admin from "../../src/models/admin.model.js";
import Manager from "../../src/models/manager.model.js";
import Superadmin from "../../src/models/superadmin.model.js";
import ApiKeyRequest from "../../src/models/apiKeyRequest.model.js";

/**
 * Four-model split schema checks (Phase 13 / WP1).
 *
 * Each role lives in its own collection with fields tailored to that role.
 * The Staff document must NOT carry a `role` field anymore — the
 * collection name is the role.
 */
describe("four-model split schemas", () => {
  it("Staff has no role field", () => {
    expect(Staff.schema.path("role")).toBeUndefined();
  });

  it("Staff keeps branch, counter, and queues", () => {
    expect(Staff.schema.path("branch")).toBeDefined();
    expect(Staff.schema.path("counter")).toBeDefined();
    expect(Staff.schema.path("queues")).toBeDefined();
    expect(Staff.schema.path("mustChangePassword")).toBeDefined();
  });

  it("Admin requires a bank field", () => {
    expect(Admin.schema.path("bank")).toBeDefined();
    expect(Admin.schema.path("bank").isRequired).toBeTruthy();
    expect(Admin.schema.path("role")).toBeUndefined();
    expect(Admin.schema.path("branch")).toBeUndefined();
  });

  it("Manager has bank + branch, but no counter or queues", () => {
    expect(Manager.schema.path("bank")).toBeDefined();
    expect(Manager.schema.path("bank").isRequired).toBeTruthy();
    expect(Manager.schema.path("branch")).toBeDefined();
    expect(Manager.schema.path("branch").isRequired).toBeTruthy();
    expect(Manager.schema.path("counter")).toBeUndefined();
    expect(Manager.schema.path("queues")).toBeUndefined();
    expect(Manager.schema.path("role")).toBeUndefined();
    expect(Manager.schema.path("mustChangePassword")).toBeDefined();
  });

  it("Superadmin has no bank/branch/counter (platform operator)", () => {
    expect(Superadmin.schema.path("bank")).toBeUndefined();
    expect(Superadmin.schema.path("branch")).toBeUndefined();
    expect(Superadmin.schema.path("counter")).toBeUndefined();
    expect(Superadmin.schema.path("role")).toBeUndefined();
    expect(Superadmin.schema.path("mustChangePassword")).toBeDefined();
  });

  it("ApiKeyRequest points requestedBy at Admin and reviewedBy at Superadmin", () => {
    expect(ApiKeyRequest.schema.path("requestedBy").options.ref).toBe("Admin");
    expect(ApiKeyRequest.schema.path("reviewedBy").options.ref).toBe("Superadmin");
  });

  it("all four models hash passwords via comparePassword", () => {
    for (const Model of [Staff, Admin, Manager, Superadmin]) {
      expect(typeof Model.schema.methods.comparePassword).toBe("function");
    }
  });
});
