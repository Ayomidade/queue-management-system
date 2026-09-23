import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptKey, decryptKey, usageDateKey } from "../../src/utils/keyWrap.js";

/**
 * Tests for the AES-256-GCM key wrap helper and usage date bucketing.
 *
 * keyWrap encrypts raw API keys staged for a bank admin's one-time reveal
 * on an approved ApiKeyRequest. usageDateKey produces the YYYY-MM-DD
 * bucket string used by ApiKeyUsage.
 */
describe("keyWrap — encrypt/decrypt", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.KEY_WRAP_SECRET = "test-secret-for-key-wrap-123456";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("round-trips a raw API key", () => {
    const raw = "cue_a1b2c3d4e5f67890abcdef1234567890abcdef1234567890";
    const ciphertext = encryptKey(raw);
    expect(typeof ciphertext).toBe("string");
    expect(ciphertext).not.toContain(raw);
    expect(decryptKey(ciphertext)).toBe(raw);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const raw = "cue_same_key_every_time";
    const a = encryptKey(raw);
    const b = encryptKey(raw);
    expect(a).not.toBe(b);
    expect(decryptKey(a)).toBe(raw);
    expect(decryptKey(b)).toBe(raw);
  });

  it("fails to decrypt with a wrong secret", () => {
    const ciphertext = encryptKey("cue_secret_key");
    process.env.KEY_WRAP_SECRET = "a-completely-different-secret";
    expect(() => decryptKey(ciphertext)).toThrow();
  });

  it("fails to decrypt tampered ciphertext", () => {
    const ciphertext = encryptKey("cue_tamper_me");
    // Flip a character in the middle of the base64 payload.
    const tampered =
      ciphertext.slice(0, 10) +
      (ciphertext[10] === "A" ? "B" : "A") +
      ciphertext.slice(11);
    expect(() => decryptKey(tampered)).toThrow();
  });

  it("rejects ciphertext that is too short", () => {
    expect(() => decryptKey(Buffer.from("abc").toString("base64"))).toThrow(
      /too short/,
    );
  });

  it("falls back to JWT_SECRET when KEY_WRAP_SECRET is unset", () => {
    delete process.env.KEY_WRAP_SECRET;
    process.env.JWT_SECRET = "jwt-secret-fallback";
    const raw = "cue_fallback_key";
    expect(decryptKey(encryptKey(raw))).toBe(raw);
  });
});

describe("usageDateKey", () => {
  it("formats a Date as YYYY-MM-DD", () => {
    expect(usageDateKey(new Date("2026-09-23T15:30:00Z"))).toBe("2026-09-23");
  });

  it("defaults to today (UTC)", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(usageDateKey()).toBe(today);
  });

  it("produces a zero-padded month/day", () => {
    expect(usageDateKey(new Date("2026-01-02T00:00:00Z"))).toBe("2026-01-02");
  });
});
