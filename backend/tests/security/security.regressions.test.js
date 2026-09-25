import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  csvField,
  escapeHtml,
  publicTicket,
  validateWebhookUrl,
} from "../../src/utils/security.js";
import { registerAdmin } from "../../src/controllers/auth.controller.js";
import Admin from "../../src/models/admin.model.js";
import Staff from "../../src/models/staff.model.js";
import { resolveStaffUser } from "../../src/middlewares/resolveStaffUser.js";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("security utilities", () => {
  it("does not expose contact fields in a public ticket DTO", () => {
    const result = publicTicket({
      _id: "ticket-1",
      kioskId: "K123",
      ticketNumber: 4,
      status: "waiting",
      priority: "normal",
      guestName: "Test Guest",
      guestPhone: "+1555555555",
      guestEmail: "guest@example.com",
      purpose: "Open account",
      queue: { _id: "queue-1", serviceName: "Teller" },
      branch: { _id: "branch-1", name: "Main", location: "Downtown" },
    });

    expect(result.guestName).toBe("Test Guest");
    expect(result.guestPhone).toBeUndefined();
    expect(result.guestEmail).toBeUndefined();
    expect(result.purpose).toBeUndefined();
  });

  it("escapes HTML values", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });

  it("neutralizes spreadsheet formula prefixes", () => {
    expect(csvField("=1+1")).toBe('"\'=1+1"');
    expect(csvField("safe")).toBe('"safe"');
  });

  it("rejects non-HTTPS and private webhook targets", async () => {
    await expect(validateWebhookUrl("http://example.com")).resolves.toMatchObject({
      valid: false,
    });
    await expect(validateWebhookUrl("https://localhost/hook")).resolves.toMatchObject({
      valid: false,
    });
  });
});

describe("API-key staff identity tenant binding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a staff identity from another bank", async () => {
    const query = {
      populate: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        _id: "staff-1",
        isActive: true,
        branch: { bank: "Bank B" },
      }),
    };
    vi.spyOn(Staff, "findById").mockReturnValue(query);
    const res = mockRes();
    const next = vi.fn();

    await resolveStaffUser(
      {
        headers: { "x-staff-id": "staff-1" },
        apiKey: { bankName: "Bank A" },
      },
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("admin registration secret", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_REGISTRATION_SECRET = "onboarding-secret";
    process.env.JWT_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.ADMIN_REGISTRATION_SECRET;
  });

  it("requires the onboarding secret", async () => {
    const res = mockRes();
    await registerAdmin(
      {
        headers: {},
        body: {
          name: "Test Admin",
          email: "admin@example.com",
          password: "password123",
          bankName: "Test Bank",
        },
      },
      res,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("creates an admin only with the configured secret", async () => {
    const admin = {
      _id: "admin-1",
      name: "Test Admin",
      email: "admin@example.com",
      bank: "Test Bank",
      mustChangePassword: false,
    };
    vi.spyOn(Admin, "findOne").mockResolvedValue(null);
    vi.spyOn(Admin, "create").mockResolvedValue(admin);
    const res = mockRes();

    await registerAdmin(
      {
        headers: { "x-admin-registration-secret": "onboarding-secret" },
        body: {
          name: "Test Admin",
          email: "admin@example.com",
          password: "password123",
          bankName: "Test Bank",
        },
      },
      res,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(Admin.create).toHaveBeenCalledWith(
      expect.objectContaining({ bank: "Test Bank" }),
    );
  });
});
