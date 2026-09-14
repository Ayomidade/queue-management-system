# Update — Change in Direction

This document records a change in what this project is and who it's for. Read this alongside `README.md` (what the product is) and `BUILD_PLAN.md` (what's built and what's next), which this update supersedes in places.

## Summary

This started as **Cue**, a standalone web app built for the Wema Bank Hackaholics 2026 submission. It's now a personal project: a **white-label queue-and-appointments platform**, meant to be pitched to banks generally, with each bank deploying their own instance on their own infrastructure.

The core problem and solution don't change. Customers waste hours waiting in branch queues for things that could often be handled remotely or faster. This platform lets them book a slot, track their position live, and get notified when it's nearly their turn, while giving branch staff, managers, and network admins the tooling to run the floor. What changes is the packaging: this is no longer a demo built for one bank's hackathon deadline, it's a product meant to be deployed by any bank.

## What Changed, and Why

| Before | Now | Why |
| --- | --- | --- |
| Built for the Wema Bank Hackaholics 2026 deadline | Ongoing personal project, no fixed deadline | Removes the time pressure that was driving feature triage; the platform can be built properly |
| Standalone web app with its own customer signup and login | A module surfaced to customers who are already authenticated in the bank's own app | Banks don't want customers downloading another app; removes an entire onboarding step; more realistic adoption |
| Single target: Wema Bank | Positioned to be pitched to banks generally | Bigger addressable audience, works as a real portfolio and business project instead of a one-off submission |
| Implicit single-deployment assumption | White-label: each bank deploys their own copy on their own infrastructure | Simplest way to support many banks without building multi-tenant data isolation or per-tenant billing |
| "Cue" hardcoded as the product name and color scheme throughout the code | Bank-agnostic core, branding pulled from one config | A deploying bank needs to see their own name and colors, not "Cue" |
| AI Service Advisor (branch-visit triage) was the intended flagship feature | Deferred until the white-label core is solid | Get the foundation right first; the Advisor is still the intended differentiator, just not the current priority |

## What Needs to Change, and How

### 1. Branding is hardcoded in roughly 30 files

"Cue" appears in page titles, the navbar, footer, login and register copy, the email sender name, and the PWA service worker. Colors are hardcoded as literal hex values under names like `--verdigris`, `--brass`, `--signal`, not something a new bank can swap out.

**Fix:** one config as the source of truth, everything else reads from it.

```js
// backend/src/config/brand.config.js
export const brand = {
  name: process.env.BRAND_NAME || "Cue",
  supportEmail: process.env.BRAND_SUPPORT_EMAIL,
  emailFromName: process.env.BRAND_EMAIL_FROM || "Cue <onboarding@resend.dev>",
  currency: process.env.BRAND_CURRENCY || "NGN",
};
```

```css
/* frontend/src/styles/global.css */
:root {
  --brand-primary: var(--verdigris, #4fa37b);
  --brand-accent: var(--brass, #c9a227);
  --brand-alert: var(--signal, #c1432b);
}
```

Every hardcoded "Cue" string and every direct `--verdigris` / `--brass` / `--signal` reference gets swapped for `brand.name` or `var(--brand-primary)`.

### 2. No deployment path for a bank standing this up themselves

The README describes what the project is, not how a bank installs it on their own infrastructure.

**Fix:** a `.env.template` covering every variable a deploying bank fills in (Mongo URI, JWT secret, Resend key and from-name, Groq key, the branding vars from step 1), plus a short guide for seeding a bank's first admin, branch, and counters on a fresh install.

### 3. Unaudited single-install assumptions

Anything that assumes there's only ever one deployment in the world needs a check: hardcoded URLs, a hardcoded email domain, currency or timezone assumptions in analytics and operating hours.

**Fix:** a deliberate pass through the backend once steps 1 and 2 are done, rather than finding these at a bank's own demo.

### 4. AI Service Advisor, design preserved but not built yet

The original flagship idea: when a customer selects a service, check it against a rules matrix before letting them book. Card replacement redirects to the bank's own app, cash withdrawal above a set limit requires a branch and shows the shortest wait, every decision and every customer override gets logged. This is intentionally not part of the current build. The design (a `ServiceMatrix` collection, a `check-service` endpoint, override tracking feeding an admin-facing deflection metric) is documented here so it isn't lost, and picks back up once the white-label core is solid.

