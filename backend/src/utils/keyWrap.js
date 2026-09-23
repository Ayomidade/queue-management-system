import crypto from "crypto";

/**
 * Key wrap helper — AES-256-GCM encryption for staged raw API keys.
 *
 * When a superadmin approves a bank admin's key request, the raw key is
 * shown once to the superadmin AND staged encrypted on the ApiKeyRequest
 * document so the bank admin can reveal it once from their request status.
 * After the bank admin reveals it, the ciphertext is wiped permanently.
 *
 * The encryption key is derived from KEY_WRAP_SECRET (falls back to JWT_SECRET)
 * via SHA-256, so no extra key material is required in the environment for
 * basic setups.
 *
 * Ciphertext format (base64): iv || authTag || encryptedPayload
 */

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12; // standard GCM nonce length
const TAG_LENGTH = 16;

function getSecret() {
  const secret = process.env.KEY_WRAP_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "KEY_WRAP_SECRET or JWT_SECRET must be set to encrypt staged API keys",
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypt a plaintext string (the raw API key).
 * Returns a single base64 string safe to store on the request document.
 */
export function encryptKey(plaintext) {
  const key = getSecret();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypt a ciphertext produced by encryptKey.
 * Throws if the payload was tampered with (GCM auth fails).
 */
export function decryptKey(ciphertextB64) {
  const key = getSecret();
  const raw = Buffer.from(ciphertextB64, "base64");
  if (raw.length <= IV_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid ciphertext: too short");
  }
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = raw.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

/** Today's date as YYYY-MM-DD (UTC) — used for UsageLog daily buckets. */
export function usageDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
