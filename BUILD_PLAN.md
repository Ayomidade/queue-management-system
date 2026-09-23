# Build Plan — Cue

A sequenced plan for everything left to build, and why it's ordered this way. Update the relevant status line here as each phase ships.

---

## Pivot: API-First Queue Integration Service

### Concept Shift

**Before:** Standalone queue management platform banks deploy as their own instance
**After:** API-first service banks integrate into their existing software via REST API + webhooks

The demo frontend becomes a proof-of-concept, not the primary product. Banks call Cue's API from their own systems. The customer never interacts with Cue directly — they interact with the bank's app, which calls Cue.

### Key Architectural Changes

| Area              | Current                                | New                                     |
| ----------------- | -------------------------------------- | --------------------------------------- |
| Auth              | JWT tokens for all users               | API keys for bank integrations          |
| Routes            | `/api/*`                               | `/api/v1/*` (versioned)                 |
| Branding          | 3-layer (env + MongoDB + BrandContext) | Env vars only                           |
| Frontend          | Full app with admin/manager panels     | Simplified demo (customer + staff only) |
| AI Agent          | Groq/LLaMA chatbot                     | Deferred                                |
| Multi-tenancy     | Implicit (single deployment)           | Explicit (API key → bank/tenant)        |
| Kiosk/Appointment | Public (no auth)                       | API key required                        |

---

## Where things stand (Previous Work)

| Piece                                                      | Status             |
| ---------------------------------------------------------- | ------------------ |
| Backend: auth, roles, branches, queues, counters, tickets  | ✅ Done            |
| Backend: real-time (Socket.io), no-show handling           | ✅ Done            |
| Backend: branch analytics, daily report, staff performance | ✅ Done            |
| Backend: public board endpoints                            | ✅ Done            |
| Backend: kiosk, appointments, nearest-branch               | ✅ Done            |
| Backend: AI agent (Groq API)                               | ✅ Done (deferred) |
| Backend: webhooks, Slack/Discord notifications             | ✅ Done (deferred) |
| Backend: audit log, bulk import, export                    | ✅ Done            |
| Backend: email notifications (Resend)                      | ✅ Done (deferred) |
| Backend: automated tests (58 tests)                        | ✅ Done            |
| Frontend: all 18 pages                                     | ✅ Done (simplified) |
| Frontend: dark mode, responsive, animations                | ✅ Done            |
| Frontend: automated tests (8 tests)                        | ✅ Done            |
| CI: GitHub Actions pipeline                                | ✅ Done            |
| Customer accounts removed — guest-based tickets            | ✅ Done            |
| Staff management (staff/counter/queue assignment)         | ✅ Done (Phase 8c) |
| Role-based dashboards (admin/manager overview)            | ✅ Done (Phase 8c) |
| Superadmin platform console + key request flow            | ✅ Done (Phase 12) |

---

## Phase 1 — API Key Authentication ✅

**Goal:** Replace JWT-only auth with API key authentication for bank integrations.

**Ships:**

- [x] `ApiKey` model: `key` (hashed), `bankName`, `label`, `scopes[]`, `rateLimit`, `isActive`, `lastUsedAt`, `expiresAt`, `createdAt`
- [x] Key generation endpoint: `POST /api/v1/api-keys` (admin only)
- [x] Key listing: `GET /api/v1/api-keys` (admin only)
- [x] Key revocation: `DELETE /api/v1/api-keys/:id` (admin only)
- [x] Key rotation: `POST /api/v1/api-keys/:id/rotate` (generates new key, old key active for 24h grace period)
- [x] Key toggle: `PATCH /api/v1/api-keys/:id/toggle` (enable/disable without deleting)
- [x] `authenticateApiKey` middleware: reads `X-API-Key` header, validates key, attaches `req.bank` and `req.apiKey` to request
- [x] `requireScope(scope)` middleware: checks `req.apiKey.scopes` includes required scope
- [x] Rate limiting middleware keyed to API key ID (not IP)
- [x] Seed a default admin API key (`npm run seed:apikey`)
- [x] V1 routes mounted in `app.js` with API key auth pipeline
- [x] Tests for `requireScope` and `apiKeyRateLimit` middlewares (10 tests)

