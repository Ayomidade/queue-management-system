import { describe, it, expect } from "vitest";
import Invite from "../../src/models/invite.model.js";
import { generateTempPassword } from "../../src/utils/password.js";

describe("Invite model statics", () => {
  it("generates a unique raw token of sufficient length", () => {
    const a = Invite.generateRawToken();
    const b = Invite.generateRawToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hashes tokens deterministically with SHA-256", () => {
    const raw = "abc123";
    const h1 = Invite.hashToken(raw);
    const h2 = Invite.hashToken(raw);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    expect(h1).not.toBe(raw);
  });

  it("different raw tokens produce different hashes", () => {
    expect(Invite.hashToken("a")).not.toBe(Invite.hashToken("b"));
  });
});

describe("generateTempPassword", () => {
  it("matches Cue-XXXXXX-XXXXXX format", () => {
    expect(generateTempPassword()).toMatch(/^Cue-[A-F0-9]{6}-[A-F0-9]{6}$/);
  });

  it("meets min-8 password length", () => {
    expect(generateTempPassword().length).toBeGreaterThanOrEqual(8);
  });

  it("produces unique values", () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });
});
