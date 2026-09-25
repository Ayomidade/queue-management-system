import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mapBankKeyRequest,
  resolveKeyStatus,
} from "../../src/routes/adminApiKeyRequest.routes.js";
import { deleteApiKey } from "../../src/controllers/platform/platformApiKey.controller.js";
import ApiKey from "../../src/models/apiKey.model.js";
import ApiKeyRequest from "../../src/models/apiKeyRequest.model.js";

/**
 * Bank-admin API key request list helpers + revoke cleanup (Phase 13 fixes).
 *
 * Bug 1: list used to `.select("-encryptedRawKey")` before computing
 * canRevealKey → Reveal button never appeared. mapBankKeyRequest now
 * requires the ciphertext on the in-memory doc and never returns it.
 *
 * Bug 2: revoke (ApiKey.findByIdAndDelete) left ApiKeyRequest untouched and
 * the bank-admin list had no live key status. deleteApiKey now unsets staged
 * ciphertext; resolveKeyStatus reports active/suspended/revoked/null.
 */
const baseRequest = (overrides = {}) => ({
  _id: "64b0000000000000000000aa",
  bankName: "acme",
  label: "prod",
  scopes: ["tickets:read"],
  rateLimit: 100,
  status: "pending",
  reviewNote: "",
  apiKey: null,
  encryptedRawKey: null,
  bankKeyRevealedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("mapBankKeyRequest — canRevealKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("canRevealKey is true for approved + ciphertext + not yet revealed", () => {
    const mapped = mapBankKeyRequest(
      baseRequest({
        status: "approved",
        encryptedRawKey: "iv.tag.payload",
        bankKeyRevealedAt: null,
        apiKey: "64b0000000000000000000bb",
      }),
    );
    expect(mapped.canRevealKey).toBe(true);
    expect(mapped.encryptedRawKey).toBeUndefined();
  });

  it("canRevealKey is false after bank admin has revealed", () => {
    const mapped = mapBankKeyRequest(
      baseRequest({
        status: "approved",
        encryptedRawKey: null,
        bankKeyRevealedAt: new Date(),
        apiKey: "64b0000000000000000000bb",
      }),
    );
    expect(mapped.canRevealKey).toBe(false);
    expect(mapped.revealedAt).toBeTruthy();
  });

  it("canRevealKey is false for pending and rejected requests", () => {
    expect(
      mapBankKeyRequest(
        baseRequest({ status: "pending", encryptedRawKey: "staged" }),
      ).canRevealKey,
    ).toBe(false);
    expect(
      mapBankKeyRequest(
        baseRequest({ status: "rejected", encryptedRawKey: "staged" }),
      ).canRevealKey,
    ).toBe(false);
  });

  it("never includes ciphertext in the mapped payload", () => {
    const mapped = mapBankKeyRequest(
      baseRequest({
        status: "approved",
        encryptedRawKey: "iv.tag.payload",
        bankKeyRevealedAt: null,
      }),
    );
    expect(Object.keys(mapped)).not.toContain("encryptedRawKey");
    expect(JSON.stringify(mapped)).not.toContain("iv.tag.payload");
  });
});

describe("resolveKeyStatus — live key health", () => {
  it("is null until the request is approved", () => {
    expect(
      resolveKeyStatus(baseRequest({ status: "pending" }), {
        isActive: true,
      }),
    ).toBeNull();
    expect(
      resolveKeyStatus(baseRequest({ status: "rejected" }), null),
    ).toBeNull();
  });

  it("is active when linked ApiKey exists and isActive", () => {
    expect(
      resolveKeyStatus(
        baseRequest({ status: "approved", apiKey: "64b0000000000000000000bb" }),
        { isActive: true, keyPrefix: "cue_abcd" },
      ),
    ).toBe("active");
  });

  it("is suspended when linked ApiKey is disabled", () => {
    expect(
      resolveKeyStatus(
        baseRequest({ status: "approved", apiKey: "64b0000000000000000000bb" }),
        { isActive: false },
      ),
    ).toBe("suspended");
  });

  it("is revoked when apiKey ref is set but ApiKey doc is gone (superadmin delete)", () => {
    expect(
      resolveKeyStatus(
        baseRequest({ status: "approved", apiKey: "64b0000000000000000000bb" }),
        null,
      ),
    ).toBe("revoked");
  });

  it("is revoked when approved request has no linked ApiKey", () => {
    expect(
      resolveKeyStatus(baseRequest({ status: "approved", apiKey: null }), null),
    ).toBe("revoked");
  });
});

describe("mapBankKeyRequest — keyStatus + keyPrefix join", () => {
  it("surfaces keyStatus and keyPrefix for approved requests", () => {
    const mapped = mapBankKeyRequest(
      baseRequest({
        status: "approved",
        encryptedRawKey: "staged",
        bankKeyRevealedAt: null,
        apiKey: "64b0000000000000000000bb",
      }),
      { _id: "64b0000000000000000000bb", isActive: true, keyPrefix: "cue_abcd" },
    );
    expect(mapped.keyStatus).toBe("active");
    expect(mapped.keyPrefix).toBe("cue_abcd");
    expect(mapped.canRevealKey).toBe(true);
  });

  it("reports revoked when join misses the ApiKey doc", () => {
    const mapped = mapBankKeyRequest(
      baseRequest({
        status: "approved",
        encryptedRawKey: null,
        bankKeyRevealedAt: new Date(),
        apiKey: "64b0000000000000000000bb",
      }),
      null,
    );
    expect(mapped.keyStatus).toBe("revoked");
    expect(mapped.keyPrefix).toBeNull();
  });

  it("keyStatus is null for non-approved requests", () => {
    const mapped = mapBankKeyRequest(baseRequest({ status: "pending" }), null);
    expect(mapped.keyStatus).toBeNull();
    expect(mapped.keyPrefix).toBeNull();
  });
});

describe("deleteApiKey — revoke clears staged reveal ciphertext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unsets encryptedRawKey + rawKeyStagedAt on linked requests", async () => {
    const key = { _id: "64b0000000000000000000bb", bankName: "acme" };
    vi.spyOn(ApiKey, "findByIdAndDelete").mockResolvedValue(key);
    const updateManySpy = vi
      .spyOn(ApiKeyRequest, "updateMany")
      .mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

    const res = mockRes();
    const next = vi.fn();
    await deleteApiKey(
      { params: { id: "64b0000000000000000000bb" }, body: {} },
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(updateManySpy).toHaveBeenCalledWith(
      { apiKey: key._id },
      { $unset: { encryptedRawKey: 1, rawKeyStagedAt: 1 } },
    );
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.message).toContain("revoked");
  });

  it("returns 404 when the key is already gone", async () => {
    vi.spyOn(ApiKey, "findByIdAndDelete").mockResolvedValue(null);
    const updateManySpy = vi.spyOn(ApiKeyRequest, "updateMany");

    const res = mockRes();
    await deleteApiKey(
      { params: { id: "64b0000000000000000000bb" }, body: {} },
      res,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(updateManySpy).not.toHaveBeenCalled();
  });
});