**Scopes:**

| Scope             | Access                                               |
| ----------------- | ---------------------------------------------------- |
| `branches:read`   | Read branch info, queues, counters, board data       |
| `tickets:write`   | Create/cancel tickets (kiosk, appointment, customer) |
| `tickets:read`    | Read ticket status, position, ETA                    |
| `staff:read`      | Read staff list                                      |
| `analytics:read`  | Read analytics, reports                              |
| `webhooks:manage` | Create/delete/toggle webhooks                        |
| `admin`           | Full access (system management)                      |

---

## Phase 2 — API Versioning ✅

**Goal:** Prefix all routes with `/api/v1/` for backward compatibility and future-proofing.

**Architecture:**
```
Legacy:  /api/*  → JWT auth (protect middleware)     → existing controllers
V1:      /api/v1/* → API key auth → bankScope → same controllers (bank-scoping is optional)
```

Controllers check `req.bankName` — if set (v1), filter by bank. If not (legacy), skip.

**Ships:**

- [x] V1 routes mounted in `app.js` via clean `v1Router`
- [x] `bankScope` middleware: finds branches belonging to API key's bank, attaches to `req.bankBranchIds`
- [x] `validateBranchOwnership` middleware: validates specific branch belongs to bank
- [x] Board controller: optional bank-scoping on `getAllBoards` and `getBranchBoard`
- [x] Branch controller: optional bank-scoping on all CRUD + auto-set bank on create
- [x] Kiosk controller: optional bank validation on create, get, cancel
- [x] Appointment controller: optional bank validation on slots, create, get
- [x] V1 route files for all resources (`routes/v1/*.routes.js`)
- [x] V1 index router with bankScope middleware (`routes/v1/index.js`)
- [x] Branch model: added `bank` field for multi-tenant isolation
- [x] Branch name uniqueness scoped to bank (not global)
- [x] Frontend API client: added `v1Api` helper and `apiKey` option for v1 routes
- [x] Legacy `/api/` routes preserved for backward compatibility
- [x] All 45 backend + 8 frontend tests pass

---

## Phase 3 — Multi-Tenancy Foundation ✅

**Goal:** Explicit data isolation per bank/tenant.

**Ships:**

- [x] `bank` field added to Branch model (done in Phase 2)
- [x] Branch name uniqueness scoped to bank (done in Phase 2)
- [x] `bankScope` middleware attaches `req.bankBranchIds` and `req.bankFilter` (done in Phase 2)
- [x] V1 controllers filter all queries by `req.bankName` (done in Phase 2)
- [x] V1 board endpoints: filtered by bank (done in Phase 2)
- [x] V1 kiosk/appointment endpoints: validate branch belongs to bank (done in Phase 2)
- [ ] Staff model: add `bank` field (Phase 8 or later)
- [ ] Ticket model: add `bank` field for direct queries (Phase 8 or later)

---

## Phase 4 — Simplify Branding ✅

**Goal:** Remove MongoDB BrandConfig, keep env vars only.

**Ships:**

- [x] Delete `BrandConfig` model
- [x] Simplify `brand.config.js` (env vars only, no cache)
- [x] Delete PATCH endpoint from brand routes (no runtime updates)
- [x] Keep `GET /api/brand` endpoint (returns env var values, for demo frontend)
- [x] Remove DB cache/invalidation logic
- [x] Update email templates to use env vars directly

---

## Phase 5 — New Color Theme ✅

**Goal:** Update the color palette to be professional, banking-friendly, and welcoming.

**Theme: "Verdant Trust"**

| Role       | Current               | New                    | Rationale                |
| ---------- | --------------------- | ---------------------- | ------------------------ |
| Primary    | `#4fa37b` (sage)      | `#0d7c66` (deep teal)  | Trust, stability, growth |
| Accent     | `#c9a227` (gold)      | `#c9a227` (keep)       | Premium feel             |
| Alert      | `#c1432b` (rust)      | `#dc2626` (clean red)  | Better readability       |
| Background | `#efe6cf` (parchment) | `#f9fafb` (warm white) | Clean, modern            |
| Text       | `#101f17` (forest)    | `#111827` (near black) | Better contrast          |
| Surface    | —                     | `#e8ebe9` (sage gray)  | Cards, surfaces          |

