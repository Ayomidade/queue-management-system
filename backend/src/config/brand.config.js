/**
 * Brand Configuration
 *
 * Reads brand settings from environment variables only.
 * No database lookups, no caching — simple and predictable.
 *
 * Banks configure their branding via .env files when deploying.
 * The demo frontend reads these values via GET /api/brand.
 */

const brandConfig = {
  name: process.env.BRAND_NAME || "Cue",
  primaryColor: process.env.BRAND_PRIMARY_COLOR || "#0d7c66",
  accentColor: process.env.BRAND_ACCENT_COLOR || "#c9a227",
  alertColor: process.env.BRAND_ALERT_COLOR || "#dc2626",
  supportEmail: process.env.BRAND_SUPPORT_EMAIL || "",
  emailFromName: process.env.BRAND_EMAIL_FROM || "Cue",
};

/**
 * Get brand configuration synchronously.
 * Used by email templates and other places that need brand info immediately.
 */
export const getBrandSync = () => ({ ...brandConfig });

/**
 * Get brand configuration (async for backward compatibility).
 * Returns the same data as getBrandSync — no DB query needed.
 */
export const getBrand = async () => ({ ...brandConfig });
