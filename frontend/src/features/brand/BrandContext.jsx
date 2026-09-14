import { createContext, useContext, useEffect, useState, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const BASE_URL = API_URL.replace(/\/api\/?$/, "");

const BrandContext = createContext(null);

const getInitialBrand = () => ({
  name: typeof __BRAND_NAME__ !== "undefined" ? __BRAND_NAME__ : "Cue",
  primaryColor:
    typeof __BRAND_PRIMARY__ !== "undefined" ? __BRAND_PRIMARY__ : "#4fa37b",
  accentColor:
    typeof __BRAND_ACCENT__ !== "undefined" ? __BRAND_ACCENT__ : "#c9a227",
  alertColor:
    typeof __BRAND_ALERT__ !== "undefined" ? __BRAND_ALERT__ : "#c1432b",
  supportEmail: "",
  emailFromName: "",
});

const applyBrandColors = (colors) => {
  const root = document.documentElement;
  if (colors.primaryColor) root.style.setProperty("--brand-primary", colors.primaryColor);
  if (colors.accentColor) root.style.setProperty("--brand-accent", colors.accentColor);
  if (colors.alertColor) root.style.setProperty("--brand-alert", colors.alertColor);
};

export const BrandProvider = ({ children }) => {
  const [brand, setBrand] = useState(getInitialBrand);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchBrand = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/brand`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.status === "success" && json.data) {
          const d = json.data;
          setBrand((prev) => ({
            ...prev,
            name: d.name || prev.name,
            primaryColor: d.primaryColor || prev.primaryColor,
            accentColor: d.accentColor || prev.accentColor,
            alertColor: d.alertColor || prev.alertColor,
            supportEmail: d.supportEmail || prev.supportEmail,
            emailFromName: d.emailFromName || prev.emailFromName,
          }));
          applyBrandColors(d);
        }
      } catch {
        applyBrandColors(brand);
      } finally {
        setLoaded(true);
      }
    };

    fetchBrand();
    return () => controller.abort();
  }, []);

  const refreshBrand = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/brand`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.status === "success" && json.data) {
        const d = json.data;
        setBrand((prev) => ({
          ...prev,
          name: d.name || prev.name,
          primaryColor: d.primaryColor || prev.primaryColor,
          accentColor: d.accentColor || prev.accentColor,
          alertColor: d.alertColor || prev.alertColor,
          supportEmail: d.supportEmail || prev.supportEmail,
          emailFromName: d.emailFromName || prev.emailFromName,
        }));
        applyBrandColors(d);
      }
    } catch {}
  }, []);

  return (
    <BrandContext.Provider value={{ brand, loaded, refreshBrand }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrand must be used within BrandProvider");
  return ctx;
};