**Dark mode:**

| Role       | Current   | New                       |
| ---------- | --------- | ------------------------- |
| Background | `#1a1a1f` | `#0f1419`                 |
| Primary    | `#5bb88a` | `#2dd4a8` (brighter teal) |
| Accent     | `#c9a227` | `#fbbf24` (brighter gold) |
| Surface    | —         | `#1e272e`                 |

**Ships:**

- [x] Update `global.css` CSS custom properties (light + dark mode)
- [x] Update `BrandContext` defaults
- [x] Update env var defaults (.env.example)

---

## Phase 6 — Remove Deferred Features ✅

**Goal:** Clean out code that's no longer part of the core product. Move to `deferred/` folder, do not delete.

**Ships:**

- [x] Move AI agent to `deferred/backend/`: `groq.service.js`, `agent.controller.js`, `agent.routes.js`
- [x] Move AgentChat component to `deferred/frontend/`
- [x] Move push notification routes and service to `deferred/backend/`
- [x] Move `usePushNotifications` hook to `deferred/frontend/`
- [x] Move Slack/Discord notification service to `deferred/backend/`
- [x] Remove `notificationWebhooks` field from Branch model
- [x] Remove agent/push route mounts from `app.js`
- [x] Remove notification/push imports from `ticket.controller.js`
- [x] Remove email notifications (Resend) — moved to deferred (no longer used in core ticket flow)

---

## Phase 7 — Frontend Simplification ✅

**Goal:** Remove admin/manager panels and advanced features. Keep demo-focused pages.

**Moved to deferred:**

- [x] Admin panel (`/pages/StaffHome/admin/` — AdminPanel.jsx + all tabs)
- [x] Manager panel (`/pages/StaffHome/manager/` — ManagerPanel.jsx + all tabs)
- [x] Advanced analytics components (`PeakHoursHeatmap`, `StaffLeaderboard`, `WaitTimeTargets`)
- [x] Webhook management UI (`WebhookSettings`)
- [x] Bulk staff import UI (inline in AnalyticsTab)
- [x] CSV/PDF export buttons (inline in AnalyticsTab)
- [x] Admin login page (`/pages/AdminLogin/`)
- [x] Forgot password page (`/pages/ForgotPassword/`)
- [x] Reset password page (`/pages/ResetPassword/`)
- [x] Verify email page (`/pages/VerifyEmail/`)
- [x] Settings page (`/pages/Settings/`)
- [x] Admin API module (`features/admin/adminApi.js`)
- [x] Manager API module (`features/manager/managerApi.js`)

**Updated:**

- [x] StaffHome: removed manager/admin panels, shows only CounterConsole + TicketHistory
- [x] App.jsx: removed 5 routes (admin-login, forgot-password, reset-password, verify-email, settings)
- [x] Removed Settings link from staff header

**Kept (Demo Pages):**

- [x] Landing page (`/`) — marketing
- [x] Live boards (`/boards`, `/board/:id`) — public demo
- [x] Kiosk (`/kiosk/:id`) — walk-in demo
- [x] Appointments (`/appointment/:id`) — booking demo
- [x] Branch detail (`/branch/:id`) — public info
- [x] Find nearby (`/find-nearby`) — location demo
- [x] Contact (`/contact`) — sales inquiries
- [x] Login/Register — demo auth
- [x] Customer dashboard (`/account`) — ticket tracker demo
- [x] Staff dashboard (`/staff`) — counter console demo (simplified)

---

## Phase 8 — Staff Auth via API Key ✅

**Goal:** Staff don't log in via the demo UI. They access the system through the bank's integration.

**Ships:**

- [x] Remove Login + Register pages from demo frontend (moved to deferred/)
- [x] Staff dashboard authenticates via API key (demo uses VITE_DEMO_API_KEY)
- [x] AuthContext simplified: API-key-first, auto-initializes from env var
- [x] ProtectedRoute works with API key auth
- [x] All staff hooks (useMyCounter, useMyStats, useCounterOperations, useTicketHistory) use apiKey
- [x] All customer hooks (useMyTicket, ticketsApi) use apiKey
- [x] App.jsx routes: removed login, register routes
- [x] Removed email verification, forgot/reset password flows from demo
- [x] Backend auth endpoints preserved for bank integrations

