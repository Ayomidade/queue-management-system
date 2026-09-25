import crypto from "crypto";

/**
 * Generate a server-side temporary password.
 * Format: Cue-XXXXXX-XXXXXX (hex, uppercased) — meets min-8 rule.
 *
 * Returned ONCE to the creator (admin/manager UI). Never sent by email.
 * Paired with mustChangePassword: true so the user must rotate on first login.
 */
export const generateTempPassword = () => {
  const part = () => crypto.randomBytes(3).toString("hex").toUpperCase();
  return `Cue-${part()}-${part()}`;
};
