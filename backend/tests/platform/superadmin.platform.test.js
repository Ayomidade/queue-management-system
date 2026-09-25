import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import {
  loginSuperadmin,
  getPlatformMe,
} from "../../src/controllers/platform/platformAuth.controller.js";
import { reviewKeyRequest } from "../../src/controllers/platform/platformKeyRequest.controller.js";
import Superadmin from "../../src/models/superadmin.model.js";
import ApiKeyRequest from "../../src/models/apiKeyRequest.model.js";
import ApiKey from "../../src/models/apiKey.model.js";
import v1Router from "../../src/routes/v1/index.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

/**
 * Platform surface — Superadmin model everywhere (Phase 13 WP8).
 *
 * - login issues { id, kind: "superadmin", role: "superadmin" } JWT
 * - response wraps identity under `user` (same key as bank logins)
 * - getPlatformMe returns superadmin profile from protect's req.user
 * - reviewKeyRequest stamps reviewedBy with the Superadmin id
 * - legacy v1 /api-key-requests router is gone (authorize("admin")
 *   could never pass under resolveStaffUser's role "staff")
 */
describe("platformAuth — Superadmin model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loginSuperadmin returns user identity + superadmin JWT", async () => {
    const fake = {
      _id: "64b000000000000000000001",
      name: "Platform Ops",
      email: "superadmin@cue.dev",
      isActive: true,
      mustChangePassword: false,
      comparePassword: vi.fn().mockResolvedValue(true),
    };
    vi.spyOn(Superadmin, "findOne").mockReturnValue({
      select: vi.fn().mockResolvedValue(fake),
    });

    const req = { body: { email: "superadmin@cue.dev", password: "secret" } };
    const res = mockRes();
    const next = vi.fn();

    await loginSuperadmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.user).toMatchObject({
      email: "superadmin@cue.dev",
      role: "superadmin",
      kind: "superadmin",
    });
    expect(payload.data.staff).toBeUndefined();

    const claims = jwt.verify(payload.data.token, process.env.JWT_SECRET);
    expect(claims.kind).toBe("superadmin");
    expect(claims.role).toBe("superadmin");
    expect(claims.id).toBe(fake._id);
  });

  it("loginSuperadmin rejects bad password with generic 401", async () => {
    const fake = {
      _id: "64b000000000000000000001",
      email: "superadmin@cue.dev",
      isActive: true,
      comparePassword: vi.fn().mockResolvedValue(false),
    };
    vi.spyOn(Superadmin, "findOne").mockReturnValue({
      select: vi.fn().mockResolvedValue(fake),
    });

    const res = mockRes();
    await loginSuperadmin(
      { body: { email: "superadmin@cue.dev", password: "wrong" } },
      res,
      vi.fn(),
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("getPlatformMe returns the protect-loaded Superadmin profile", async () => {
    const res = mockRes();
    await getPlatformMe(
      {
        user: {
          _id: "64b000000000000000000001",
          name: "Platform Ops",
          email: "superadmin@cue.dev",
        },
        role: "superadmin",
      },
      res,
      vi.fn(),
    );
    const payload = res.json.mock.calls[0][0];
    expect(payload.data).toMatchObject({
      email: "superadmin@cue.dev",
      role: "superadmin",
    });
  });
});

describe("platformKeyRequest — reviewedBy is Superadmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approve stamps reviewedBy with the superadmin user id", async () => {
    const superadminId = "64b000000000000000000001";
    const request = {
      _id: "64b0000000000000000000aa",
      bankName: "acme",
      status: "pending",
      scopes: ["tickets:read"],
      rateLimit: 100,
      label: "prod",
      save: vi.fn().mockResolvedValue(true),
    };
    vi.spyOn(ApiKeyRequest, "findById").mockResolvedValue(request);
    vi.spyOn(ApiKey, "generateKey").mockResolvedValue({
      rawKey: "cue_raw",
      keyHash: "hash",
      keyPrefix: "cue_abcd",
    });
    vi.spyOn(ApiKey, "create").mockResolvedValue({
      _id: "64b0000000000000000000bb",
      keyPrefix: "cue_abcd",
      scopes: ["tickets:read"],
      rateLimit: 100,
    });

    const res = mockRes();
    const next = vi.fn();
    await reviewKeyRequest(
      {
        params: { id: "64b0000000000000000000aa" },
        body: { action: "approve", reviewNote: "ok" },
        user: { _id: superadminId, role: "superadmin" },
      },
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(request.reviewedBy).toBe(superadminId);
    expect(request.status).toBe("approved");
    expect(request.encryptedRawKey).toBeTruthy();
    expect(request.save).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.key).toBe("cue_raw");
  });

  it("reject stamps reviewedBy and does not create a key", async () => {
    const request = {
      _id: "64b0000000000000000000aa",
      bankName: "acme",
      status: "pending",
      save: vi.fn().mockResolvedValue(true),
    };
    vi.spyOn(ApiKeyRequest, "findById").mockResolvedValue(request);
    const createSpy = vi.spyOn(ApiKey, "create");

    const res = mockRes();
    await reviewKeyRequest(
      {
        params: { id: "64b0000000000000000000aa" },
        body: { action: "reject", reviewNote: "no" },
        user: { _id: "64b000000000000000000001", role: "superadmin" },
      },
      res,
      vi.fn(),
    );

    expect(request.status).toBe("rejected");
    expect(request.reviewedBy).toBe("64b000000000000000000001");
    expect(createSpy).not.toHaveBeenCalled();
  });
});

describe("v1 router — api-key-requests removed (WP8)", () => {
  it("does not mount /api-key-requests", () => {
    const stack = (v1Router.stack || []).map((layer) => ({
      name: layer.name,
      path: layer.route?.path,
      regexp: String(layer.regexp || ""),
    }));
    const mounts = stack.filter(
      (l) => l.path && String(l.path).includes("api-key-request"),
    );
    const regexpHits = stack.filter((l) =>
      l.regexp.includes("api-key-request"),
    );
    expect(mounts).toHaveLength(0);
    expect(regexpHits).toHaveLength(0);
  });
});