---

## Phase 8b — Guest-Based Tickets & Remove Customer Accounts ✅

**Goal:** Customers don't register or log in. They walk up, fill a form (name, phone, email, purpose), get a ticket, and check status via a public page.

**Ships:**

- [x] Ticket model: removed `user` field; added `guestEmail`, `purpose` fields
- [x] Ticket creation (`POST /api/v1/tickets`): public, accepts guest info (`guestName`, `guestPhone`, `guestEmail`, `purpose`)
- [x] Ticket lookup (`GET /api/v1/tickets/public/:id`): public, looks up by `_id` or `kioskId`
- [x] Ticket cancellation (`PATCH /api/v1/tickets/:id/cancel`): public, anyone with ticket ID can cancel
- [x] `createTicket` controller: generates `kioskId`, removes email sending, removes User model dependency
- [x] `getMyTicket` controller: removed (customers use public endpoint)
- [x] `cancelTicket` controller: simplified to find by ticket ID only
- [x] `notifyTicketChange`: removed user emission (no user accounts)
- [x] `callNextTicket`, `callTicket`, `completeTicket`: removed email sending
- [x] Ticket validator: added guest field validation
- [x] Deleted `User` model (`backend/src/models/user.model.js`)
- [x] Deleted `auth.controller.js` (all user auth endpoints removed)
- [x] Emptied `auth.routes.js` (no user auth routes)
- [x] `protect` middleware: simplified to only query Staff model
- [x] `resolveStaffUser` middleware: removed User fallback
- [x] `user.controller.js`: simplified `changePassword` to Staff only
- [x] `demo.controller.js`: returns only Staff users (no customers)
- [x] `seedAll.js`: removed customer seeding; admin created as Staff role
- [x] `seedAdmin.js`: updated to seed Staff model
- [x] Frontend: deleted `CustomerHome` page and `CreateTicketFlow` component
- [x] Frontend: created `TicketPage` with `TicketForm` (name, phone, email, purpose, branch, service) and `TicketStatus` (ticket number, position, ETA, auto-refresh)
- [x] Frontend: ticket ID stored in localStorage for status persistence
- [x] Frontend: routes updated — `/ticket` and `/ticket/:ticketId` replace `/account`
- [x] Frontend: `AuthContext` simplified — removed `accountType`, `switchUser` always navigates to `/staff`
- [x] Frontend: `Navbar` removed customer role badge and accountType logic
- [x] Frontend: deleted `EmailVerificationBadge` component
- [x] Frontend: `useMyTicket` hook rewritten for public endpoint
- [x] Frontend: `CounterConsole` updated — `user.email` → `guestEmail`
- [x] All 45 backend + 8 frontend tests pass

---

## Phase 8c — Staff Management & Role-Based Dashboards ✅

**Goal:** Managers can manage staff, counters, and queue assignments; admins and managers get role-appropriate overview dashboards.

**Ships:**