## Build Plan

| Phase | Status |
| --- | --- |
| Core platform (auth, roles, branches, queues, counters, tickets, analytics, AI agent) | Done, pre-pivot |
| A — Centralize branding | Done |
| B — Deployment packaging | Not started |
| C — Single-install audit | Not started |
| D — AI Service Advisor | Deferred |

### Phase A — Centralize Branding

**Completed.** All branding is now configurable from a single source.

- [x] Create `backend/src/config/brand.config.js` — env var defaults + MongoDB cache
- [x] Create `BrandConfig` model — stores admin overrides in MongoDB with 60s cache TTL
- [x] Create `GET /api/brand` (public) and `PATCH /api/brand` (admin-only) endpoints
- [x] Create `BrandContext` (frontend) — fetches `/api/brand` on mount, applies CSS variable overrides at runtime
- [x] Wrap `App.jsx` in `BrandProvider` — all components have access to `brand.name` and `brand.colors`
- [x] Update `vite.config.js` — injects `VITE_BRAND_*` env vars as globals for first-paint rendering
- [x] Replace 35 hardcoded "Cue" strings across 26 files (17 frontend JSX, 7 backend JS, 1 HTML, 1 service worker)
- [x] Full rename of 163 CSS variable references: `--verdigris` → `--brand-primary`, `--brass` → `--brand-accent`, `--signal` → `--brand-alert`
- [x] Update `global.css` — `:root` and `[data-theme="dark"]` definitions use new names
- [x] Update email service — FROM name reads from `getBrandSync().emailFromName`
- [x] Update all email templates — subjects and bodies use `getBrandSync().name`
- [x] Update Swagger docs title, service worker cache name, theme localStorage key
- [x] Admin brand management UI — `BrandTab` component in admin panel with color pickers and name/email fields
- [x] All 35 backend tests pass, all 8 frontend tests pass, frontend builds clean

**New files created:**
- `backend/src/config/brand.config.js`
- `backend/src/models/brandConfig.model.js`
- `backend/src/controllers/brand.controller.js`
- `backend/src/routes/brand.routes.js`
- `frontend/src/features/brand/BrandContext.jsx`
- `frontend/src/pages/StaffHome/admin/BrandTab.jsx`
- `frontend/src/globals.d.ts`

**Environment variables for deploying bank (backend .env):**
- `BRAND_NAME` — platform name (default: "Cue")
- `BRAND_PRIMARY_COLOR` — hex color (default: #4fa37b)
- `BRAND_ACCENT_COLOR` — hex color (default: #c9a227)
- `BRAND_ALERT_COLOR` — hex color (default: #c1432b)
- `BRAND_SUPPORT_EMAIL` — support contact email
- `BRAND_EMAIL_FROM` — email sender name

**Environment variables for deploying bank (frontend .env):**
- `VITE_BRAND_NAME` — platform name for first-paint
- `VITE_BRAND_PRIMARY_COLOR` — primary color for CSS
- `VITE_BRAND_ACCENT_COLOR` — accent color for CSS
- `VITE_BRAND_ALERT_COLOR` — alert color for CSS

Admin can also change all settings at runtime via the Brand tab in the admin panel — changes persist in MongoDB and take effect on next page load.

### Phase B — Deployment Packaging

- [ ] Write a `.env.template` covering every required variable
- [ ] Write a "Deploy this for your bank" guide (new `docs/DEPLOYMENT.md` or a README section)
- [ ] Document seeding a first admin, branch, and counters on a fresh install

### Phase C — Single-Install Assumption Audit

- [ ] Search for hardcoded URLs
- [ ] Check for hardcoded email domain assumptions
- [ ] Check currency, timezone, and locale assumptions in analytics and operating hours
- [ ] Confirm nothing shares state across what should be independent deployments

### Phase D — AI Service Advisor (deferred)

- [ ] `ServiceMatrix` model: maps a service to a rule (`never` / `always` / `conditional`)
- [ ] `POST /api/queue/check-service` endpoint
- [ ] Override tracking on the `Ticket` model
- [ ] Admin dashboard metric: branch visits deflected, estimated cost saved

Update the status table above as each phase ships, the same way `BUILD_PLAN.md` already tracks the rest of the project.
