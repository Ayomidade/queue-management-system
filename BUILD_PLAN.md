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
| Backend: webhooks, Slack/Discord notifications             | ✅ Done            |
| Backend: audit log, bulk import, export                    | ✅ Done            |
| Backend: email notifications (Resend)                      | ✅ Done            |
| Backend: automated tests (35 tests)                        | ✅ Done            |
| Frontend: all 18 pages                                     | ✅ Done            |
| Frontend: dark mode, responsive, animations                | ✅ Done            |
| Frontend: automated tests (8 tests)                        | ✅ Done            |
| CI: GitHub Actions pipeline                                | ✅ Done            |

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

## Cross-cutting

- [ ] Update `BUILD_PLAN.md` with final status
- [ ] Update `README.md` with new architecture overview
- [ ] Update `backend/README.md` with v1 API reference
- [ ] Update `frontend/README.md` with simplified feature list
- [ ] Update `.env.example` with new variables (API_KEY_SECRET, etc.)