- [x] Staff model: added `queues[]` field (ObjectId refs to Queue)
- [x] `assignQueuesToStaff` controller: validates queues belong to same branch
- [x] `getAllStaff` populates `counter` + `queues`
- [x] Legacy route: `PATCH /:staffId/queues`
- [x] New `routes/v1/staff.routes.js` (GET /, POST /, PATCH /:staffId/queues, DELETE /:staffId — admin + manager only)
- [x] `v1Auth.controller.js`: `/me` returns `queues` array
- [x] `features/staff/manageApi.js`: fetchStaffList, createStaff, assignQueuesToStaff, deactivateStaffApi, fetchBranchCounters, createCounter, assign/unassignStaffToCounter, fetchBranchQueues
- [x] `ManagePanel.jsx`, `StaffSubTab.jsx`, `CounterSubTab.jsx` created
- [x] `CounterConsole.jsx`: filters queue dropdown to assigned queues (fallback to all)
- [x] V1 counter assign/unassign routes verified
- [x] `admin.controller.js`: `getAdminOverview` (branches, managers with staff counts, summary) — bank-scoping fixed in Phase 12
- [x] `routes/v1/admin.routes.js` (admin-only), `routes/v1/analytics.routes.js` (admin + manager, `validateBranchOwnership`)
- [x] Both mounted in `routes/v1/index.js`
- [x] `features/staff/adminApi.js`: fetchAdminOverview, fetchBranchAnalytics, fetchBranchStaffPerformance, createBranch
- [x] `AdminOverview.jsx`: cross-branch dashboard, summary cards, branch list, manager list with staff counts, create branch/manager forms
- [x] `ManagerOverview.jsx`: branch analytics — tickets, completion rate, queue lengths, counter status, staff performance
- [x] `StaffHome.jsx` tabs: Admin = Overview + Manage; Manager = Overview + Manage (**no Console**); Staff = Console + History
- [x] `ManagePanel.jsx`: Admin = Staff sub-tab only; Manager = Staff + Counters sub-tabs
- [x] `StaffSubTab.jsx`: admin can create managers (role + branch selectors), shows branch name per staff
- [x] Public v1 routes fix: `routes/v1/public.routes.js` mounted before `authenticateApiKey` in `app.js`
- [x] All 45 backend + 8 frontend tests pass, `vite build` passes

---

## Phase 9 — Webhook Enhancement

**Goal:** Make webhooks a first-class citizen for bank integrations.

**Ships:**

- [ ] Add more event types: `ticket.created`, `ticket.completed`, `ticket.cancelled`, `queue.updated`, `branch.opened`, `branch.closed`
- [ ] Exponential backoff retry (1s, 5s, 30s, 5min, 30min)
- [ ] Webhook delivery log model (event, payload, status, response, timestamp)
- [ ] `GET /api/v1/webhooks/:id/deliveries` endpoint
- [ ] Webhook test endpoint: `POST /api/v1/webhooks/:id/test` (sends test event)

---

## Phase 10 — API Documentation & Integration Guide

**Goal:** Banks can integrate without reading source code.

**Ships:**

- [ ] Update OpenAPI spec for all v1 endpoints
- [ ] Add API key authentication to Swagger UI
- [ ] Write integration guide: "Integrate Cue into Your Bank's System"
- [ ] Document webhook payloads and verification
- [ ] Document rate limits and error codes
- [ ] Update README files

---

## Phase 11 — Testing & CI Updates

**Goal:** Ensure the refactored system works correctly.

**Ships:**

- [ ] Update existing tests for v1 routes
- [ ] Add API key auth tests
- [ ] Add multi-tenancy isolation tests
- [ ] Update CI pipeline for new structure
- [ ] Update frontend tests for removed features
- [ ] Run full test suite, fix any regressions

---

## Phase 12 — Platform Superadmin Console & Bank-Scoped Admin (Option B) ✅

**Goal:** Split platform operations (superadmin) from bank operations (bank-scoped admin). Superadmin monitors API usage and exclusively owns API key lifecycle; bank admin requests keys for their own bank. Everything bank-facing becomes bank-scoped.

**Decisions (locked):**

| Topic | Decision |
|---|---|
| Superadmin auth | JWT-only login at `/platform`; only persona who must log in; excluded from demo user switcher |
| Dashboard | New `/platform` route: Overview / API Keys / Key Requests |
| Usage tracking | Daily buckets (`ApiKeyUsage`) + `ApiKey.requestCount` total |
| Key ownership | Superadmin only creates/revokes/suspends/rotates; bank admin only **requests** |
| Bank admin UI | Visible **"Request API key"** button + request-status list on AdminOverview |
| Request form | Multi-select scopes: `branches:read`, `tickets:read`, `tickets:write`, `staff:read`, `analytics:read`, `webhooks:manage` (`admin` scope reserved for superadmin-created keys) |
| Raw-key delivery | **Encrypted one-time store**: on approve, AES-256-GCM-encrypt raw key onto `ApiKeyRequest`; shown once to superadmin immediately; bank admin's first GET of approved request returns raw key once then ciphertext is permanently deleted |
| Rotation reveal | **Approval only** — rotated keys shown once to superadmin; bank admin does not get rotation reveals |
| Platform scope v1 | **Keys + usage only** (no bank/branch health, no other platform actions yet) |
| Bank scoping (Option B) | Fix `getAdminOverview` + `canAccessBranch`; audit remaining admin routes |

