import BrandConfig from "../models/brandConfig.model.js";

const envDefaults = {
  name: process.env.BRAND_NAME || "Cue",
  primaryColor: process.env.BRAND_PRIMARY_COLOR || "#4fa37b",
  accentColor: process.env.BRAND_ACCENT_COLOR || "#c9a227",
  alertColor: process.env.BRAND_ALERT_COLOR || "#c1432b",
  supportEmail: process.env.BRAND_SUPPORT_EMAIL || "",
  emailFromName: process.env.BRAND_EMAIL_FROM || "Cue",
};

let cached = null;
let cacheExpiry = 0;
const CACHE_TTL = 60_000;

export const getBrand = async () => {
  const now = Date.now();
  if (cached && now < cacheExpiry) return cached;

  try {
    const doc = await BrandConfig.findOne({ key: "brand" }).lean();
    if (doc) {
      cached = { ...envDefaults, ...doc.values, updatedAt: doc.updatedAt };
    } else {
      cached = { ...envDefaults };
    }
  } catch {
    cached = { ...envDefaults };
  }

  cacheExpiry = Date.now() + CACHE_TTL;
  return cached;
};

export const invalidateBrandCache = () => {
  cached = null;
  cacheExpiry = 0;
};

export const getBrandSync = () => cached || { ...envDefaults };