**Architecture after this phase:**

```
Superadmin (platform operator)
  └─ JWT login at POST /api/platform/login
  └─ Dashboard at /platform  (Overview | API Keys | Key Requests)
  └─ Owns: key CRUD, usage monitoring, key-request approval
  └─ NOT in demo user switcher, NOT bank-scoped, no API key needed

Bank Admin / Manager / Staff (bank personas)
  └─ Demo API-key + X-Staff-Id switcher (unchanged)
  └─ /staff dashboard (admin now bank-scoped)
  └─ Bank admin: POST /api/v1/api-key-requests to request a key
  └─ Superadmin approves → key created → raw key shown once to superadmin,
     staged encrypted for bank admin's one-time reveal from request status
```

**Route security split:**

```
/api/platform/*            → protect (JWT) + authorize("superadmin")  ← no bankScope
/api/v1/api-keys/*         → REMOVED (multi-tenancy hole: any admin saw all keys)
/api/v1/api-key-requests/* → API-key auth + authorize("admin") + bankScope
```

**Work packages (execution order):**

### WP1 — Superadmin role foundation ✅
- [x] `staff.model.js`: add `"superadmin"` to role enum
- [x] `seedSuperadmin.js` (new) + `seed:superadmin` npm script + `.env.example` vars (`SEED_SUPERADMIN_EMAIL`, `SEED_SUPERADMIN_PASSWORD`)
- [x] `demo.controller.js`: exclude `role: "superadmin"` from `getDemoUsers`

### WP2 — Platform routes (JWT, outside `/api/v1`) ✅
- [x] New `routes/platform/*` + `controllers/platform/*`
- [x] Endpoints:
  ```
  POST   /api/platform/login
  GET    /api/platform/me
  GET    /api/platform/overview
  GET    /api/platform/api-keys
  POST   /api/platform/api-keys
  DELETE /api/platform/api-keys/:id
  PATCH  /api/platform/api-keys/:id/toggle
  POST   /api/platform/api-keys/:id/rotate
  GET    /api/platform/usage?days=7
  GET    /api/platform/key-requests?status=
  PATCH  /api/platform/key-requests/:id     → approve | reject
  ```
- [x] Mount in `app.js` before v1; `protect` + `authorize("superadmin")` at router level (login route open)
- [x] Reuse/adapt existing apiKey controller logic into `platformApiKey.controller.js`; new `platformUsage.controller.js`, `platformKeyRequest.controller.js`, `platformAuth.controller.js`

### WP3 — Usage tracking (daily buckets + total) ✅
- [x] New `apiKeyUsage.model.js` (`{apiKey, date:"YYYY-MM-DD", count}`, unique compound index + TTL)
- [x] `apiKey.model.js`: add `requestCount` (default 0)
- [x] `apiKey.middleware.js`: fire-and-forget `$inc` upsert on UsageLog + `requestCount` alongside existing `lastUsedAt` write

### WP4 — Bank-admin key request flow + dual reveal ✅
- [x] New `apiKeyRequest.model.js`: `bankName`, `requestedBy` (Staff ref), `label`, `scopes[]`, `rateLimit`, `status: pending/approved/rejected`, `reviewedBy`, `reviewNote`, `apiKey` ref, **`encryptedRawKey`** (iv+tag+payload), **`rawKeyStagedAt`**, `bankKeyRevealedAt`, timestamps
- [x] New v1 routes `apiKeyRequest.routes.js`:
  - `POST /` (bankName from `req.bankName`, requestedBy from `req.user`; blocks duplicate pending)
  - `GET /` (own bank's requests; exposes `canRevealKey`)
  - `GET /:id` one-time reveal: if approved + not yet revealed → decrypt, return raw key, wipe ciphertext, set `bankKeyRevealedAt`
- [x] Platform approve: generate key → create ApiKey → link request → encrypt raw key onto request → return raw key once to superadmin
- [x] Crypto helper `utils/keyWrap.js`: AES-256-GCM with key derived from `KEY_WRAP_SECRET` (fallback `JWT_SECRET`)
- [x] Mount in `routes/v1/index.js` with `authorize("admin")`

### WP5 — Remove multi-tenancy hole ✅
- [x] Remove `app.use("/api/v1/api-keys", apiKeyRouter)` from `app.js`
- [x] Delete `routes/apiKey.routes.js` + orphaned `controllers/apiKey.controller.js` (no frontend consumers)

### WP6 — Bank-scoping fixes (Option B) ✅
- [x] `admin.controller.js` `getAdminOverview`: filter branches by `req.bankName`; managers by `branch ∈ req.bankBranchIds`; staff count scoped when bank present
- [x] `analytics.controller.js` `canAccessBranch`: now async; admin with `req.bankName` must match `branch.bank`; legacy JWT admin keeps permissive behavior; all 3 call sites await it
- [x] Audit other `authorize("admin")` routes: `export` / `staffImport` / `advancedAnalytics` are legacy-JWT-only and NOT called from the demo frontend (Phase 7 moved their UI to deferred/) — left unscoped for single-deployment legacy mode; not reachable from bank-scoped demo UI

### WP7 — Frontend `/platform` console + bank admin request UI ✅
- [x] `pages/Platform/PlatformLogin.jsx` + `PlatformDashboard.jsx` + `Platform.module.css` (Verdant Trust; adapted deferred AdminLogin styling)
- [x] Dashboard tabs: **Overview** (keys, active keys, requests today/7d bars, pending count, top keys), **API Keys** (table + create/suspend/revoke/rotate, raw key modal once), **Key Requests** (pending, approve→show raw key once, reject with note)
- [x] `AuthContext`: dual mode — `apiKey` (demo staff) vs `token` (superadmin, calls `/platform/me`); `loginPlatform()` helper
- [x] `ProtectedRoute`: accepts either apiKey or token; role check unchanged
- [x] `App.jsx`: `/platform/login`, `/platform` (ProtectedRoute `["superadmin"]`)
- [x] `Navbar`: superadmin sees Platform link, no user switcher; `superadmin` role badge CSS
- [x] `AdminOverview.jsx`: **"Request API key"** form (label + rateLimit + multi-select scope chips) + request status list (pending/approved/rejected; approved unrevealed shows **"Reveal key"** button → one-time GET → modal with copy)
- [x] New `features/platform/platformApi.js`; new `features/staff/apiKeyRequestApi.js`
- [x] Fix unused `motion` import in `ManagePanel.jsx:2`

### WP8 — Tests ✅
- [x] `superadmin.authorize.test.js`: superadmin passes superadmin routes; rejected from bank admin routes; bank admin rejected from superadmin routes (4 tests)
- [x] `keyWrap.test.js`: encrypt/decrypt round-trip, random IV, wrong-secret fail, tamper fail, short-ciphertext fail, JWT_SECRET fallback, `usageDateKey` formatting (9 tests)
- [x] Existing tests still pass: **58 backend** (was 45, +13 new) + **8 frontend**
- [x] `node --check` all backend JS passes; `vite build` passes

### WP9 — Docs & plan bookkeeping ✅
- [x] `.env.example`: superadmin seed vars + `KEY_WRAP_SECRET`
- [x] Understandable comments on all new code
- [x] This Phase 12 section updated with ship status
- [x] Full test suite run (58 backend + 8 frontend, all green)

**Not in scope for Phase 12:** webhooks/docs phases (9–11), pre-existing lint debt in untouched files, platform bank/branch management, OpenAPI updates for platform routes (deferred to Phase 10).

---

## Cross-cutting

- [ ] Update `BUILD_PLAN.md` with final status
- [ ] Update `README.md` with new architecture overview
- [ ] Update `backend/README.md` with v1 API reference
- [ ] Update `frontend/README.md` with simplified feature list
- [ ] Update `.env.example` with new variables (API_KEY_SECRET, etc.)
