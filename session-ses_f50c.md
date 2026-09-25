# Project concept, progress, and remaining work

**Session ID:** ses_f50c58b85ffebpmH00yzWIFdG8
**Created:** 9/17/2026, 12:57:18 PM
**Updated:** 9/24/2026, 4:10:27 PM

---

## Assistant (Compaction · MiMo-V2.6-Flash Free · 64.4s)

_Thinking:_

The user wants a structured summary of the conversation combining prior summary and the conversation. Output in the specified format, in the same language as the conversation (English).

## Objective
- Pivot "Cue" into an API-first, multi-tenant queue integration service; execute BUILD_PLAN.md Phase 13 (four-model split + real per-role auth). WP1–WP7 now shipped (uncommitted); **currently executing WP8 — Platform console adjustments (Superadmin model everywhere)**, followed by WP9 (docs, env cleanup, full test pass).

## Important Details
- **Locked architecture decisions (user-confirmed):**
  - Four collections: `Staff`, `Admin`, `Manager`, `Superadmin` — **no `role` field; collection = role**; Manager cannot serve tickets
  - JWT payload `{ id, kind, role }` (kind === role); `protect` dispatches via `modelForToken`/`KIND_MODELS`; superadmin login stays `POST /api/platform/login`
  - **Dashboard = JWT-only** for all four roles; **v1 = API-key-only** for banks' external systems; demo switcher/`VITE_DEMO_API_KEY`/`/v1/demo/*` fully removed (WP7, done)
  - Admin `bank` required; `tenantMatch` 403s if admin.bank ≠ key.bankName; JWT-path scoping pattern: `bank = req.bankName || req.user?.bank`
  - Manager oversight allowed (analytics, staff create, counters, close/open day); recall/priority = oversight; **only Staff serve** (`requireStaffServing` + `denyNonStaffServe`)
  - Provisioning: seed superadmin only; admin public self-registration; managers/staff via temp password `Cue-XXXXXX-XXXXXX` (once, `mustChangePassword: true`, never emailed) AND invite links (7d single-use SHA-256)
  - `resolveStaffUser` (v1) = Staff-only, `req.role = "staff"` → v1 uses `requireScope`, not role `authorize()`
  - Key format `cue_<48 hex>`, bcrypt; scopes: `branches:read`, `tickets:read/write`, `staff:read`, `analytics:read`, `webhooks:manage`, `admin` (superadmin-only; BANK_REQUESTABLE_SCOPES excludes `admin`)
  - Theme "Verdant Trust": `#0d7c66` / `#c9a227` / `#dc2626`; env-only branding; understandable comments on all code
  - User directives: "continue" / "proceed with wp8"; do not commit unless asked (nothing committed yet)
- **Tests:** 117 backend + 8 frontend passing; `vite build` green; `node --check` green
- Mongo **not running locally** — migration/seeds untested live; run `npm run migrate:split-staff --dry-run` first on real DBs
- Branch `api-version`, last commit `e3b890d` (WP1–WP2); WP3–WP8 partial changes uncommitted (50+ modified, 14 untracked, 2 deleted files)
- JWT signed with `JWT_SECRET`, `expiresIn` `JWT_EXPIRES_IN || "1d"`
- Pre-existing lint errors (`react-hooks/set-state-in-effect` on load-in-effect pattern, `react-refresh/only-export-components` on AuthContext) — verified pre-existing via stash comparison; not regressions
- A `git stash -u` + interrupted abort occurred mid-session; working tree was verified fully recovered (tests back to 117, all new files present)
- Platform console = superadmin-only, mounted `/api/platform` BEFORE v1 pipeline: `POST /login` open+rate-limited; everything else `protect + authorize("superadmin")`; sub-routers `/api-keys`, `/usage`, `/key-requests`, plus `GET /overview`; NOT bank-scoped

## Work State
### Completed
- Phases 1–8c, Phase 12 (platform console, key requests with one-time AES reveal, usage buckets) — committed `102d953`; Phase 13 WP1–WP2 committed `e3b890d`
- **WP1 ✅:** four models, refPath enums, `ApiKeyRequest.requestedBy→Admin`, `migrateSplitStaff.js`, seeds → superadmin/admin only
- **WP2 ✅:** `protect` by `kind`, `modelForToken`, `KIND_MODELS`; `tenantMatch`; `resolveStaffUser` Staff-only
- **WP3 ✅:** `auth.controller.js` (loginAgainst ×3, registerAdmin, invites, registerWithInvite, getAuthMe, kind-aware changePassword); `invite.model.js`; `auth.routes.js` (authLimiter/registerLimiter); `auth.validator.js`; `utils/password.js`
- **WP4 ✅:** `manager.controller.js`/routes/validator; `staff.controller.js` (dual-path temp password, `bankBranchFilter`, GET `/:staffId`); JWT `adminApiKeyRequest.routes.js` with one-time reveal
- **WP5 ✅:** `requireStaffServing`; JWT ticket routes rewired; v1 `requireScope` wiring; `denyNonStaffServe`; tests →117
- **WP6 ✅ (dashboard → JWT):**
  - Backend: new `routes/admin.overview.routes.js` — `GET /api/admin/overview` (protect + authorize admin), mounted `app.use("/api/admin", ...)` in `app.js`
  - `admin.controller.js` `getAdminOverview`: accepts API-key path OR JWT admin; `bank = req.bankName || req.user?.bank`; manager/staff counts bank-scoped (JWT path resolves branch ids via `Branch.find({bank})`)
  - `branch.controller.js`: create/list/update/delete/getSingle bank scope = `req.bankName || (req.role==="admin" ? req.user?.bank : null)`
  - `analytics.controller.js` `canAccessBranch`: same JWT bank fallback
  - `counter.controller.js` + `counter.routes.js`: `openCounter` allows staff on own assigned counter (`authorize("admin","manager","staff")`), symmetric with close
  - `user.controller.js` changePassword: dispatches via `KIND_MODELS[req.kind]` (no longer Staff-only)
  - Frontend API modules off `v1Api` → `apiClient` + `{ token }`: `manageApi.js`, `adminApi.js`, `apiKeyRequestApi.js`, `ticketsApi.js`, `useCounterOperations.js`, `useMyCounter.js`, `useMyStats.js`, `useTicketHistory.js`, `useMyTicket.js` (public lookup unauthenticated; socket auth uses JWT when present; cancel requires token)
  - All StaffHome components pass `auth.token`: StaffSubTab (uses `fetchBranches` from adminApi, no v1Api), CounterSubTab, CounterConsole (manager guard message), ManagerOverview, AdminOverview (key-requests parsed as `res.data?.data || res.data?.items`), TicketHistory
- **WP7 ✅ (logins + kill demo):**
  - `AuthContext.jsx` rewritten JWT-only: `LOGIN_BY_KIND`, `DEFAULT_AFTER_LOGIN` (staff/manager/admin→`/staff`, superadmin→`/platform`), `toAuth` normalizer (`apiKey: null` always), localStorage `cue_auth`, `getAuthMe` refresh on mount, `login(kind, creds)` (handles `payload.data.user || payload.data.staff`), `loginPlatform`, `logout`, `clearMustChangePassword`, 401 interceptor → session drop + navigate `/`; removed unused `API_URL` export
  - `authApi.js`: `loginStaff/Manager/Admin` → `POST /auth/login/:kind`, `loginPlatform` → `/platform/login`, `getAuthMe`, `changePassword(data, token)` → `POST /auth/change-password` Bearer (fixed old apiKey-as-token bug)
  - New `pages/Login/LoginPage.jsx` + `LoginPage.module.css`: shared page for `/login/:kind` with `VALID_KINDS=["staff","manager","admin"]`, role links, session-expired notice; App.jsx routes `/login` → redirect `/login/staff`, `/login/:kind`
  - `ProtectedRoute.jsx`: `!!auth?.token` only + `allowedRoles` check
  - `Navbar.jsx` rewritten: no UserSwitcher/switchUser; signed-out "Sign in" → `/login/staff"; Platform link
  - `PlatformLogin.jsx`: comment + link updated to `/login/staff`
  - `ChangePassword.jsx`: uses `auth.token`, calls `clearMustChangePassword()` after success
  - `StaffHome.jsx`: `mustChangePassword` force prompt (ChangePassword + sign-out) — hooks order fixed (`useState(activeTab)` before early return)
  - Backend demo surface deleted: `demo.controller.js`, `routes/v1/demo.routes.js`, `/api/v1/demo` mount removed from `app.js`
  - Guest ticket pages off v1: `TicketPage.jsx`/`TicketStatus.jsx` → `GET /tickets/public/:id`, `TicketPage` cancel → `PATCH /tickets/:id/cancel`, `TicketForm` → `GET /queues/public` + `POST /tickets`; new public route in `queue.routes.js` (`router.get("/public", getBranchQueues)` before `router.use(protect)`)
  - Stale "demo frontend" comments cleaned (`resolveStaffUser.js`, `v1Auth.controller.js`, `brand.config.js`)
  - `BUILD_PLAN.md`: WP6/WP7 marked ✅ with full checklists (lines ~119–145); WP8/WP9 still ⏳ (line 121–122)
- Verified clean: no `auth.apiKey`/`switchUser`/`VITE_DEMO`/`v1/demo`/`API_URL}/v1/` refs remain; `v1Api` export kept in `apiClient.js` for external systems only

### Active
- **WP8 — Platform console adjustments (Superadmin model everywhere)** — exploration just started:
  - Read platform backend: `routes/platform/index.js` (protect + authorize superadmin on all non-login), `auth.routes.js` (login + `/me`), `apiKey.routes.js`, `keyRequest.routes.js`, `usage.routes.js`, controllers `platformApiKey.controller.js` (create/list/delete/rotate/toggle, raw key once), `platformKeyRequest.controller.js` (approve/reject, dual reveal, populate requestedBy/reviewedBy), `platformUsage.controller.js` (overview stats), `platformAuth.controller.js` (loginSuperadmin, JWT `{id, kind:"superadmin", role:"superadmin"}`)
  - Read frontend: `features/platform/platformApi.js` (all JWT token calls: platformLogin, fetchPlatformMe/Overview/Usage/ApiKeys, create/revoke/toggle, key-request list/review — file read was truncated at `POST /pl…`), `pages/Platform/PlatformDashboard.jsx` (526 lines, tabs for keys/usage/requests), `PlatformLogin.jsx`
  - Gaps/verification still pending: confirm no stale Staff/role references in platform controllers or PlatformDashboard; check `getPlatformMe`/`identity()` superadmin shape vs frontend; check key-request approve sets `reviewedBy` Superadmin refPath; check `v1/apiKeyRequest.routes.js` legacy path (still populates `requestedBy` with Staff ids?); decide whether legacy v1 key-request routes should be removed/deprecated in WP8; add/adjust platform tests; update BUILD_PLAN WP8 checklist

### Blocked
- Mongo not running locally — migration/seeds can't be verified live

## Next Move
1. Finish WP8 gap analysis: grep platform controllers/frontend/dashboard for stale `Staff`/`role` references; verify `ApiKeyRequest.reviewedBy` set to Superadmin on approve; inspect legacy `routes/v1/apiKeyRequest.routes.js` (Staff-id `requestedBy` mismatch) — remove or gate it since dashboard now uses JWT `/api/admin/api-key-requests`
2. Apply WP8 fixes, add tests for platform authorize/key-request review if missing, run `npm test` (backend+frontend) + `vite build`, mark WP8 ✅ in `BUILD_PLAN.md` with checklist; then WP9 (docs, env cleanup, full test pass)
3. Do not commit until user asks

## Relevant Files
- `/home/gamp/Desktop/cue/BUILD_PLAN.md` — Phase 13 plan; WP1–WP7 ✅ (lines ~74–145), WP8/WP9 ⏳ (lines 121–122)
- `/home/gamp/Desktop/cue/backend/src/routes/platform/index.js` — superadmin gate: authRoutes open, then `protect` + `authorize("superadmin")`; mounts `/api-keys`, `/usage`, `/key-requests`, `/overview`
- `/home/gamp/Desktop/cue/backend/src/routes/platform/{auth,apiKey,keyRequest,usage}.routes.js` — platform surface
- `/home/gamp/Desktop/cue/backend/src/controllers/platform/platformAuth.controller.js` — `loginSuperadmin`, `getPlatformMe`
- `/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js` — key lifecycle, raw key once
- `/home/gamp/Desktop/cue/backend/src/controllers/platform/platformKeyRequest.controller.js` — approve/reject, dual reveal, `reviewedBy`
- `/home/gamp/Desktop/cue/backend/src/controllers/platform/platformUsage.controller.js` — overview + usage buckets
- `/home/gamp/Desktop/cue/backend/src/routes/v1/apiKeyRequest.routes.js` — legacy v1 key-request path (possible WP8 removal)
- `/home/gamp/Desktop/cue/frontend/src/pages/Platform/PlatformDashboard.jsx` — 526-line superadmin console (verify against Superadmin model)
- `/home/gamp/Desktop/cue/frontend/src/pages/Platform/{PlatformLogin.jsx,Platform.module.css}`
- `/home/gamp/Desktop/cue/frontend/src/features/platform/platformApi.js` — JWT platform API (read truncated near `createPlatformKeyRequest`)
- `/home/gamp/Desktop/cue/frontend/src/features/auth/AuthContext.jsx` — JWT-only, `clearMustChangePassword`, 401 interceptor
- `/home/gamp/Desktop/cue/frontend/src/features/auth/{authApi.js,ProtectedRoute.jsx}`
- `/home/gamp/Desktop/cue/frontend/src/pages/Login/{LoginPage.jsx,LoginPage.module.css}` — `/login/:kind`
- `/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/*.jsx` — all on `auth.token`; StaffHome has mustChangePassword prompt
- `/home/gamp/Desktop/cue/backend/src/routes/admin.overview.routes.js` + `controllers/admin.controller.js` — JWT admin overview
- `/home/gamp/Desktop/cue/backend/src/app.js` — mounts (demo removed); v1 chain `authenticateApiKey → resolveStaffUser → tenantMatch → apiKeyRateLimit → v1Router`; public v1 guest routes before it
- `/home/gamp/Desktop/cue/backend/src/routes/queue.routes.js` — new public `GET /queues/public`
- `/home/gamp/Desktop/cue/backend/src/middlewares/auth.middleware.js` — `KIND_MODELS`, `protect`, `authorize`, `requireStaffServing`
- `/home/gamp/Desktop/cue/backend/tests/` — 15 files, 117 tests
- `/home/gamp/Desktop/cue/backend/src/models/{superadmin,admin,manager,staff,apiKeyRequest}.model.js` — identity + request refs

---

## User

---

## Assistant (Build · MiMo-V2.6-Flash Free · 16.7s)

_Thinking:_

The user wants me to continue with WP8. Let me analyze what's needed for WP8 - Platform console adjustments (Superadmin model everywhere).

From my exploration, I need to:

1. **Find WP8 gaps** - grep platform controllers/frontend for stale Staff/role references
2. **Verify ApiKeyRequest.reviewedBy** set to Superadmin on approve
3. **Inspect legacy v1/apiKeyRequest.routes.js** - it has issues: `authorize("admin")` but v1 pipeline uses `requireScope` not role authorize. Also `requestedBy: req.user?._id` - but on v1 path, `req.role = "staff"` from resolveStaffUser, so authorize("admin") would fail? Let me check the auth middleware.

Actually wait - on v1 path:
- `authenticateApiKey → resolveStaffUser → tenantMatch → apiKeyRateLimit → v1Router`
- resolveStaffUser sets `req.role = "staff"` (for demo/external systems)
- authorize("admin") would check role - so admin can't use v1 api-key-requests?

Hmm, but the comment says "Only bank admins may request keys for their bank" - but the JWT path for admin key requests is now at `adminApiKeyRequest.routes.js` (WP2/WP4 - JWT admin api key request routes with one-time reveal).

So the legacy `v1/apiKeyRequest.routes.js` is probably dead code now - dashboard uses JWT `/api/admin/api-key-requests`. Let me verify what routes exist and how they're mounted.

Let me do a thorough WP8 gap analysis:
1. Read platform routes fully (apiKey, keyRequest, usage)
2. Check platformApiKey.controller for create key etc.
3. Check platformKeyRequest - does it set reviewedBy Superadmin?
4. Check legacy v1 apiKeyRequest - is it mounted? Is it broken?
5. Check adminApiKeyRequest.routes.js (JWT path)
6. Check AuthContext - superadmin getAuthMe refresh: does it call getAuthMe or platform me? Looking at AuthContext line 95: `getAuthMe(auth.token)` - this calls GET /auth/me which uses KIND_MODELS - for superadmin kind it should load Superadmin. Let me check auth.controller getAuthMe.
7. Platform dashboard issues:
   - logout navigates to `/platform/login` - does that route still exist?
   - AuthInterceptor navigates to `/` on 401 - for platform maybe OK
   - Platform login response shape: `data.staff` but AuthContext handles `payload.data?.user || payload.data?.staff` - OK
   - getAuthMe for superadmin - need to check if `/auth/me` supports superadmin
8. PlatformLogin - uses loginPlatform
9. Tests for platform routes - missing (no platform routes tests except authorize/middleware)
10. BUILD_PLAN WP8 checklist - read it to see what's required

Let me read BUILD_PLAN WP8 section and remaining platform files.

Continuing WP8 gap analysis: reading the plan checklist, platform routes/controllers, JWT admin key-request path, and auth.me superadmin support.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/BUILD_PLAN.md",
  "offset": 70,
  "limit": 90
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/BUILD_PLAN.md</path>
<type>file</type>
<content>
70: - Demo switcher / `/v1/demo/*` / `VITE_DEMO_API_KEY` fully removed (WP7)
71: - Open admin registration: instant, `bankName` required, rate-limited
72: - Manager keeps oversight (overview, analytics, staff create, counters open/close/assign others, close/open day) but **cannot serve tickets**
73: 
74: ### WP1 — Four models ✅
75: - [x] `staff.model.js` slimmed: name, email, password, branch, counter, queues, isEmailVerified, isActive, mustChangePassword — **no `role`**
76: - [x] New `admin.model.js`: name, email, password, **bank** (required, indexed), isActive, mustChangePassword
77: - [x] New `manager.model.js`: name, email, password, branch, bank (denormalized), isActive, mustChangePassword — no counter/queues
78: - [x] New `superadmin.model.js`: name, email, password, isActive, mustChangePassword — not bank-scoped
79: - [x] Refs: `ApiKeyRequest.requestedBy` → Admin, `reviewedBy` → Superadmin; token/auditLog/pushSubscription refPath enums → `[Staff, Admin, Manager, Superadmin]`
80: - [x] `migrateSplitStaff.js` (+ `npm run migrate:split-staff`, `--dry-run` supported): routes legacy `role` docs into the four collections, denormalizes manager/admin bank from branch, strips role from remaining staff
81: - [x] `seedSuperadmin.js` → Superadmin model; `seedAdmin.js` → Admin model (+ `SEED_ADMIN_BANK`); **`seedAll.js` deleted**, `seed:all` script removed
82: 
83: ### WP2 — Identity: kind JWT + protect dispatch ✅
84: - [x] `protect`: `modelForToken(decoded)` picks Staff/Admin/Manager/Superadmin by `kind` (falls back to `role` for pre-split tokens); rejects unknown kind; **checks `isActive`** (was missing)
85: - [x] JWTs signed with `{ id, kind, role }` by both login paths (platform + staff login)
86: - [x] `resolveStaffUser`: Staff only; `req.role = "staff"` (collection = role); rejects inactive
87: - [x] New `tenantMatch` middleware: admin bank vs `req.bankName` → 403 on mismatch; mounted on authenticated v1 chain
88: - [x] `audit.middleware` maps role → model name for refPath
89: - [x] Admin overview queries `Manager` collection (no role filter); `getAllStaff` stamps `role: "staff"` for API consumers
90: - [x] `createStaff` / staffImport / staff validator: role no longer accepted (Staff-only creation)
91: - [x] Frontend: StaffSubTab staff-only form; AdminOverview manager-create form deferred to WP4
92: - [x] Tests: `modelForToken` (7), `tenantMatch` (5), `fourModelSplit` schemas (8) → **80 backend** green; **8 frontend** + `vite build` green
93: 
94: ### WP3 — Four login endpoints + admin public registration + invites ✅
95: - [x] `POST /api/auth/login/{staff,manager,admin}` — kind JWT `{ id, kind, role }`, generic 401 (no enumeration)
96: - [x] `POST /api/auth/register/admin` — public, instant, `bankName` required, `registerLimiter` (5/15min)
97: - [x] `invite.model.js` — SHA-256 at rest, kind manager|staff, bank/branch scope, 7d TTL, single-use `usedAt`
98: - [x] `POST /api/auth/invites/manager` (admin, bank from JWT) / `invites/staff` (admin|manager, branch-in-bank check)
99: - [x] `POST /api/auth/register/{manager,staff}` — redeem token, path/kind must match, invitee sets own password
100: - [x] `GET /api/auth/me` + `POST /api/auth/change-password` (any kind; clears `mustChangePassword`)
101: - [x] Validators: login×3, registerAdmin, registerWithInvite, invites, changePassword
102: 
103: ### WP4 — Provisioning controllers (manager/staff create, temp password, invite links) ✅
104: - [x] `manager.controller.js`: create (bank denormalized from branch, branch-in-bank check), list (bank-scoped), reassign branch, deactivate
105: - [x] `POST /api/managers` — admin JWT; dual path: body password OR server temp password (`Cue-XXXXXX-XXXXXX`, returned once, `mustChangePassword: true`)
106: - [x] `createStaff`: same dual path; admin branch must be in admin.bank; welcome email **never includes** temp password
107: - [x] `getAllStaff` / `deactivateStaff` / `assignStaffToBranch` / `assignQueuesToStaff`: manager → own branch; admin → all `Branch.bank === Admin.bank` (403 otherwise); new `getStaffById`
108: - [x] JWT admin key-request routes: `POST/GET /api/admin/api-key-requests`, `GET /:id` one-time reveal — `bankName` always `req.user.bank`
109: - [x] Mounted in `app.js`: `/api/managers`, `/api/admin/api-key-requests`; staff routes add `GET /:staffId`
110: 
111: ### WP5 — Role/permission enforcement (manager cannot serve; requireScope wiring) ✅
112: - [x] `requireStaffServing` middleware: staff pass; manager/admin/superadmin → 403 with clear messages; prefers signed `kind` over `role`
113: - [x] JWT ticket routes: call-next / call / complete / skip / my-stats / my-history → `requireStaffServing` only (no authorize)
114: - [x] Oversight kept for manager/admin: branch tickets, recall, priority; close/open day stays manager
115: - [x] Controller defense-in-depth: `denyNonStaffServe` in callNext/call/complete/skip/my-stats/my-history (works on both JWT and v1 paths)
116: - [x] v1 requireScope wiring: tickets write/read, branches:read (branch/queue/counter/board), staff:read, analytics:read
117: - [x] v1 role authorize removed where resolveStaffUser always sets role "staff" (would 403 every API-key request); controller accepts `req.apiKey` integration path for admin overview
118: 
119: ### WP6 — Dashboard moves off v1 onto JWT `/api/*` surface ✅
120: ### WP7 — Frontend: 4 login pages, kill demo switcher/API-key mode ✅
121: ### WP8 — Platform console adjustments (Superadmin model everywhere) ⏳
122: ### WP9 — Docs, env cleanup, full test pass ⏳
123: 
124: **WP6 checklist:**
125: - [x] Backend: `GET /api/admin/overview` (protect + authorize("admin")) — bank scope from `Admin.bank`
126: - [x] `getAdminOverview` accepts JWT path: `bank = req.bankName || req.user?.bank`
127: - [x] Branch create/list/update/delete JWT bank-scoping (`Admin.bank` when no API key)
128: - [x] Analytics `canAccessBranch` uses `Admin.bank` for JWT admin
129: - [x] Frontend API modules migrated off `v1Api` → `apiClient` + Bearer `token`:
130:   - `manageApi.js`, `adminApi.js`, `apiKeyRequestApi.js`, `ticketsApi.js`
131:   - `useCounterOperations`, `useMyCounter`, `useMyStats`, `useTicketHistory`
132:   - `useMyTicket` (public lookup stays unauthenticated; cancel uses JWT)
133: - [x] All StaffHome components pass `auth.token` (StaffSubTab, CounterSubTab, CounterConsole, ManagerOverview, AdminOverview, TicketHistory)
134: - [x] Staff list pagination shape: `res.data` array (paginatedResponse spread)
135: 
136: **WP7 checklist:**
137: - [x] JWT-only `AuthContext` — `login(staff|manager|admin|superadmin)`, `getAuthMe` refresh, no demo auto-init, no `VITE_DEMO_API_KEY`, no `switchUser`
138: - [x] Four login surfaces: `/login/staff`, `/login/manager`, `/login/admin` (+ existing `/platform/login`)
139: - [x] `ProtectedRoute` requires `auth.token` (not apiKey); role allow-list still enforced
140: - [x] Navbar: demo UserSwitcher removed; signed-out “Sign in” → `/login/staff`
141: - [x] `authApi.changePassword` targets `POST /auth/change-password` with Bearer token (kind-aware, not Staff-only)
142: - [x] `mustChangePassword` force prompt on `/staff` + `clearMustChangePassword` after rotation
143: - [x] Counter open allows staff on their own assigned counter (symmetric with close)
144: - [x] LoginPage validates `kind` ∈ {staff, manager, admin}
145: - [x] Backend demo surface removed: `demo.controller.js`, `routes/v1/demo.routes.js`, `GET /api/v1/demo/users` mount
146: - [x] Guest ticket pages off v1 → public `/api/tickets*` + new `GET /api/queues/public` (no auth)
147: 
148: ---
149: 
150: ## Phase 1 — API Key Authentication ✅
151: 
152: **Goal:** Replace JWT-only auth with API key authentication for bank integrations.
153: 
154: **Ships:**
155: 
156: - [x] `ApiKey` model: `key` (hashed), `bankName`, `label`, `scopes[]`, `rateLimit`, `isActive`, `lastUsedAt`, `expiresAt`, `createdAt`
157: - [x] Key generation endpoint: `POST /api/v1/api-keys` (admin only)
158: - [x] Key listing: `GET /api/v1/api-keys` (admin only)
159: - [x] Key revocation: `DELETE /api/v1/api-keys/:id` (admin only)

(Showing lines 70-159 of 594. Use offset=160 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/platform/apiKey.routes.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/routes/platform/apiKey.routes.js</path>
<type>file</type>
<content>
1: import { Router } from "express";
2: import {
3:   createApiKey,
4:   listApiKeys,
5:   deleteApiKey,
6:   rotateApiKey,
7:   toggleApiKey,
8: } from "../../controllers/platform/platformApiKey.controller.js";
9: import {
10:   validateCreateApiKey,
11:   validateRotateApiKey,
12:   validateDeleteApiKey,
13: } from "../../validators/apiKey.validator.js";
14: 
15: /**
16:  * Platform API key routes — superadmin-only key lifecycle.
17:  *
18:  * Replaces the old /api/v1/api-keys routes (authorize("admin")) which
19:  * exposed ALL banks' keys to any bank admin — a multi-tenancy hole.
20:  *
21:  * Bank admins submit ApiKeyRequests instead (see routes/v1/apiKeyRequest.routes.js).
22:  */
23: const router = Router();
24: 
25: router.post("/", validateCreateApiKey, createApiKey);
26: router.get("/", listApiKeys);
27: router.delete("/:id", validateDeleteApiKey, deleteApiKey);
28: router.post("/:id/rotate", validateRotateApiKey, rotateApiKey);
29: router.patch("/:id/toggle", validateDeleteApiKey, toggleApiKey);
30: 
31: export default router;

(End of file - total 31 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/platform/keyRequest.routes.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/routes/platform/keyRequest.routes.js</path>
<type>file</type>
<content>
1: import { Router } from "express";
2: import { body, param } from "express-validator";
3: import {
4:   listKeyRequests,
5:   reviewKeyRequest,
6: } from "../../controllers/platform/platformKeyRequest.controller.js";
7: 
8: /**
9:  * Platform key-request routes — superadmin reviews bank admin requests.
10:  *
11:  * approve → creates ApiKey, returns raw key once to superadmin,
12:  *           stages encrypted raw key for bank admin's one-time reveal.
13:  * reject  → marks request rejected with optional note.
14:  */
15: const router = Router();
16: 
17: const VALID_SCOPES = [
18:   "branches:read",
19:   "tickets:write",
20:   "tickets:read",
21:   "staff:read",
22:   "analytics:read",
23:   "webhooks:manage",
24:   "admin",
25: ];
26: 
27: router.get("/", listKeyRequests);
28: 
29: router.patch(
30:   "/:id",
31:   param("id").isMongoId().withMessage("Invalid request ID"),
32:   body("action")
33:     .isIn(["approve", "reject"])
34:     .withMessage('action must be "approve" or "reject"'),
35:   body("reviewNote")
36:     .optional()
37:     .trim()
38:     .isLength({ max: 500 })
39:     .withMessage("Review note must be under 500 characters"),
40:   body("scopes")
41:     .optional()
42:     .isArray({ min: 1 })
43:     .withMessage("Scopes must be a non-empty array")
44:     .custom((scopes) => {
45:       const invalid = scopes.filter((s) => !VALID_SCOPES.includes(s));
46:       if (invalid.length > 0) {
47:         throw new Error(`Invalid scope(s): ${invalid.join(", ")}`);
48:       }
49:       return true;
50:     }),
51:   body("rateLimit")
52:     .optional()
53:     .isInt({ min: 1, max: 10000 })
54:     .withMessage("Rate limit must be between 1 and 10,000"),
55:   body("label")
56:     .optional()
57:     .trim()
58:     .isLength({ max: 200 })
59:     .withMessage("Label must be under 200 characters"),
60:   reviewKeyRequest,
61: );
62: 
63: export default router;

(End of file - total 63 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/platform/platformKeyRequest.controller.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/platform/platformKeyRequest.controller.js</path>
<type>file</type>
<content>
1: import ApiKey from "../../models/apiKey.model.js";
2: import ApiKeyRequest from "../../models/apiKeyRequest.model.js";
3: import { sendSuccess, sendError } from "../../utils/response.js";
4: import { parsePagination, paginatedResponse } from "../../utils/pagination.js";
5: import { encryptKey } from "../../utils/keyWrap.js";
6: import { validationResult } from "express-validator";
7: 
8: /**
9:  * Platform key-request controller — superadmin reviews bank admin
10:  * API key requests: approve (creates key + stages encrypted raw key)
11:  * or reject.
12:  *
13:  * Dual reveal on approve:
14:  * 1. Raw key returned ONCE to superadmin in this response.
15:  * 2. Raw key AES-256-GCM-encrypted onto the request doc so the bank
16:  *    admin can reveal it once from their request status (WP4).
17:  */
18: 
19: /**
20:  * GET /api/platform/key-requests?status=pending&page=1
21:  * List bank admin key requests, optionally filtered by status.
22:  */
23: export const listKeyRequests = async (req, res, next) => {
24:   try {
25:     const { page, limit, skip } = parsePagination(req.query);
26: 
27:     const filter = {};
28:     if (req.query.status && ["pending", "approved", "rejected"].includes(req.query.status)) {
29:       filter.status = req.query.status;
30:     }
31:     if (req.query.bankName) {
32:       filter.bankName = { $regex: req.query.bankName, $options: "i" };
33:     }
34: 
35:     const [requests, total] = await Promise.all([
36:       ApiKeyRequest.find(filter)
37:         .select("-encryptedRawKey") // never leak ciphertext in list view
38:         .populate("requestedBy", "name email")
39:         .populate("reviewedBy", "name email")
40:         .sort("-createdAt")
41:         .skip(skip)
42:         .limit(limit),
43:       ApiKeyRequest.countDocuments(filter),
44:     ]);
45: 
46:     return sendSuccess(res, {
47:       statusCode: 200,
48:       message: "Key requests fetched",
49:       data: paginatedResponse(requests, total, page, limit),
50:     });
51:   } catch (error) {
52:     next(error);
53:   }
54: };
55: 
56: /**
57:  * PATCH /api/platform/key-requests/:id
58:  * Body: { action: "approve" | "reject", reviewNote?, scopes?, rateLimit?, label? }
59:  *
60:  * approve:
61:  *  - Creates an ApiKey from the request (superadmin may override scopes/rateLimit/label)
62:  *  - Encrypts raw key onto request for bank admin's one-time reveal
63:  *  - Returns raw key ONCE to superadmin
64:  *
65:  * reject:
66:  *  - Marks request rejected with optional note
67:  */
68: export const reviewKeyRequest = async (req, res, next) => {
69:   try {
70:     const errors = validationResult(req);
71:     if (!errors.isEmpty()) {
72:       return sendError(res, {
73:         statusCode: 400,
74:         message: "Validation failed",
75:         errors: errors.array().map((e) => e.msg),
76:       });
77:     }
78: 
79:     const { action, reviewNote, scopes, rateLimit, label } = req.body;
80: 
81:     const request = await ApiKeyRequest.findById(req.params.id);
82:     if (!request) {
83:       return sendError(res, { statusCode: 404, message: "Key request not found" });
84:     }
85:     if (request.status !== "pending") {
86:       return sendError(res, {
87:         statusCode: 400,
88:         message: `Request already ${request.status}`,
89:       });
90:     }
91: 
92:     if (action === "reject") {
93:       request.status = "rejected";
94:       request.reviewedBy = req.user._id;
95:       request.reviewNote = reviewNote || "";
96:       await request.save();
97: 
98:       return sendSuccess(res, {
99:         statusCode: 200,
100:         message: "Key request rejected",
101:         data: {
102:           id: request._id,
103:           status: request.status,
104:           reviewNote: request.reviewNote,
105:         },
106:       });
107:     }
108: 
109:     if (action !== "approve") {
110:       return sendError(res, {
111:         statusCode: 400,
112:         message: 'action must be "approve" or "reject"',
113:       });
114:     }
115: 
116:     // Approve: create the actual ApiKey.
117:     const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();
118:     const finalScopes = scopes?.length ? scopes : request.scopes;
119:     const finalRateLimit = rateLimit || request.rateLimit;
120:     const finalLabel = label || request.label;
121: 
122:     const apiKey = await ApiKey.create({
123:       bankName: request.bankName,
124:       label: finalLabel,
125:       keyHash,
126:       keyPrefix,
127:       scopes: finalScopes,
128:       rateLimit: finalRateLimit,
129:       expiresAt: null,
130:     });
131: 
132:     // Stage encrypted raw key for the bank admin's one-time reveal.
133:     request.status = "approved";
134:     request.reviewedBy = req.user._id;
135:     request.reviewNote = reviewNote || "";
136:     request.apiKey = apiKey._id;
137:     request.scopes = finalScopes;
138:     request.rateLimit = finalRateLimit;
139:     request.label = finalLabel;
140:     request.encryptedRawKey = encryptKey(rawKey);
141:     request.rawKeyStagedAt = new Date();
142:     await request.save();
143: 
144:     return sendSuccess(res, {
145:       statusCode: 200,
146:       message:
147:         "Key request approved. Copy the raw key now — it won't be shown again to you.",
148:       data: {
149:         id: request._id,
150:         status: request.status,
151:         bankName: request.bankName,
152:         apiKey: {
153:           id: apiKey._id,
154:           keyPrefix: apiKey.keyPrefix,
155:           scopes: apiKey.scopes,
156:           rateLimit: apiKey.rateLimit,
157:         },
158:         // Raw key ONCE to superadmin.
159:         key: rawKey,
160:       },
161:     });
162:   } catch (error) {
163:     next(error);
164:   }
165: };

(End of file - total 165 lines)
</content>
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "backend/src/routes/**/*adminApiKey*"
}
```

**Output:**
```
/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js
```

**Tool: grep**

**Input:**
```json
{
  "pattern": "getAuthMe|/auth/me|modelForToken",
  "path": "/home/gamp/Desktop/cue/backend/src"
}
```

**Output:**
```
Found 9 matches
/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js:
  Line 374:  * GET /api/auth/me — any kind (protect sets req.user + req.role/kind).

  Line 376: export const getAuthMe = async (req, res, next) => {


/home/gamp/Desktop/cue/backend/src/routes/auth.routes.js:
  Line 10:   getAuthMe,

  Line 40:  *   GET  /api/auth/me

  Line 116: router.get("/me", getAuthMe);


/home/gamp/Desktop/cue/backend/src/routes/v1/index.js:
  Line 59: v1Router.get("/auth/me", getme);


/home/gamp/Desktop/cue/backend/src/middlewares/auth.middleware.js:
  Line 29: export const modelForToken = (decoded) => {

  Line 49:     const Model = modelForToken(decoded);


/home/gamp/Desktop/cue/backend/src/controllers/v1Auth.controller.js:
  Line 4:  * GET /api/v1/auth/me

```

**Tool: grep**

**Input:**
```json
{
  "pattern": "apiKeyRequest|adminApiKeyRequest|/api-keys",
  "path": "/home/gamp/Desktop/cue/backend/src/routes"
}
```

**Output:**
```
Found 7 matches
/home/gamp/Desktop/cue/backend/src/routes/v1/index.js:
  Line 12: import apiKeyRequestRouter from "./apiKeyRequest.routes.js";

  Line 58: v1Router.use("/api-key-requests", apiKeyRequestRouter);


/home/gamp/Desktop/cue/backend/src/routes/v1/apiKeyRequest.routes.js:
  Line 4: import ApiKeyRequest from "../../models/apiKeyRequest.model.js";


/home/gamp/Desktop/cue/backend/src/routes/platform/apiKey.routes.js:
  Line 18:  * Replaces the old /api/v1/api-keys routes (authorize("admin")) which

  Line 21:  * Bank admins submit ApiKeyRequests instead (see routes/v1/apiKeyRequest.routes.js).


/home/gamp/Desktop/cue/backend/src/routes/platform/index.js:
  Line 33: platformRouter.use("/api-keys", apiKeyRoutes);


/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js:
  Line 3: import ApiKeyRequest from "../models/apiKeyRequest.model.js";

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/Platform/PlatformLogin.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/Platform/PlatformLogin.jsx</path>
<type>file</type>
<content>
1: import { useState, useEffect } from "react";
2: import { motion } from "framer-motion";
3: import { Link, useNavigate, useLocation } from "react-router-dom";
4: import { useAuth } from "../../features/auth/AuthContext";
5: import { useBrand } from "../../features/brand/BrandContext";
6: import { ApiError } from "../../lib/apiClient";
7: import MotionBackground from "../../components/MotionBackground/MotionBackground";
8: import logoUrl from "../../assets/logo.svg";
9: import styles from "./Platform.module.css";
10: 
11: /**
12:  * PlatformLogin — superadmin JWT login for the /platform console.
13:  *
14:  * Superadmin uses the dedicated POST /platform/login endpoint.
15:  * Bank staff/manager/admin use /login/{kind} (WP7).
16:  */
17: const PlatformLogin = () => {
18:   const { brand } = useBrand();
19:   const { loginPlatform, auth } = useAuth();
20:   const navigate = useNavigate();
21:   const location = useLocation();
22: 
23:   const [form, setForm] = useState({ email: "", password: "" });
24:   const [error, setError] = useState(null);
25:   const [submitting, setSubmitting] = useState(false);
26: 
27:   // Already signed in → go to console (in an effect, not during render).
28:   useEffect(() => {
29:     if (auth?.token && auth?.role === "superadmin") {
30:       navigate("/platform", { replace: true });
31:     }
32:   }, [auth?.token, auth?.role, navigate]);
33: 
34:   const handleChange = (field) => (e) =>
35:     setForm((f) => ({ ...f, [field]: e.target.value }));
36: 
37:   const handleSubmit = async (e) => {
38:     e.preventDefault();
39:     setError(null);
40:     setSubmitting(true);
41:     try {
42:       await loginPlatform(form);
43:       navigate(location.state?.from || "/platform", { replace: true });
44:     } catch (err) {
45:       setError(
46:         err instanceof ApiError
47:           ? err.message
48:           : "Something went wrong, try again.",
49:       );
50:     } finally {
51:       setSubmitting(false);
52:     }
53:   };
54: 
55:   return (
56:     <section className={styles.page}>
57:       <MotionBackground />
58:       <div className={styles.loginContainer}>
59:         <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
60:           <div className={styles.logoHeader}>
61:             <img src={logoUrl} alt="" />
62:             <span>{brand.name}</span>
63:           </div>
64:           <p className={styles.eyebrow}>№ 012 — platform access</p>
65:           <h1 className={styles.heading}>Platform control.</h1>
66:           <p className={styles.subhead}>
67:             Sign in to monitor API usage, manage keys, and review bank key
68:             requests across all tenants.
69:           </p>
70:         </motion.div>
71: 
72:         <motion.div
73:           className={styles.loginCard}
74:           initial={{ opacity: 0, y: 24 }}
75:           animate={{ opacity: 1, y: 0 }}
76:           transition={{ delay: 0.15 }}
77:         >
78:           {location.state?.sessionExpired && (
79:             <p className={styles.errorMsg}>
80:               Your session expired. Sign in again to continue.
81:             </p>
82:           )}
83: 
84:           <div className={styles.badge}>
85:             <span className={styles.badgeDot} />
86:             Superadmin only
87:           </div>
88: 
89:           <form onSubmit={handleSubmit} className={styles.form}>
90:             <label className={styles.field}>
91:               <span>Email</span>
92:               <input
93:                 required
94:                 type="email"
95:                 autoComplete="username"
96:                 value={form.email}
97:                 onChange={handleChange("email")}
98:                 placeholder="superadmin@cue.dev"
99:               />
100:             </label>
101:             <label className={styles.field}>
102:               <span>Password</span>
103:               <input
104:                 required
105:                 type="password"
106:                 autoComplete="current-password"
107:                 value={form.password}
108:                 onChange={handleChange("password")}
109:                 placeholder="••••••••"
110:               />
111:             </label>
112: 
113:             {error && <p className={styles.errorMsg}>{error}</p>}
114: 
115:             <button
116:               type="submit"
117:               className={styles.submitBtn}
118:               disabled={submitting}
119:             >
120:               {submitting ? "Checking…" : "Sign in to platform"}
121:             </button>
122:           </form>
123: 
124:           <p className={styles.switchLine}>
125:             Bank staff use the{" "}
126:             <Link to="/login/staff">staff console</Link> instead.
127:           </p>
128:         </motion.div>
129:       </div>
130:     </section>
131:   );
132: };
133: 
134: export default PlatformLogin;

(End of file - total 134 lines)
</content>
```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 11.9s)

_Thinking:_

Let me continue WP8 gap analysis. I need to:

1. Find WP8 checklist details in BUILD_PLAN - I only saw the header line. Let me search for WP8 details.
2. Check remaining gaps:
   - `reviewedBy` Superadmin on approve - DONE (reviewedBy = req.user._id on platform path)
   - Legacy v1/apiKeyRequest.routes.js - uses authorize("admin") but resolveStaffUser sets role="staff" always → WP5 removed v1 role authorize. This is broken/dead code?
   - Frontend apiKeyRequestApi.js - uses JWT path now?
   - Platform logout navigates to `/platform/login` - good
   - AuthInterceptor navigates to `/` on 401 - PlatformLogin checks sessionExpired but AuthInterceptor doesn't pass state - minor
   - getAuthMe for superadmin - need to check if it works for superadmin kind
   - platformApi.js - read was truncated earlier
   - Tests for platform routes - only authorize middleware tests exist, no platform route tests
   - Stale Staff references in platform codeLet me dig more into WP8.

Checking WP8 details in the plan, legacy v1 key-request wiring, JWT admin path, and getAuthMe for superadmin.

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/BUILD_PLAN.md",
  "pattern": "WP8|Platform console|superadmin"
}
```

**Output:**
```
Found 100 matches (more matches available)
/home/gamp/Desktop/cue/backend/.env.example:
  Line 19: # ── Superadmin seeding (seed:superadmin) ──────────────

  Line 23: SEED_SUPERADMIN_EMAIL=superadmin@cue.dev

  Line 34: # In production keys are created by the superadmin on /platform.


/home/gamp/Desktop/cue/BUILD_PLAN.md:
  Line 69: - Seeds: **superadmin only** (admins self-register public; managers/staff via temp-password + invite links — both mechanisms)

  Line 78: - [x] New `superadmin.model.js`: name, email, password, isActive, mustChangePassword — not bank-scoped

  Line 112: - [x] `requireStaffServing` middleware: staff pass; manager/admin/superadmin → 403 with clear messages; prefers signed `kind` over `role`

  Line 121: ### WP8 — Platform console adjustments (Superadmin model everywhere) ⏳

  Line 137: - [x] JWT-only `AuthContext` — `login(staff|manager|admin|superadmin)`, `getAuthMe` refresh, no demo auto-init, no `VITE_DEMO_API_KEY`, no `switchUser`

  Line 469: **Goal:** Split platform operations (superadmin) from bank operations (bank-scoped admin). Superadmin monitors API usage and exclusively owns API key lifecycle; bank admin requests keys for their own bank. Everything bank-facing becomes bank-scoped.

  Line 480: | Request form | Multi-select scopes: `branches:read`, `tickets:read`, `tickets:write`, `staff:read`, `analytics:read`, `webhooks:manage` (`admin` scope reserved for superadmin-created keys) |

  Line 481: | Raw-key delivery | **Encrypted one-time store**: on approve, AES-256-GCM-encrypt raw key onto `ApiKeyRequest`; shown once to superadmin immediately; bank admin's first GET of approved request returns raw key once then ciphertext is permanently deleted |

  Line 482: | Rotation reveal | **Approval only** — rotated keys shown once to superadmin; bank admin does not get rotation reveals |

  Line 499:   └─ Superadmin approves → key created → raw key shown once to superadmin,

  Line 506: /api/platform/*            → protect (JWT) + authorize("superadmin")  ← no bankScope

  Line 514: - [x] `staff.model.js`: add `"superadmin"` to role enum

  Line 515: - [x] `seedSuperadmin.js` (new) + `seed:superadmin` npm script + `.env.example` vars (`SEED_SUPERADMIN_EMAIL`, `SEED_SUPERADMIN_PASSWORD`)

  Line 516: - [x] `demo.controller.js`: exclude `role: "superadmin"` from `getDemoUsers`

  Line 534: - [x] Mount in `app.js` before v1; `protect` + `authorize("superadmin")` at router level (login route open)

  Line 548: - [x] Platform approve: generate key → create ApiKey → link request → encrypt raw key onto request → return raw key once to superadmin

  Line 564: - [x] `AuthContext`: dual mode — `apiKey` (demo staff) vs `token` (superadmin, calls `/platform/me`); `loginPlatform()` helper

  Line 566: - [x] `App.jsx`: `/platform/login`, `/platform` (ProtectedRoute `["superadmin"]`)

  Line 567: - [x] `Navbar`: superadmin sees Platform link, no user switcher; `superadmin` role badge CSS

  Line 572: ### WP8 — Tests ✅

  Line 573: - [x] `superadmin.authorize.test.js`: superadmin passes superadmin routes; rejected from bank admin routes; bank admin rejected from superadmin routes (4 tests)

  Line 579: - [x] `.env.example`: superadmin seed vars + `KEY_WRAP_SECRET`


/home/gamp/Desktop/cue/backend/src/models/superadmin.model.js:
  Line 11:  * Login: POST /api/platform/login (JWT with kind="superadmin").

  Line 12:  * Seeded via `npm run seed:superadmin` — never created at runtime.

  Line 14: const superadminSchema = new mongoose.Schema(

  Line 52: superadminSchema.pre("save", async function () {

  Line 64: superadminSchema.methods.comparePassword = async function (candidatepassword) {

  Line 68: export default mongoose.model("Superadmin", superadminSchema);


/home/gamp/Desktop/cue/backend/src/models/apiKeyRequest.model.js:
  Line 11:  *    the superadmin, AND the raw key is AES-256-GCM-encrypted onto this

  Line 54:     // The platform superadmin who approved or rejected the request.


/home/gamp/Desktop/cue/backend/src/scripts/seedSuperadmin.js:
  Line 4: import Superadmin from "../models/superadmin.model.js";

  Line 9:  * Seeds the platform superadmin account (Superadmin collection).

  Line 11:  * The superadmin is the ONLY persona who logs in with email/password

  Line 12:  * at /platform (JWT with kind="superadmin"). They manage API keys and

  Line 40:       `A superadmin already exists (${existingSuperadmin.email}). Nothing to do.`,

  Line 48:       `A superadmin with email ${email} already exists. Choose a different SEED_SUPERADMIN_EMAIL.`,

  Line 52:   const superadmin = await Superadmin.create({

  Line 59:   console.log(`  Email: ${superadmin.email}`);

  Line 60:   console.log(`  Kind:  superadmin`);

  Line 65:     console.error("Failed to seed superadmin:", error.message);


/home/gamp/Desktop/cue/backend/src/scripts/migrateSplitStaff.js:
  Line 7: import Superadmin from "../models/superadmin.model.js";

  Line 16:  *   role "superadmin" → superadmins   (Superadmin model)

  Line 41:   const buckets = { superadmin: [], admin: [], manager: [], staff: [] };

  Line 99:   const superadmins = buckets.superadmin.map(stripCommon);

  Line 107:   report("superadmins", superadmins);

  Line 112:     `  (superadmins/admins/managers who can't migrate stay in staffs untouched)`,

  Line 134:   await insert(Superadmin, superadmins, "superadmins");

  Line 150:     ...superadmins.map((d) => d._id),


/home/gamp/Desktop/cue/frontend/src/App.jsx:
  Line 120:             <ProtectedRoute allowedRoles={["superadmin"]}>


/home/gamp/Desktop/cue/backend/src/app.js:
  Line 105: // ── Platform routes (superadmin JWT auth) ───────────────────────

  Line 108: // the superadmin is a platform operator, not a bank tenant.


/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js:
  Line 33:   // "admin" is reserved for superadmin-created keys only.

  Line 115:         message: "API key request submitted for superadmin review",


/home/gamp/Desktop/cue/backend/src/routes/platform/apiKey.routes.js:
  Line 16:  * Platform API key routes — superadmin-only key lifecycle.


/home/gamp/Desktop/cue/backend/src/routes/platform/index.js:
  Line 10:  * Platform router — superadmin-only, JWT-protected.

  Line 14:  * bankScope — the superadmin is a platform operator, not bank-scoped.

  Line 18:  *   everything else           → protect + authorize("superadmin")

  Line 26: // GET /me under authRoutes also applies protect + authorize("superadmin").

  Line 29: // Everything mounted below this line requires a valid superadmin JWT.

  Line 31: platformRouter.use(authorize("superadmin"));


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx:
  Line 16: // Scopes a bank admin may request (admin scope is superadmin-only).

  Line 257:         Request an API key for your bank. The superadmin reviews it on the


/home/gamp/Desktop/cue/backend/src/routes/platform/auth.routes.js:
  Line 9:  * Platform auth routes — superadmin JWT login.

  Line 11:  * POST /api/platform/login is OPEN (but rate-limited) so the superadmin

  Line 13:  * protect + authorize("superadmin") (applied in routes/platform/index.js).

  Line 18: router.get("/me", protect, authorize("superadmin"), getPlatformMe);


/home/gamp/Desktop/cue/backend/src/routes/platform/usage.routes.js:
  Line 5:  * Platform usage routes — API usage monitoring for superadmin.


/home/gamp/Desktop/cue/backend/src/routes/platform/keyRequest.routes.js:
  Line 9:  * Platform key-request routes — superadmin reviews bank admin requests.

  Line 11:  * approve → creates ApiKey, returns raw key once to superadmin,


/home/gamp/Desktop/cue/frontend/src/pages/Login/LoginPage.jsx:
  Line 61:     if (auth?.token && auth.role && auth.role !== "superadmin") {


/home/gamp/Desktop/cue/frontend/src/pages/Platform/PlatformDashboard.jsx:
  Line 23:  * PlatformDashboard — superadmin console for API keys + usage monitoring.

  Line 169:       // Raw key shown ONCE to superadmin; also staged encrypted for bank admin.


/home/gamp/Desktop/cue/frontend/src/pages/Platform/Platform.module.css:
  Line 1: /* ── Platform console (superadmin) — Verdant Trust theme ── */


/home/gamp/Desktop/cue/frontend/src/pages/Platform/PlatformLogin.jsx:
  Line 12:  * PlatformLogin — superadmin JWT login for the /platform console.

  Line 29:     if (auth?.token && auth?.role === "superadmin") {

  Line 98:                 placeholder="superadmin@cue.dev"


/home/gamp/Desktop/cue/backend/src/routes/v1/index.js:
  Line 57: // Bank admin → superadmin API key request flow (bank-scoped via bankName).


/home/gamp/Desktop/cue/backend/src/routes/v1/apiKeyRequest.routes.js:
  Line 13:  * Bank admins cannot create/list/revoke keys directly (that's superadmin-

  Line 15:  * the superadmin approves or rejects it on the platform dashboard.

  Line 35:   // "admin" is reserved for superadmin-created keys only.

  Line 115:         message: "API key request submitted for superadmin review",


/home/gamp/Desktop/cue/backend/src/middlewares/auth.middleware.js:
  Line 5: import Superadmin from "../models/superadmin.model.js";

  Line 12:  * with a `kind` claim ("staff" | "admin" | "manager" | "superadmin").

  Line 20:   superadmin: Superadmin,


/home/gamp/Desktop/cue/backend/src/middlewares/audit.middleware.js:
  Line 19:               superadmin: "Superadmin",


/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js:
  Line 5: import Superadmin from "../models/superadmin.model.js";

  Line 411:           : kind === "superadmin"


/home/gamp/Desktop/cue/backend/src/controllers/platform/platformKeyRequest.controller.js:
  Line 9:  * Platform key-request controller — superadmin reviews bank admin

  Line 14:  * 1. Raw key returned ONCE to superadmin in this response.

  Line 61:  *  - Creates an ApiKey from the request (superadmin may override scopes/rateLimit/label)

  Line 63:  *  - Returns raw key ONCE to superadmin

  Line 158:         // Raw key ONCE to superadmin.


/home/gamp/Desktop/cue/backend/src/controllers/platform/platformAuth.controller.js:
  Line 2: import Superadmin from "../../models/superadmin.model.js";

  Line 6:  * Platform auth controller — superadmin JWT login for /platform.

  Line 8:  * After the four-model split, superadmins live in their own collection

  Line 16:  * Issues a JWT with kind="superadmin" if the account exists and is active.

  Line 29:     const superadmin = await Superadmin.findOne({


(Results truncated. Consider using a more specific path or pattern.)
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js",
  "offset": 370,
  "limit": 60
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js</path>
<type>file</type>
<content>
370:   }
371: };
372: 
373: /**
374:  * GET /api/auth/me — any kind (protect sets req.user + req.role/kind).
375:  */
376: export const getAuthMe = async (req, res, next) => {
377:   try {
378:     const kind = req.kind || req.role;
379:     return sendSuccess(res, {
380:       statusCode: 200,
381:       message: "Current identity",
382:       data: identity(req.user, kind),
383:     });
384:   } catch (error) {
385:     next(error);
386:   }
387: };
388: 
389: /**
390:  * POST /api/auth/change-password — any kind (protect first).
391:  * Clears mustChangePassword after a successful rotation.
392:  */
393: export const changePassword = async (req, res, next) => {
394:   try {
395:     if (!runValidation(req, res)) return;
396: 
397:     const { currentPassword, newPassword } = req.body;
398:     if (currentPassword === newPassword) {
399:       return sendError(res, {
400:         statusCode: 400,
401:         message: "New password must be different from current password",
402:       });
403:     }
404: 
405:     const kind = req.kind || req.role;
406:     const Model =
407:       kind === "admin"
408:         ? Admin
409:         : kind === "manager"
410:           ? Manager
411:           : kind === "superadmin"
412:             ? Superadmin
413:             : Staff;
414: 
415:     const account = await Model.findById(req.user._id).select("+password");
416:     if (!account) {
417:       return sendError(res, { statusCode: 404, message: "Account not found" });
418:     }
419: 
420:     const isMatch = await account.comparePassword(currentPassword);
421:     if (!isMatch) {
422:       return sendError(res, {
423:         statusCode: 400,
424:         message: "Current password is incorrect",
425:       });
426:     }
427: 
428:     account.password = newPassword;
429:     account.mustChangePassword = false;

(Showing lines 370-429 of 439. Use offset=430 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js</path>
<type>file</type>
<content>
1: import { Router } from "express";
2: import { body, param, validationResult } from "express-validator";
3: import ApiKeyRequest from "../models/apiKeyRequest.model.js";
4: import { sendSuccess, sendError } from "../utils/response.js";
5: import { parsePagination, paginatedResponse } from "../utils/pagination.js";
6: import { decryptKey } from "../utils/keyWrap.js";
7: import { protect, authorize } from "../middlewares/auth.middleware.js";
8: 
9: /**
10:  * Bank-admin API key request routes — JWT-authenticated (Phase 13 WP4).
11:  *
12:  * Same behavior as the v1 API-key version, but identity comes from the
13:  * admin's JWT (`req.user`) instead of the API key header. This is the
14:  * path the dashboard will use once WP6 moves it off v1.
15:  *
16:  * bankName is ALWAYS forced from Admin.bank (never from the body).
17:  *
18:  * One-time reveal:
19:  *   GET /api/admin/api-key-requests/:id
20:  *   If status=approved and bankKeyRevealedAt is null, returns the raw key
21:  *   (decrypted from the staged ciphertext), wipes ciphertext, and sets
22:  *   bankKeyRevealedAt. Subsequent GETs return metadata only (no raw key).
23:  */
24: const router = Router();
25: 
26: const BANK_REQUESTABLE_SCOPES = [
27:   "branches:read",
28:   "tickets:read",
29:   "tickets:write",
30:   "staff:read",
31:   "analytics:read",
32:   "webhooks:manage",
33:   // "admin" is reserved for superadmin-created keys only.
34: ];
35: 
36: // Only bank admins may request keys for their bank.
37: router.use(protect, authorize("admin"));
38: 
39: /**
40:  * POST /api/admin/api-key-requests
41:  * Body: { label?, scopes?, rateLimit? }
42:  */
43: router.post(
44:   "/",
45:   body("label")
46:     .optional()
47:     .trim()
48:     .isLength({ max: 200 })
49:     .withMessage("Label must be under 200 characters"),
50:   body("scopes")
51:     .optional()
52:     .isArray({ min: 1 })
53:     .withMessage("Scopes must be a non-empty array")
54:     .custom((scopes) => {
55:       const invalid = scopes.filter((s) => !BANK_REQUESTABLE_SCOPES.includes(s));
56:       if (invalid.length > 0) {
57:         throw new Error(
58:           `Scope(s) not requestable by bank admin: ${invalid.join(", ")}`,
59:         );
60:       }
61:       return true;
62:     }),
63:   body("rateLimit")
64:     .optional()
65:     .isInt({ min: 1, max: 10000 })
66:     .withMessage("Rate limit must be between 1 and 10,000"),
67:   async (req, res, next) => {
68:     try {
69:       const errors = validationResult(req);
70:       if (!errors.isEmpty()) {
71:         return sendError(res, {
72:           statusCode: 400,
73:           message: "Validation failed",
74:           errors: errors.array().map((e) => e.msg),
75:         });
76:       }
77: 
78:       // Bank scope always comes from the JWT identity (Admin.bank).
79:       const bankName = req.user.bank;
80:       if (!bankName) {
81:         return sendError(res, {
82:           statusCode: 400,
83:           message: "Admin has no bank — cannot request API keys",
84:         });
85:       }
86: 
87:       // Prevent duplicate pending requests for the same bank.
88:       const existingPending = await ApiKeyRequest.findOne({
89:         bankName,
90:         status: "pending",
91:       });
92:       if (existingPending) {
93:         return sendError(res, {
94:           statusCode: 409,
95:           message: "You already have a pending API key request",
96:         });
97:       }
98: 
99:       const { label, scopes, rateLimit } = req.body;
100: 
101:       const request = await ApiKeyRequest.create({
102:         bankName,
103:         // Admin collection ref (WP1 changed requestedBy → Admin).
104:         requestedBy: req.user._id,
105:         label: label || "",
106:         scopes: scopes?.length
107:           ? scopes
108:           : ["branches:read", "tickets:read", "tickets:write"],
109:         rateLimit: rateLimit || 100,
110:         status: "pending",
111:       });
112: 
113:       return sendSuccess(res, {
114:         statusCode: 201,
115:         message: "API key request submitted for superadmin review",
116:         data: {
117:           id: request._id,
118:           bankName: request.bankName,
119:           label: request.label,
120:           scopes: request.scopes,
121:           rateLimit: request.rateLimit,
122:           status: request.status,
123:           createdAt: request.createdAt,
124:         },
125:       });
126:     } catch (error) {
127:       next(error);
128:     }
129:   },
130: );
131: 
132: /**
133:  * GET /api/admin/api-key-requests
134:  * List this admin's bank requests (metadata only; ciphertext never included).
135:  */
136: router.get("/", async (req, res, next) => {
137:   try {
138:     const bankName = req.user.bank;
139:     if (!bankName) {
140:       return sendError(res, {
141:         statusCode: 400,
142:         message: "Admin has no bank — cannot list API key requests",
143:       });
144:     }
145: 
146:     const { page, limit, skip } = parsePagination(req.query);
147:     const filter = { bankName };
148: 
149:     const [requests, total] = await Promise.all([
150:       ApiKeyRequest.find(filter)
151:         .select("-encryptedRawKey")
152:         .sort("-createdAt")
153:         .skip(skip)
154:         .limit(limit),
155:       ApiKeyRequest.countDocuments(filter),
156:     ]);
157: 
158:     // Surface whether a reveal is still available (approved but not yet shown).
159:     const data = requests.map((r) => ({
160:       id: r._id,
161:       bankName: r.bankName,
162:       label: r.label,
163:       scopes: r.scopes,
164:       rateLimit: r.rateLimit,
165:       status: r.status,
166:       reviewNote: r.reviewNote,
167:       apiKey: r.apiKey,
168:       canRevealKey:
169:         r.status === "approved" &&
170:         !!r.encryptedRawKey &&
171:         !r.bankKeyRevealedAt,
172:       revealedAt: r.bankKeyRevealedAt,
173:       createdAt: r.createdAt,
174:     }));
175: 
176:     return sendSuccess(res, {
177:       statusCode: 200,
178:       message: "API key requests fetched",
179:       data: paginatedResponse(data, total, page, limit),
180:     });
181:   } catch (error) {
182:     next(error);
183:   }
184: });
185: 
186: /**
187:  * GET /api/admin/api-key-requests/:id
188:  * One-time raw-key reveal for an approved request (bank-scoped by JWT).
189:  */
190: router.get(
191:   "/:id",
192:   param("id").isMongoId().withMessage("Invalid request ID"),
193:   async (req, res, next) => {
194:     try {
195:       const errors = validationResult(req);
196:       if (!errors.isEmpty()) {
197:         return sendError(res, {
198:           statusCode: 400,
199:           message: "Validation failed",
200:           errors: errors.array().map((e) => e.msg),
201:         });
202:       }
203: 
204:       const bankName = req.user.bank;
205:       if (!bankName) {
206:         return sendError(res, {
207:           statusCode: 400,
208:           message: "Admin has no bank — cannot fetch API key requests",
209:         });
210:       }
211: 
212:       // Always scope the lookup to this bank — never leak another bank's request.
213:       const request = await ApiKeyRequest.findOne({
214:         _id: req.params.id,
215:         bankName,
216:       }).select("-encryptedRawKey");
217: 
218:       if (!request) {
219:         return sendError(res, { statusCode: 404, message: "Request not found" });
220:       }
221: 
222:       let rawKey = null;
223:       let justRevealed = false;
224: 
225:       if (request.status === "approved" && !request.bankKeyRevealedAt) {
226:         const full = await ApiKeyRequest.findById(request._id).select(
227:           "encryptedRawKey",
228:         );
229:         if (full?.encryptedRawKey) {
230:           try {
231:             rawKey = decryptKey(full.encryptedRawKey);
232:             // Wipe ciphertext permanently after successful decrypt.
233:             await ApiKeyRequest.updateOne(
234:               { _id: request._id },
235:               {
236:                 $set: { bankKeyRevealedAt: new Date() },
237:                 $unset: { encryptedRawKey: 1 },
238:               },
239:             );
240:             justRevealed = true;
241:           } catch {
242:             // Decryption failed (wrong secret / corruption) — don't leak internals.
243:             rawKey = null;
244:           }
245:         }
246:       }
247: 
248:       return sendSuccess(res, {
249:         statusCode: 200,
250:         message: justRevealed
251:           ? "API key revealed — copy it now, it won't be shown again"
252:           : "API key request fetched",
253:         data: {
254:           id: request._id,
255:           bankName: request.bankName,
256:           label: request.label,
257:           scopes: request.scopes,
258:           rateLimit: request.rateLimit,
259:           status: request.status,
260:           reviewNote: request.reviewNote,
261:           apiKey: request.apiKey,
262:           revealedAt: request.bankKeyRevealedAt,
263:           // Raw key only on the one-time reveal; null afterwards.
264:           key: rawKey,
265:         },
266:       });
267:     } catch (error) {
268:       next(error);
269:     }
270:   },
271: );
272: 
273: export default router;

(End of file - total 273 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/features/platform/platformApi.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/features/platform/platformApi.js</path>
<type>file</type>
<content>
1: import { apiClient } from "../../lib/apiClient";
2: 
3: /**
4:  * Platform API — superadmin JWT console (/api/platform/*).
5:  *
6:  * All calls pass `token` (JWT from loginPlatform). The request helper
7:  * attaches Authorization: Bearer. Superadmin never uses an API key.
8:  */
9: 
10: /** POST /platform/login — obtain JWT (open, rate-limited server-side) */
11: export const platformLogin = (credentials) =>
12:   apiClient.post("/platform/login", credentials);
13: 
14: /** GET /platform/me — current superadmin profile */
15: export const fetchPlatformMe = (token) =>
16:   apiClient.get("/platform/me", { token });
17: 
18: /** GET /platform/overview — key counts, pending requests, request totals */
19: export const fetchPlatformOverview = (token) =>
20:   apiClient.get("/platform/overview", { token });
21: 
22: /** GET /platform/usage?days=7 — daily buckets + per-key breakdown */
23: export const fetchPlatformUsage = (token, days = 7) =>
24:   apiClient.get(`/platform/usage?days=${days}`, { token });
25: 
26: /** GET /platform/api-keys — list all keys (metadata only) */
27: export const fetchPlatformApiKeys = (token, params = {}) => {
28:   const qs = new URLSearchParams(params).toString();
29:   return apiClient.get(`/platform/api-keys${qs ? `?${qs}` : ""}`, { token });
30: };
31: 
32: /** POST /platform/api-keys — create key (raw key returned once) */
33: export const createPlatformApiKey = (data, token) =>
34:   apiClient.post("/platform/api-keys", data, { token });
35: 
36: /** DELETE /platform/api-keys/:id — revoke */
37: export const revokePlatformApiKey = (id, token) =>
38:   apiClient.delete(`/platform/api-keys/${id}`, { token });
39: 
40: /** PATCH /platform/api-keys/:id/toggle — suspend/enable */
41: export const togglePlatformApiKey = (id, token) =>
42:   apiClient.patch(`/platform/api-keys/${id}/toggle`, {}, { token });
43: 
44: /** POST /platform/api-keys/:id/rotate — rotate (raw key returned once) */
45: export const rotatePlatformApiKey = (id, token) =>
46:   apiClient.post(`/platform/api-keys/${id}/rotate`, {}, { token });
47: 
48: /** GET /platform/key-requests — list bank admin requests */
49: export const fetchPlatformKeyRequests = (token, params = {}) => {
50:   const qs = new URLSearchParams(params).toString();
51:   return apiClient.get(
52:     `/platform/key-requests${qs ? `?${qs}` : ""}`,
53:     { token },
54:   );
55: };
56: 
57: /**
58:  * PATCH /platform/key-requests/:id — approve or reject.
59:  * approve returns { key: rawKey } ONCE to superadmin.
60:  */
61: export const reviewPlatformKeyRequest = (id, body, token) =>
62:   apiClient.patch(`/platform/key-requests/${id}`, body, { token });

(End of file - total 62 lines)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/frontend/src",
  "pattern": "apiKeyRequest|api-key-request|v1Api"
}
```

**Output:**
```
Found 8 matches
/home/gamp/Desktop/cue/frontend/src/lib/apiClient.js:
  Line 85:  *   import { v1Api } from "./lib/apiClient";

  Line 86:  *   const boards = await v1Api.get("/board", { apiKey: "cue_..." });

  Line 88: export const v1Api = {


/home/gamp/Desktop/cue/frontend/src/features/staff/apiKeyRequestApi.js:
  Line 4:  * Bank admin API key request API — JWT `/api/admin/api-key-requests` (WP6).

  Line 13:   apiClient.post("/admin/api-key-requests", data, { token });

  Line 17:   apiClient.get("/admin/api-key-requests", { token });

  Line 24:   apiClient.get(`/admin/api-key-requests/${id}`, { token });


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx:
  Line 12: } from "../../features/staff/apiKeyRequestApi";

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/v1/index.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/routes/v1/index.js</path>
<type>file</type>
<content>
1: import { Router } from "express";
2: import boardRouter from "./board.routes.js";
3: import branchRouter from "./branch.routes.js";
4: import queueRouter from "./queue.routes.js";
5: import counterRouter from "./counter.routes.js";
6: import ticketRouter from "./ticket.routes.js";
7: import kioskRouter from "./kiosk.routes.js";
8: import appointmentRouter from "./appointment.routes.js";
9: import staffRouter from "./staff.routes.js";
10: import adminRouter from "./admin.routes.js";
11: import analyticsRouter from "./analytics.routes.js";
12: import apiKeyRequestRouter from "./apiKeyRequest.routes.js";
13: import { bankScope } from "../../middlewares/bankScope.middleware.js";
14: import { getme } from "../../controllers/v1Auth.controller.js";
15: 
16: /**
17:  * V1 Routes Index
18:  *
19:  * Mounts all v1 API routes under a common router.
20:  * The bankScope middleware is applied here so that all downstream
21:  * routes have access to req.bankBranchIds and req.bankFilter.
22:  *
23:  * Authentication (authenticateApiKey) and rate limiting (apiKeyRateLimit)
24:  * are applied at the app.js level before these routes are reached.
25:  *
26:  * Route structure:
27:  *   /api/v1/board/*          → boardRouter
28:  *   /api/v1/branches/*       → branchRouter
29:  *   /api/v1/queues/*         → queueRouter
30:  *   /api/v1/counters/*       → counterRouter
31:  *   /api/v1/tickets/*        → ticketRouter
32:  *   /api/v1/kiosk/*          → kioskRouter
33:  *   /api/v1/appointments/*   → appointmentRouter
34:  *   /api/v1/staff/*          → staffRouter
35:  *   /api/v1/admin/*          → adminRouter
36:  *   /api/v1/analytics/*      → analyticsRouter
37:  */
38: 
39: const v1Router = Router();
40: 
41: // Apply bank scope middleware to all v1 routes.
42: // This finds all branches belonging to the API key's bank
43: // and attaches them to req.bankBranchIds for downstream use.
44: v1Router.use(bankScope);
45: 
46: // Mount all v1 resource routes
47: v1Router.use("/board", boardRouter);
48: v1Router.use("/branches", branchRouter);
49: v1Router.use("/queues", queueRouter);
50: v1Router.use("/counters", counterRouter);
51: v1Router.use("/tickets", ticketRouter);
52: v1Router.use("/kiosk", kioskRouter);
53: v1Router.use("/appointments", appointmentRouter);
54: v1Router.use("/staff", staffRouter);
55: v1Router.use("/admin", adminRouter);
56: v1Router.use("/analytics", analyticsRouter);
57: // Bank admin → superadmin API key request flow (bank-scoped via bankName).
58: v1Router.use("/api-key-requests", apiKeyRequestRouter);
59: v1Router.get("/auth/me", getme);
60: 
61: export default v1Router;

(End of file - total 61 lines)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/backend/src",
  "pattern": "authorize\\(\"admin\"\\)|authorize\\('admin'\\)"
}
```

**Output:**
```
Found 19 matches
/home/gamp/Desktop/cue/backend/src/routes/admin.overview.routes.js:
  Line 13: router.get("/overview", protect, authorize("admin"), getAdminOverview);


/home/gamp/Desktop/cue/backend/src/routes/staff.routes.js:
  Line 33:   authorize("admin"),


/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js:
  Line 37: router.use(protect, authorize("admin"));


/home/gamp/Desktop/cue/backend/src/routes/queue.routes.js:
  Line 16: router.post("/", authorize("admin"), createQueueValidator, validate, createQueue);

  Line 18: router.put("/:id", authorize("admin"), updateQueueValidator, validate, updateQueue);

  Line 19: router.delete("/:id", authorize("admin"), deleteQueue);


/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js:
  Line 9:  * Replaces the old /api/v1/api-keys routes (authorize("admin")) which


/home/gamp/Desktop/cue/backend/src/routes/manager.routes.js:
  Line 24: router.use(authorize("admin"));


/home/gamp/Desktop/cue/backend/src/routes/platform/apiKey.routes.js:
  Line 18:  * Replaces the old /api/v1/api-keys routes (authorize("admin")) which


/home/gamp/Desktop/cue/backend/src/controllers/manager.controller.js:
  Line 33:  * POST /api/managers — admin only (route already authorize("admin")).


/home/gamp/Desktop/cue/backend/src/routes/v1/admin.routes.js:
  Line 10:  * so authorize("admin") would 403 every API-key request. The controller


/home/gamp/Desktop/cue/backend/src/routes/v1/apiKeyRequest.routes.js:
  Line 39: router.use(authorize("admin"));


/home/gamp/Desktop/cue/backend/src/routes/branch.route.js:
  Line 28:   authorize("admin"),

  Line 40: branchRouter.get("/", authorize("admin"), getAllBranches);

  Line 41: branchRouter.get("/:id", authorize("admin"), getSingleBranch);

  Line 42: branchRouter.delete("/:id", authorize("admin"), deleteBranch);


/home/gamp/Desktop/cue/backend/src/routes/auth.routes.js:
  Line 101:   authorize("admin"),


/home/gamp/Desktop/cue/backend/src/routes/webhook.routes.js:
  Line 15: webhookRouter.delete("/:id", authorize("admin"), deleteWebhook);

  Line 16: webhookRouter.patch("/:id/toggle", authorize("admin"), toggleWebhook);

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/platform/index.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/routes/platform/index.js</path>
<type>file</type>
<content>
1: import { Router } from "express";
2: import { protect, authorize } from "../../middlewares/auth.middleware.js";
3: import authRoutes from "./auth.routes.js";
4: import apiKeyRoutes from "./apiKey.routes.js";
5: import usageRoutes from "./usage.routes.js";
6: import keyRequestRoutes from "./keyRequest.routes.js";
7: import { getPlatformOverview } from "../../controllers/platform/platformUsage.controller.js";
8: 
9: /**
10:  * Platform router — superadmin-only, JWT-protected.
11:  *
12:  * Mounted at /api/platform in app.js (BEFORE the v1 API-key pipeline).
13:  * These routes are intentionally NOT under /api/v1 and do NOT go through
14:  * bankScope — the superadmin is a platform operator, not bank-scoped.
15:  *
16:  * Auth model:
17:  *   POST /api/platform/login  → open (rate-limited) → issues JWT
18:  *   everything else           → protect + authorize("superadmin")
19:  *
20:  * Scope (v1): API keys + usage monitoring only.
21:  * No bank/branch/staff management — that stays with bank-scoped admins.
22:  */
23: const platformRouter = Router();
24: 
25: // Open login route (self-protects with authLimiter + role check).
26: // GET /me under authRoutes also applies protect + authorize("superadmin").
27: platformRouter.use("/", authRoutes);
28: 
29: // Everything mounted below this line requires a valid superadmin JWT.
30: platformRouter.use(protect);
31: platformRouter.use(authorize("superadmin"));
32: 
33: platformRouter.use("/api-keys", apiKeyRoutes);
34: platformRouter.use("/usage", usageRoutes);
35: platformRouter.use("/key-requests", keyRequestRoutes);
36: 
37: // GET /api/platform/overview — high-level platform stats.
38: platformRouter.get("/overview", getPlatformOverview);
39: 
40: export default platformRouter;

(End of file - total 40 lines)
</content>
```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 394.3s)

_Thinking:_

Let me analyze WP8 gaps carefully:

WP8 = "Platform console adjustments (Superadmin model everywhere)"

Key issues identified:

1. **Legacy `routes/v1/apiKeyRequest.routes.js`** - uses `authorize("admin")` but on v1 path, `resolveStaffUser` always sets `req.role = "staff"`. So this route is **broken** — every API-key request would 403. WP5 removed v1 role authorize for this reason elsewhere. Also `requestedBy: req.user?._id` — on v1 path, `req.user` is the resolved Staff user (resolveStaffUser), NOT an Admin. So even if authorize passed, requestedBy would be wrong model (Staff vs Admin refPath).

   Dashboard uses JWT `/api/admin/api-key-requests` (WP6). So the v1 path is either:
   - Dead code that should be removed
   - Or needs to be fixed to work with API keys
   
   The original design said bank admins request keys. But now dashboard is JWT. External systems use API keys. Who would use v1 api-key-requests? Possibly an external bank admin system with an API key? But they need `admin` scope for authorize to pass... wait, authorize checks role not scope. On v1 path role is always "staff".

   So **v1/apiKeyRequest.routes.js is completely broken** (403 always). WP8 should either remove it or convert it. Given dashboard uses JWT path, removing it is cleaner. But BUILD_PLAN might mention it... Looking at line 499 area about Phase 12.

2. **`platformAuth.controller.js` login response** returns `data.staff` instead of `data.user` — AuthContext handles both (`payload.data?.user || payload.data?.staff`), so it works but is a stale shape. Could rename to `user` for consistency with bank logins.

3. **`platform/apiKey.routes.js` comment** still points to `routes/v1/apiKeyRequest.routes.js` — should point to JWT path or remove if deleting v1 route.

4. **PlatformDashboard logout** navigates to `/platform/login` — good. AuthInterceptor on 401 navigates to `/` — PlatformLogin checks `location.state?.sessionExpired` but AuthInterceptor doesn't pass that state. Minor UX gap: should navigate to `/platform/login` with sessionExpired for superadmin, or just `/` is fine.

5. **PlatformDashboard** uses `auth?.name` from login — good. On refresh, getAuthMe via `/auth/me` works for superadmin (identity function). Need to check `identity()` helper includes bank/branch for all kinds.

6. **Platform login response shape**: `data.staff` but also AuthContext toAuth doesn't set role from kind properly... it does: `const role = data.role || data.kind || "staff"` and identity has `role: "superadmin"`.

7. **Tests**: Phase 13 has WP8 as "Platform console adjustments" but Phase 12 WP8 was "Tests ✅". Need platform route tests for Superadmin model? Maybe add tests for:
   - platform auth login (would need DB mock - hard without mongo)
   - reviewedBy set to Superadmin
   - authorize superadmin already tested

8. **No old `/api/v1/api-keys` routes** — good, replaced by platform.

9. **`admin.routes.js` under v1** — is it still functional? WP5 said admin overview via API key path in controller. Need to check if v1 admin routes still have authorize issues.

10. **mustChangePassword for superadmin** — platform login doesn't force password change. Superadmin seed has fixed password. Minor - maybe out of scope.

11. **LoginPage** for superadmin: `if (auth?.token && auth.role && auth.role !== "superadmin")` redirects away from /login/staff if not already superadmin - wait, if role IS superadmin it does NOT redirect away from login page? Let me read LoginPage more carefully.

12. **AuthInterceptor** navigates to `/` on 401 — for platform user mid-session, goes to home not platform login. PlatformLogin has sessionExpired state but interceptor doesn't set it.

13. **Duplication**: `adminApiKeyRequest.routes.js` and `v1/apiKeyRequest.routes.js` are near-duplicates.

Main WP8 work items I should execute:

1. **Remove or fix legacy v1 key-request routes** — broken (authorize("admin") on staff role). Remove from v1/index.js and delete file OR rewrite. Comment in platform says bank admins submit via v1 — update comments to JWT path.

2. **Normalize platform login response** to `data.user` instead of `data.staff` (and keep AuthContext compatible).

3. **AuthInterceptor session-expired** for platform: navigate to platform/login with sessionExpired when role is superadmin? But interceptor doesn't know role... it only has setAuth. Could pass current role. Minor polish.

4. **Check LoginPage** superadmin handling.

5. **Platform tests**: add unit tests that don't need Mongo if possible — maybe reviewKeyRequest logic with mocks, or ensure authorize/protect path. Or test identity() shape.

6. **Update stale comments** in platform routes pointing to v1.

7. **BUILD_PLAN WP8 checklist** — write and mark done.

8. **Check v1 admin.routes** for authorize("admin") issues under API-key path.

Let me check more things: identity() function, v1 admin routes, LoginPage, AdminOverview key request flow, and whether there are references to old staff role superadmin.

Checking remaining WP8 gaps: `identity()` shape, v1 admin routes, LoginPage superadmin handling, and stale Staff references.

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js",
  "pattern": "function identity|const identity|export.*identity"
}
```

**Output:**
```
Found 1 matches
/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js:
  Line 31: const identity = (doc, kind, extras = {}) => {

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/v1/admin.routes.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/routes/v1/admin.routes.js</path>
<type>file</type>
<content>
1: import { Router } from "express";
2: import { getAdminOverview } from "../../controllers/admin.controller.js";
3: import { requireScope } from "../../middlewares/apiKey.middleware.js";
4: 
5: /**
6:  * V1 Admin Routes — API-key only (bank-scoped overview).
7:  *
8:  * Scope wiring (WP5): analytics:read gates the cross-branch summary.
9:  * Role authorize() removed — resolveStaffUser always sets role "staff",
10:  * so authorize("admin") would 403 every API-key request. The controller
11:  * accepts either role "admin" (JWT path) or an authenticated API key
12:  * (integration path); bank isolation still comes from req.bankName.
13:  */
14: 
15: const adminRouter = Router();
16: 
17: adminRouter.get("/", requireScope("analytics:read"), getAdminOverview);
18: 
19: export default adminRouter;

(End of file - total 19 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/Login/LoginPage.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/Login/LoginPage.jsx</path>
<type>file</type>
<content>
1: import { useState, useEffect } from "react";
2: import { motion } from "framer-motion";
3: import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
4: import { useAuth } from "../../features/auth/AuthContext";
5: import { useBrand } from "../../features/brand/BrandContext";
6: import { ApiError } from "../../lib/apiClient";
7: import MotionBackground from "../../components/MotionBackground/MotionBackground";
8: import logoUrl from "../../assets/logo.svg";
9: import styles from "./LoginPage.module.css";
10: 
11: /**
12:  * LoginPage — email/password JWT login for staff, manager, and admin.
13:  *
14:  * Routes:
15:  *   /login/staff
16:  *   /login/manager
17:  *   /login/admin
18:  *
19:  * Superadmin uses /platform/login (separate console).
20:  * After success, redirects to /staff (role-specific tabs render there).
21:  */
22: const VALID_KINDS = ["staff", "manager", "admin"];
23: const ROLE_META = {
24:   staff: {
25:     title: "Staff console.",
26:     eyebrow: "№ 010 — staff access",
27:     subhead: "Sign in to call tickets, manage your counter, and view history.",
28:     cta: "Sign in to console",
29:   },
30:   manager: {
31:     title: "Branch oversight.",
32:     eyebrow: "№ 011 — manager access",
33:     subhead:
34:       "Sign in to oversee your branch, manage staff and counters, and close the day.",
35:     cta: "Sign in as manager",
36:   },
37:   admin: {
38:     title: "Bank control.",
39:     eyebrow: "№ 012 — admin access",
40:     subhead:
41:       "Sign in to manage branches across your bank, review key requests, and provision teams.",
42:     cta: "Sign in as admin",
43:   },
44: };
45: 
46: const LoginPage = () => {
47:   const { kind } = useParams();
48:   const validKind = VALID_KINDS.includes(kind) ? kind : "staff";
49:   const meta = ROLE_META[validKind];
50:   const { brand } = useBrand();
51:   const { login, auth } = useAuth();
52:   const navigate = useNavigate();
53:   const location = useLocation();
54: 
55:   const [form, setForm] = useState({ email: "", password: "" });
56:   const [error, setError] = useState(null);
57:   const [submitting, setSubmitting] = useState(false);
58: 
59:   // Already signed in with a bank role → go to dashboard.
60:   useEffect(() => {
61:     if (auth?.token && auth.role && auth.role !== "superadmin") {
62:       navigate(location.state?.from || "/staff", { replace: true });
63:     }
64:   }, [auth?.token, auth?.role, navigate, location.state?.from]);
65: 
66:   const handleChange = (field) => (e) =>
67:     setForm((f) => ({ ...f, [field]: e.target.value }));
68: 
69:   const handleSubmit = async (e) => {
70:     e.preventDefault();
71:     setError(null);
72:     setSubmitting(true);
73:     try {
74:       const { path } = await login(validKind, form);
75:       navigate(location.state?.from || path, { replace: true });
76:     } catch (err) {
77:       setError(
78:         err instanceof ApiError
79:           ? err.errors?.join(", ") || err.message
80:           : "Something went wrong, try again.",
81:       );
82:     } finally {
83:       setSubmitting(false);
84:     }
85:   };
86: 
87:   return (
88:     <section className={styles.page}>
89:       <MotionBackground />
90:       <div className={styles.loginContainer}>
91:         <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
92:           <div className={styles.logoHeader}>
93:             <img src={logoUrl} alt="" />
94:             <span>{brand.name}</span>
95:           </div>
96:           <p className={styles.eyebrow}>{meta.eyebrow}</p>
97:           <h1 className={styles.heading}>{meta.title}</h1>
98:           <p className={styles.subhead}>{meta.subhead}</p>
99:         </motion.div>
100: 
101:         <motion.div
102:           className={styles.loginCard}
103:           initial={{ opacity: 0, y: 24 }}
104:           animate={{ opacity: 1, y: 0 }}
105:           transition={{ delay: 0.15 }}
106:         >
107:           {location.state?.sessionExpired && (
108:             <p className={styles.errorMsg}>
109:               Your session expired. Sign in again to continue.
110:             </p>
111:           )}
112: 
113:           <div className={styles.badge}>
114:             <span className={styles.badgeDot} />
115:             {validKind === "admin"
116:               ? "Bank admin"
117:               : validKind === "manager"
118:                 ? "Branch manager"
119:                 : "Staff"}
120:           </div>
121: 
122:           <form onSubmit={handleSubmit} className={styles.form}>
123:             <label className={styles.field}>
124:               <span>Email</span>
125:               <input
126:                 required
127:                 type="email"
128:                 autoComplete="username"
129:                 value={form.email}
130:                 onChange={handleChange("email")}
131:                 placeholder="you@bank.example"
132:               />
133:             </label>
134:             <label className={styles.field}>
135:               <span>Password</span>
136:               <input
137:                 required
138:                 type="password"
139:                 autoComplete="current-password"
140:                 value={form.password}
141:                 onChange={handleChange("password")}
142:                 placeholder="••••••••"
143:               />
144:             </label>
145: 
146:             {error && <p className={styles.errorMsg}>{error}</p>}
147: 
148:             <button
149:               type="submit"
150:               className={styles.submitBtn}
151:               disabled={submitting}
152:             >
153:               {submitting ? "Checking…" : meta.cta}
154:             </button>
155:           </form>
156: 
157:           <p className={styles.switchLine}>
158:             Other roles:{" "}
159:             {Object.keys(ROLE_META)
160:               .filter((k) => k !== validKind)
161:               .map((k, i) => (
162:                 <span key={k}>
163:                   {i > 0 && " · "}
164:                   <Link to={`/login/${k}`}>{k}</Link>
165:                 </span>
166:               ))}{" "}
167:             · <Link to="/platform/login">Platform</Link>
168:           </p>
169:         </motion.div>
170:       </div>
171:     </section>
172:   );
173: };
174: 
175: export default LoginPage;

(End of file - total 175 lines)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/backend/src",
  "pattern": "role.*superadmin|Superadmin\\.find|staffs.*role"
}
```

**Output:**
```
Found 8 matches
/home/gamp/Desktop/cue/backend/src/controllers/platform/platformAuth.controller.js:
  Line 29:     const superadmin = await Superadmin.findOne({

  Line 45:       { id: superadmin._id, kind: "superadmin", role: "superadmin" },

  Line 58:           role: "superadmin",

  Line 81:         role: req.role || "superadmin",


/home/gamp/Desktop/cue/backend/src/scripts/seedSuperadmin.js:
  Line 37:   const existingSuperadmin = await Superadmin.findOne({});

  Line 45:   const existingEmail = await Superadmin.findOne({ email });


/home/gamp/Desktop/cue/backend/src/scripts/migrateSplitStaff.js:
  Line 16:  *   role "superadmin" → superadmins   (Superadmin model)

  Line 19:  *   role "staff"/none → stays in staffs (Staff model, role field stripped)

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/middlewares/auth.middleware.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/middlewares/auth.middleware.js</path>
<type>file</type>
<content>
1: import jwt from "jsonwebtoken";
2: import Staff from "../models/staff.model.js";
3: import Admin from "../models/admin.model.js";
4: import Manager from "../models/manager.model.js";
5: import Superadmin from "../models/superadmin.model.js";
6: import { sendError } from "../utils/response.js";
7: 
8: /**
9:  * Identity kinds — which collection a JWT's `id` belongs to.
10:  *
11:  * After the four-model split (Phase 13 / WP1), every login issues a JWT
12:  * with a `kind` claim ("staff" | "admin" | "manager" | "superadmin").
13:  * `protect` uses that claim to pick the right Mongoose model — it never
14:  * has to guess by probing four collections.
15:  */
16: export const KIND_MODELS = {
17:   staff: Staff,
18:   admin: Admin,
19:   manager: Manager,
20:   superadmin: Superadmin,
21: };
22: 
23: /**
24:  * Resolve which model a decoded JWT payload refers to.
25:  * Prefers the signed `kind` claim; falls back to `role` for tokens
26:  * issued before the split (same string values).
27:  * Returns null when the kind is unknown/missing.
28:  */
29: export const modelForToken = (decoded) => {
30:   if (!decoded) return null;
31:   const kind = decoded.kind || decoded.role;
32:   return (kind && KIND_MODELS[kind]) || null;
33: };
34: 
35: export const protect = async (req, res, next) => {
36:   try {
37:     const authHeader = req.headers.authorization;
38: 
39:     if (!authHeader || !authHeader.startsWith("Bearer ")) {
40:       return sendError(res, {
41:         statusCode: 401,
42:         message: "Not authorized, no token provided",
43:       });
44:     }
45: 
46:     const token = authHeader.split(" ")[1];
47:     const decoded = jwt.verify(token, process.env.JWT_SECRET);
48: 
49:     const Model = modelForToken(decoded);
50:     if (!Model) {
51:       return sendError(res, { statusCode: 401, message: "Invalid or expired token" });
52:     }
53: 
54:     const account = await Model.findById(decoded.id).select("-password");
55: 
56:     // Inactive accounts must not maintain an authenticated session —
57:     // this check was missing before the split (only login checked isActive).
58:     if (!account || account.isActive === false) {
59:       return sendError(res, {
60:         statusCode: 401,
61:         message: "Account associated with token no longer exists",
62:       });
63:     }
64: 
65:     req.user = account;
66:     // role comes from the signed token (kind === role for our JWTs).
67:     req.role = decoded.role || decoded.kind;
68:     req.kind = decoded.kind || decoded.role;
69:     next();
70:   } catch (error) {
71:     return sendError(res, { statusCode: 401, message: "Invalid or expired token" });
72:   }
73: };
74: 
75: export const authorize = (...roles) => {
76:   return (req, res, next) => {
77:     if (!req.user) {
78:       return sendError(res, { statusCode: 401, message: "Not authenticated" });
79:     }
80:     if (!roles.includes(req.role)) {
81:       return sendError(res, {
82:         statusCode: 403,
83:         message: "Access denied: insufficient permissions",
84:       });
85:     }
86:     next();
87:   };
88: };
89: 
90: /**
91:  * Staff-only serving guard (Phase 13 / WP5).
92:  *
93:  * Locked decision: only Staff may serve tickets. Managers oversee the
94:  * branch (create staff, counters, close/open day) but do NOT serve;
95:  * admins are bank-scoped operators and also do not serve.
96:  * `Ticket.servedBy` stays `ref: "Staff"` for the same reason.
97:  *
98:  * Use on every serve action (call-next, call, complete, skip) so a
99:  * manager/admin JWT gets a clear 403 even if a route mis-wires authorize().
100:  */
101: export const requireStaffServing = (req, res, next) => {
102:   const kind = req.kind || req.role;
103:   if (kind === "staff") {
104:     return next();
105:   }
106:   if (kind === "manager") {
107:     return sendError(res, {
108:       statusCode: 403,
109:       message: "Managers cannot serve tickets",
110:     });
111:   }
112:   return sendError(res, {
113:     statusCode: 403,
114:     message: "Only staff can serve tickets",
115:   });
116: };

(End of file - total 116 lines)
</content>
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "backend/tests/**/*platform*"
}
```

**Output:**
```
No files found
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/App.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/App.jsx</path>
<type>file</type>
<content>
1: import { lazy, Suspense } from "react";
2: import { Routes, Route, Navigate } from "react-router-dom";
3: import { AuthProvider } from "./features/auth/AuthContext";
4: import { ThemeProvider } from "./features/theme/ThemeContext";
5: import { BrandProvider } from "./features/brand/BrandContext";
6: import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
7: import ProtectedRoute from "./features/auth/ProtectedRoute";
8: import Navbar from "./components/Navbar/Navbar";
9: import Footer from "./components/Footer/Footer";
10: 
11: const Landing = lazy(() => import("./pages/Landing/Landing"));
12: const Contact = lazy(() => import("./pages/Contact/Contact"));
13: const StaffHome = lazy(() => import("./pages/StaffHome/StaffHome"));
14: const LoginPage = lazy(() => import("./pages/Login/LoginPage"));
15: const PlatformLogin = lazy(() => import("./pages/Platform/PlatformLogin"));
16: const PlatformDashboard = lazy(() => import("./pages/Platform/PlatformDashboard"));
17: const Board = lazy(() => import("./pages/Board/Board"));
18: const Boards = lazy(() => import("./pages/Boards/Boards"));
19: const Kiosk = lazy(() => import("./pages/Kiosk/Kiosk"));
20: const Appointment = lazy(() => import("./pages/Appointment/Appointment"));
21: const NearestBranch = lazy(() => import("./pages/NearestBranch/NearestBranch"));
22: const Branch = lazy(() => import("./pages/Branch/Branch"));
23: const TicketPage = lazy(() => import("./pages/TicketPage/TicketPage"));
24: const NotFound = lazy(() => import("./pages/NotFound/NotFound"));
25: 
26: const PageSpinner = () => (
27:   <div
28:     style={{
29:       minHeight: "60vh",
30:       display: "flex",
31:       alignItems: "center",
32:       justifyContent: "center",
33:       fontFamily: "var(--font-body, system-ui, sans-serif)",
34:       color: "var(--text-muted, #666)",
35:     }}
36:   >
37:     Loading…
38:   </div>
39: );
40: 
41: function App() {
42:   return (
43:     <BrandProvider>
44:     <ThemeProvider>
45:     <AuthProvider>
46:       <ErrorBoundary>
47:       <Suspense fallback={<PageSpinner />}>
48:       <Routes>
49:         <Route
50:           path="/"
51:           element={
52:             <>
53:               <Navbar />
54:               <Landing />
55:               <Footer />
56:             </>
57:           }
58:         />
59:         <Route
60:           path="/contact"
61:           element={
62:             <>
63:               <Navbar />
64:               <Contact />
65:               <Footer />
66:             </>
67:           }
68:         />
69:         <Route
70:           path="/ticket"
71:           element={
72:             <>
73:               <Navbar />
74:               <TicketPage />
75:               <Footer />
76:             </>
77:           }
78:         />
79:         <Route
80:           path="/ticket/:ticketId"
81:           element={
82:             <>
83:               <Navbar />
84:               <TicketPage />
85:               <Footer />
86:             </>
87:           }
88:         />
89:         <Route
90:           path="/staff"
91:           element={
92:             <ProtectedRoute allowedRoles={["staff", "manager", "admin"]}>
93:               <>
94:                 <Navbar />
95:                 <StaffHome />
96:                 <Footer />
97:               </>
98:             </ProtectedRoute>
99:           }
100:         />
101:         {/* Bank JWT logins — Phase 13 WP7 (one page per kind) */}
102:         <Route
103:           path="/login"
104:           element={<Navigate to="/login/staff" replace />}
105:         />
106:         <Route path="/login/:kind" element={<LoginPage />} />
107:         {/* Superadmin platform console — JWT login only, not bank-scoped */}
108:         <Route
109:           path="/platform/login"
110:           element={
111:             <>
112:               <Navbar />
113:               <PlatformLogin />
114:             </>
115:           }
116:         />
117:         <Route
118:           path="/platform"
119:           element={
120:             <ProtectedRoute allowedRoles={["superadmin"]}>
121:               <PlatformDashboard />
122:             </ProtectedRoute>
123:           }
124:         />
125:         <Route path="/boards" element={<Boards />} />
126:         <Route path="/board/:branchId" element={<Board />} />
127:         <Route path="/kiosk/:branchId" element={<Kiosk />} />
128:         <Route path="/appointment/:branchId" element={<Appointment />} />
129:         <Route path="/find-nearby" element={<NearestBranch />} />
130:         <Route
131:           path="/branch/:branchId"
132:           element={
133:             <>
134:               <Navbar />
135:               <Branch />
136:               <Footer />
137:             </>
138:           }
139:         />
140:         <Route path="*" element={<NotFound />} />
141:       </Routes>
142:       </Suspense>
143:       </ErrorBoundary>
144:     </AuthProvider>
145:     </ThemeProvider>
146:     </BrandProvider>
147:   );
148: }
149: 
150: export default App;

(End of file - total 150 lines)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/frontend/src",
  "pattern": "platform/login|/platform"
}
```

**Output:**
```
Found 39 matches
/home/gamp/Desktop/cue/frontend/src/App.jsx:
  Line 109:           path="/platform/login"

  Line 118:           path="/platform"


/home/gamp/Desktop/cue/frontend/src/features/auth/AuthContext.jsx:
  Line 26:  *   superadmin → POST /platform/login    → /platform

  Line 46:   superadmin: "/platform",


/home/gamp/Desktop/cue/frontend/src/features/auth/authApi.js:
  Line 7:  * - superadmin          → POST /platform/login    (platform console)

  Line 22:   apiClient.post("/platform/login", credentials);


/home/gamp/Desktop/cue/frontend/src/features/platform/platformApi.js:
  Line 4:  * Platform API — superadmin JWT console (/api/platform/*).

  Line 10: /** POST /platform/login — obtain JWT (open, rate-limited server-side) */

  Line 12:   apiClient.post("/platform/login", credentials);

  Line 14: /** GET /platform/me — current superadmin profile */

  Line 16:   apiClient.get("/platform/me", { token });

  Line 18: /** GET /platform/overview — key counts, pending requests, request totals */

  Line 20:   apiClient.get("/platform/overview", { token });

  Line 22: /** GET /platform/usage?days=7 — daily buckets + per-key breakdown */

  Line 24:   apiClient.get(`/platform/usage?days=${days}`, { token });

  Line 26: /** GET /platform/api-keys — list all keys (metadata only) */

  Line 29:   return apiClient.get(`/platform/api-keys${qs ? `?${qs}` : ""}`, { token });

  Line 32: /** POST /platform/api-keys — create key (raw key returned once) */

  Line 34:   apiClient.post("/platform/api-keys", data, { token });

  Line 36: /** DELETE /platform/api-keys/:id — revoke */

  Line 38:   apiClient.delete(`/platform/api-keys/${id}`, { token });

  Line 40: /** PATCH /platform/api-keys/:id/toggle — suspend/enable */

  Line 42:   apiClient.patch(`/platform/api-keys/${id}/toggle`, {}, { token });

  Line 44: /** POST /platform/api-keys/:id/rotate — rotate (raw key returned once) */

  Line 46:   apiClient.post(`/platform/api-keys/${id}/rotate`, {}, { token });

  Line 48: /** GET /platform/key-requests — list bank admin requests */

  Line 52:     `/platform/key-requests${qs ? `?${qs}` : ""}`,

  Line 58:  * PATCH /platform/key-requests/:id — approve or reject.

  Line 62:   apiClient.patch(`/platform/key-requests/${id}`, body, { token });


/home/gamp/Desktop/cue/frontend/src/pages/Login/LoginPage.jsx:
  Line 19:  * Superadmin uses /platform/login (separate console).

  Line 167:             · <Link to="/platform/login">Platform</Link>


/home/gamp/Desktop/cue/frontend/src/components/Navbar/Navbar.jsx:
  Line 65:                 <Link to="/platform" className={styles.accountLink}>

  Line 82:               <Link to="/platform/login" className={styles.loginLink}>


/home/gamp/Desktop/cue/frontend/src/pages/Platform/PlatformDashboard.jsx:
  Line 17: } from "../../features/platform/platformApi";

  Line 78:     navigate("/platform/login", { replace: true });


/home/gamp/Desktop/cue/frontend/src/pages/Platform/PlatformLogin.jsx:
  Line 12:  * PlatformLogin — superadmin JWT login for the /platform console.

  Line 14:  * Superadmin uses the dedicated POST /platform/login endpoint.

  Line 30:       navigate("/platform", { replace: true });

  Line 43:       navigate(location.state?.from || "/platform", { replace: true });

```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 44.7s)

_Thinking:_

Let me continue analyzing WP8 gaps and then implement.

WP8 — Platform console adjustments (Superadmin model everywhere):

Gaps identified:

1. **Legacy `routes/v1/apiKeyRequest.routes.js`** uses `authorize("admin")` but v1 path sets `req.role = "staff"` via resolveStaffUser — this would 403 every request. Dashboard now uses JWT `/api/admin/api-key-requests`. The v1 path is dead/broken. WP8 should remove it (or gate it). Comments in platform routes still point to v1 apiKeyRequest.

2. **platformAuth login response** returns `data.staff` instead of `data.user` — AuthContext handles both (`payload.data?.user || payload.data?.staff`), so it works, but should normalize to `user` for consistency with bank logins.

3. **PlatformDashboard logout** navigates to `/platform/login` — good. AuthInterceptor navigates to `/` on 401 — for platform maybe should go to platform/login? Currently goes to `/` which is OK-ish. PlatformLogin checks `location.state?.sessionExpired` but AuthInterceptor doesn't pass that state. Minor.

4. **AuthContext identity refresh** uses `getAuthMe` → `/auth/me` which works for superadmin too (any kind). Good.

5. **No platform tests** for Superadmin model everywhere — Phase 12 had tests in Phase 13 WP8? Looking at BUILD_PLAN Phase 12 WP8 tests were for superadmin authorize. Phase 13 WP8 needs tests.

6. **`platform/apiKey.routes.js` comment** references v1 path.

7. **LoginPage** for superadmin: if superadmin visits `/login/staff` they stay (role === superadmin so no redirect to /staff) — actually if auth.role is superadmin, the condition `auth.role !== "superadmin"` fails so they don't auto-redirect. Superadmin on bank login page is a bit odd but OK. PlatformLogin redirects superadmin to /platform. Good.

8. **ProtectedRoute** for /platform only checks token + role superadmin. Good.

9. **ApiKeyRequest.reviewedBy** → Superadmin model refPath - already set in platformKeyRequest.controller with `req.user._id`. Need to verify model refPath.

10. **platform login returns `staff` key** — should be `user`.

11. **v1 apiKeyRequest mount** — remove dead route.

12. **admin.routes under v1** — already fixed with requireScope.

13. **Tests for WP8** — need platform-related tests: reviewedBy Superadmin, platform login shape?, removal of v1 key-request routes, authorize integration.

14. **BUILD_PLAN WP8 checklist** — need to write it.

15. **Auth interceptor for platform** — when superadmin 401s, navigate to `/` not `/platform/login`. PlatformLogin has sessionExpired check but interceptor doesn't pass it.

16. **identity() in auth.controller** — check superadmin identity shape.

17. **Does getAuthMe work for superadmin?** Yes - protect loads Superadmin model.

18. **Platform dashboard uses auth?.name** — after login, name is set. On refresh, getAuthMe refreshes. Good.

19. **Stale comments** in platform apiKey routes pointing to v1.

20. **DELETE old `/api/v1/api-keys` routes** — grep showed they were already replaced (only platform has them). Phase 1 checkboxes exist but routes are gone.

21. **v1 index still mounts api-key-requests** — broken authorize. Remove.

22. **Does anything frontend still call v1 api-key-requests?** apiKeyRequestApi uses JWT path. Good.

23. **AdminOverview key request form** — uses JWT. Good.

24. **Duplicate BANK_REQUESTABLE_SCOPES** in adminApiKeyRequest and v1 apiKeyRequest — after removing v1, only one remains.

25. **Platform login response `staff` field** — normalize to `user`.

26. **mustChangePassword for superadmin** — seed doesn't set it? Check seedSuperadmin - not critical for WP8.

27. **Platform tests** — add:
    - platform key-request review sets reviewedBy (mock)
    - platform routes reject non-superadmin (maybe already covered by superadmin.authorize.test)
    - v1 api-key-requests removed    - loginSuperadmin response shape unit test?

Let me also check identity() and apiKeyRequest model, and platform usage controller. Also check if there's frontend test for platform.

I'll implement:

1. Remove `routes/v1/apiKeyRequest.routes.js` and unmount from v1/index.js; update comments in platform routes to point to JWT admin path.
2. Normalize platform login response to `data.user` (keep AuthContext accepting both for safety, or just change backend).
3. Fix AuthInterceptor to navigate superadmin to platform login? Actually AuthInterceptor doesn't know role before clearing. Could pass path based on role - but setAuth(null) happens. Could check localStorage before. Simpler: keep going to `/` or enhance to go to platform/login if was superadmin. Let me check if this is important...

Actually for WP8 "Superadmin model everywhere":
- Platform login returns Superadmin identity as `user` not `staff`
- Remove broken v1 key-request (authorize admin never works)
- Update stale comments
- Tests for Superadmin model / platform surface
- BUILD_PLAN checklist

Also check platformAuth - login doesn't handle mustChangePassword. Superadmin seed password is permanent. OK.

Check if getPlatformMe is redundant with getAuthMe - both work.

Check platform overview endpoint and usage.

Also check: does AuthContext refresh superadmin via /auth/me correctly? identity() for superadmin - read that function.

Also frontend AdminOverview - does it show canRevealKey? And key request status uses `res.data` shape from paginatedResponse.

Let me read identity() and apiKeyRequest model, then implement.

Identified WP8 gaps: broken legacy v1 key-request route, platform login response shape, stale comments, missing tests. Checking a few more files, then implementing.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js",
  "limit": 80,
  "offset": 1
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js</path>
<type>file</type>
<content>
1: import jwt from "jsonwebtoken";
2: import Staff from "../models/staff.model.js";
3: import Admin from "../models/admin.model.js";
4: import Manager from "../models/manager.model.js";
5: import Superadmin from "../models/superadmin.model.js";
6: import Invite from "../models/invite.model.js";
7: import Branch from "../models/branch.model.js";
8: import { sendSuccess, sendError } from "../utils/response.js";
9: import { validationResult } from "express-validator";
10: 
11: /**
12:  * Auth controller — Phase 13 WP3.
13:  *
14:  * One login endpoint per collection (kind), public admin self-registration,
15:  * invite issue/redeem for managers and staff, /me, and change-password.
16:  *
17:  * JWT payload (all kinds): { id, kind, role } where kind === role.
18:  * Superadmin login stays at POST /api/platform/login.
19:  */
20: 
21: const JWT_EXPIRES = () => process.env.JWT_EXPIRES_IN || "1d";
22: 
23: const issueToken = (doc, kind) =>
24:   jwt.sign(
25:     { id: doc._id, kind, role: kind },
26:     process.env.JWT_SECRET,
27:     { expiresIn: JWT_EXPIRES() },
28:   );
29: 
30: /** Safe identity shape returned to the client (no password). */
31: const identity = (doc, kind, extras = {}) => {
32:   const base = {
33:     id: doc._id,
34:     name: doc.name,
35:     email: doc.email,
36:     role: kind,
37:     kind,
38:     mustChangePassword: !!doc.mustChangePassword,
39:   };
40:   if (kind === "staff") {
41:     base.branch = doc.branch ?? null;
42:     base.counter = doc.counter ?? null;
43:   }
44:   if (kind === "manager") {
45:     base.branch = doc.branch ?? null;
46:     base.bank = doc.bank ?? null;
47:   }
48:   if (kind === "admin") {
49:     base.bank = doc.bank ?? null;
50:   }
51:   return { ...base, ...extras };
52: };
53: 
54: const runValidation = (req, res) => {
55:   const errors = validationResult(req);
56:   if (!errors.isEmpty()) {
57:     sendError(res, {
58:       statusCode: 400,
59:       message: "Validation failed",
60:       errors: errors.array().map((e) => e.msg),
61:     });
62:     return false;
63:   }
64:   return true;
65: };
66: 
67: /**
68:  * Shared login against one collection.
69:  * Generic 401 for missing account / bad password / inactive (no enumeration).
70:  */
71: const loginAgainst = async (Model, kind, req, res, next) => {
72:   try {
73:     if (!runValidation(req, res)) return;
74: 
75:     const { email, password } = req.body;
76:     const doc = await Model.findOne({ email: email.toLowerCase() }).select(
77:       "+password",
78:     );
79: 
80:     if (!doc || doc.isActive === false) {

(Showing lines 1-80 of 439. Use offset=81 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/models/apiKeyRequest.model.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/models/apiKeyRequest.model.js</path>
<type>file</type>
<content>
1: import mongoose from "mongoose";
2: 
3: /**
4:  * ApiKeyRequest — bank admin's request for an API key for their bank.
5:  *
6:  * Flow:
7:  * 1. Bank admin (admin role, via API-key auth) POSTs a request with
8:  *    label, scopes, rateLimit. bankName is forced from their API key.
9:  * 2. Superadmin reviews it on /platform and approves or rejects.
10:  * 3. On approve: an ApiKey is created, the raw key is returned once to
11:  *    the superadmin, AND the raw key is AES-256-GCM-encrypted onto this
12:  *    document so the bank admin can reveal it once from request status.
13:  * 4. Bank admin's first GET of the approved request returns the raw key,
14:  *    then ciphertext is wiped permanently (bankKeyRevealedAt set).
15:  *
16:  * Rotation reveals are NOT staged here (approval only).
17:  */
18: const apiKeyRequestSchema = new mongoose.Schema(
19:   {
20:     bankName: {
21:       type: String,
22:       required: true,
23:       trim: true,
24:       index: true,
25:     },
26:     // The bank admin (Admin collection) who submitted the request.
27:     requestedBy: {
28:       type: mongoose.Schema.Types.ObjectId,
29:       ref: "Admin",
30:       required: true,
31:     },
32:     label: {
33:       type: String,
34:       trim: true,
35:       default: "",
36:       maxlength: 200,
37:     },
38:     scopes: {
39:       type: [String],
40:       default: ["branches:read", "tickets:read"],
41:     },
42:     rateLimit: {
43:       type: Number,
44:       default: 100,
45:       min: 1,
46:       max: 10000,
47:     },
48:     status: {
49:       type: String,
50:       enum: ["pending", "approved", "rejected"],
51:       default: "pending",
52:       index: true,
53:     },
54:     // The platform superadmin who approved or rejected the request.
55:     reviewedBy: {
56:       type: mongoose.Schema.Types.ObjectId,
57:       ref: "Superadmin",
58:       default: null,
59:     },
60:     reviewNote: {
61:       type: String,
62:       default: "",
63:       maxlength: 500,
64:     },
65:     // Set when approved — links to the created ApiKey document.
66:     apiKey: {
67:       type: mongoose.Schema.Types.ObjectId,
68:       ref: "ApiKey",
69:       default: null,
70:     },
71:     // AES-256-GCM ciphertext of the raw key, staged for bank admin's
72:     // one-time reveal. Wiped after bankKeyRevealedAt is set.
73:     encryptedRawKey: {
74:       type: String,
75:       default: null,
76:     },
77:     rawKeyStagedAt: {
78:       type: Date,
79:       default: null,
80:     },
81:     bankKeyRevealedAt: {
82:       type: Date,
83:       default: null,
84:     },
85:   },
86:   { timestamps: true },
87: );
88: 
89: // Fast lookup of a bank's outstanding requests.
90: apiKeyRequestSchema.index({ bankName: 1, status: 1, createdAt: -1 });
91: 
92: const ApiKeyRequest = mongoose.model("ApiKeyRequest", apiKeyRequestSchema);
93: export default ApiKeyRequest;

(End of file - total 93 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/platform/auth.routes.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/routes/platform/auth.routes.js</path>
<type>file</type>
<content>
1: import { Router } from "express";
2: import { protect, authorize } from "../../middlewares/auth.middleware.js";
3: import { loginSuperadmin, getPlatformMe } from "../../controllers/platform/platformAuth.controller.js";
4: import { authLimiter } from "../../middlewares/rateLimiter.js";
5: import { loginValidator } from "../../validators/auth.validator.js";
6: import validate from "../../middlewares/validate.js";
7: 
8: /**
9:  * Platform auth routes — superadmin JWT login.
10:  *
11:  * POST /api/platform/login is OPEN (but rate-limited) so the superadmin
12:  * can obtain a token. Everything else under /api/platform/* requires
13:  * protect + authorize("superadmin") (applied in routes/platform/index.js).
14:  */
15: const router = Router();
16: 
17: router.post("/login", authLimiter, loginValidator, validate, loginSuperadmin);
18: router.get("/me", protect, authorize("superadmin"), getPlatformMe);
19: 
20: export default router;

(End of file - total 20 lines)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue",
  "pattern": "api-key-requests|apiKeyRequest"
}
```

**Output:**
```
Found 33 matches
/home/gamp/Desktop/cue/backend/src/models/apiKeyRequest.model.js:
  Line 18: const apiKeyRequestSchema = new mongoose.Schema(

  Line 90: apiKeyRequestSchema.index({ bankName: 1, status: 1, createdAt: -1 });

  Line 92: const ApiKeyRequest = mongoose.model("ApiKeyRequest", apiKeyRequestSchema);


/home/gamp/Desktop/cue/BUILD_PLAN.md:
  Line 108: - [x] JWT admin key-request routes: `POST/GET /api/admin/api-key-requests`, `GET /:id` one-time reveal — `bankName` always `req.user.bank`

  Line 109: - [x] Mounted in `app.js`: `/api/managers`, `/api/admin/api-key-requests`; staff routes add `GET /:staffId`

  Line 130:   - `manageApi.js`, `adminApi.js`, `apiKeyRequestApi.js`, `ticketsApi.js`

  Line 498:   └─ Bank admin: POST /api/v1/api-key-requests to request a key

  Line 508: /api/v1/api-key-requests/* → API-key auth + authorize("admin") + bankScope

  Line 543: - [x] New `apiKeyRequest.model.js`: `bankName`, `requestedBy` (Staff ref), `label`, `scopes[]`, `rateLimit`, `status: pending/approved/rejected`, `reviewedBy`, `reviewNote`, `apiKey` ref, **`encryptedRawKey`** (iv+tag+payload), **`rawKeyStagedAt`**, `bankKeyRevealedAt`, timestamps

  Line 544: - [x] New v1 routes `apiKeyRequest.routes.js`:

  Line 569: - [x] New `features/platform/platformApi.js`; new `features/staff/apiKeyRequestApi.js`


/home/gamp/Desktop/cue/backend/src/app.js:
  Line 83: app.use("/api/admin/api-key-requests", adminKeyRequestRouter);


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx:
  Line 12: } from "../../features/staff/apiKeyRequestApi";


/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js:
  Line 3: import ApiKeyRequest from "../models/apiKeyRequest.model.js";

  Line 19:  *   GET /api/admin/api-key-requests/:id

  Line 40:  * POST /api/admin/api-key-requests

  Line 133:  * GET /api/admin/api-key-requests

  Line 187:  * GET /api/admin/api-key-requests/:id


/home/gamp/Desktop/cue/backend/tests/models/fourModelSplit.test.js:
  Line 6: import ApiKeyRequest from "../../src/models/apiKeyRequest.model.js";


/home/gamp/Desktop/cue/backend/src/routes/platform/apiKey.routes.js:
  Line 21:  * Bank admins submit ApiKeyRequests instead (see routes/v1/apiKeyRequest.routes.js).


/home/gamp/Desktop/cue/backend/src/controllers/platform/platformKeyRequest.controller.js:
  Line 2: import ApiKeyRequest from "../../models/apiKeyRequest.model.js";


/home/gamp/Desktop/cue/backend/src/controllers/platform/platformUsage.controller.js:
  Line 3: import ApiKeyRequest from "../../models/apiKeyRequest.model.js";


/home/gamp/Desktop/cue/frontend/src/features/staff/apiKeyRequestApi.js:
  Line 4:  * Bank admin API key request API — JWT `/api/admin/api-key-requests` (WP6).

  Line 13:   apiClient.post("/admin/api-key-requests", data, { token });

  Line 17:   apiClient.get("/admin/api-key-requests", { token });

  Line 24:   apiClient.get(`/admin/api-key-requests/${id}`, { token });


/home/gamp/Desktop/cue/backend/src/routes/v1/index.js:
  Line 12: import apiKeyRequestRouter from "./apiKeyRequest.routes.js";

  Line 58: v1Router.use("/api-key-requests", apiKeyRequestRouter);


/home/gamp/Desktop/cue/backend/src/routes/v1/apiKeyRequest.routes.js:
  Line 4: import ApiKeyRequest from "../../models/apiKeyRequest.model.js";

  Line 21:  *   GET /api/v1/api-key-requests/:id

  Line 42:  * POST /api/v1/api-key-requests

  Line 133:  * GET /api/v1/api-key-requests

  Line 186:  * GET /api/v1/api-key-requests/:id

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/app.js",
  "limit": 80,
  "offset": 90
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/app.js</path>
<type>file</type>
<content>
90: app.use("/api/appointments", appointmentRouter);
91: app.use("/api/contact", contactRouter);
92: app.use("/api/webhooks", webhookRouter);
93: app.use("/api/staff-import", staffImportRouter);
94: app.use("/api/export", exportRouter);
95: app.use("/api/advanced-analytics", advancedAnalyticsRouter);
96: app.use("/api/brand", brandRouter);
97: 
98: // ── V1 API Routes (API-key authenticated) ──────────────────────
99: // These routes are the primary integration surface for banks.
100: // They use API key authentication via the X-API-Key header.
101: // The v1Router applies: authenticateApiKey → apiKeyRateLimit → bankScope
102: import { bankScope } from "./middlewares/bankScope.middleware.js";
103: import { resolveStaffUser } from "./middlewares/resolveStaffUser.js";
104: 
105: // ── Platform routes (superadmin JWT auth) ───────────────────────
106: // Superadmin-only console: API key lifecycle, usage monitoring,
107: // key-request approval. NOT under /api/v1 and NOT bank-scoped —
108: // the superadmin is a platform operator, not a bank tenant.
109: // Mounted BEFORE the v1 API-key pipeline so JWT auth is independent.
110: app.use("/api/platform", platformRouter);
111: 
112: // Demo helper routes removed (Phase 13 WP7) — dashboard is JWT-only.
113: 
114: // V1 public routes — guest ticket flow (no auth required)
115: import publicV1Router from "./routes/v1/public.routes.js";
116: app.use("/api/v1", publicV1Router);
117: 
118: // V1 authenticated routes — all require API key auth + rate limiting
119: // The bankScope middleware inside v1Router handles tenant isolation.
120: // tenantMatch: if a bank admin JWT and an API key are both present,
121: // admin.bank must equal key.bankName (403 otherwise).
122: app.use(
123:   "/api/v1",
124:   authenticateApiKey,
125:   resolveStaffUser,
126:   tenantMatch,
127:   apiKeyRateLimit,
128:   v1Router,
129: );
130: 
131: // Swagger API docs
132: app.get("/api/docs/openapi.json", (req, res) => {
133:   res.setHeader("Content-Type", "application/json");
134:   res.send(JSON.stringify(openapiSpec, null, 2));
135: });
136: app.use(
137:   "/api/docs",
138:   swaggerUi.serve,
139:   swaggerUi.setup(openapiSpec, {
140:     customCss: ".swagger-ui .topbar { display: none }",
141:     customSiteTitle: "Queue Management API Documentation",
142:   }),
143: );
144: 
145: // error handling middleware
146: app.use(notFoundHandler);
147: app.use(errorHandler);
148: 
149: export default app;

(End of file - total 149 lines)
</content>
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "frontend/src/**/*.test.*"
}
```

**Output:**
```
/home/gamp/Desktop/cue/frontend/src/components/ErrorBoundary/__tests__/ErrorBoundary.test.jsx
/home/gamp/Desktop/cue/frontend/src/lib/__tests__/apiClient.test.js
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/tests/middlewares/superadmin.authorize.test.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/tests/middlewares/superadmin.authorize.test.js</path>
<type>file</type>
<content>
1: import { describe, it, expect, vi, beforeEach } from "vitest";
2: import { authorize } from "../../src/middlewares/auth.middleware.js";
3: 
4: const mockRes = () => {
5:   const res = {};
6:   res.status = vi.fn().mockReturnValue(res);
7:   res.json = vi.fn().mockReturnValue(res);
8:   return res;
9: };
10: 
11: const mockNext = vi.fn();
12: 
13: /**
14:  * Superadmin role tests for authorize().
15:  *
16:  * Superadmin is a platform operator (JWT at /platform) and must only
17:  * pass routes that explicitly list "superadmin". Bank routes list
18:  * "admin"/"manager" only — superadmin does NOT inherit bank access.
19:  */
20: describe("authorize — superadmin", () => {
21:   beforeEach(() => {
22:     vi.clearAllMocks();
23:   });
24: 
25:   it("allows superadmin on superadmin-only routes", () => {
26:     const req = { user: { id: "1" }, role: "superadmin" };
27:     const res = mockRes();
28:     authorize("superadmin")(req, res, mockNext);
29:     expect(mockNext).toHaveBeenCalled();
30:   });
31: 
32:   it("rejects superadmin from bank admin routes", () => {
33:     const req = { user: { id: "1" }, role: "superadmin" };
34:     const res = mockRes();
35:     authorize("admin")(req, res, mockNext);
36:     expect(res.status).toHaveBeenCalledWith(403);
37:     expect(mockNext).not.toHaveBeenCalled();
38:   });
39: 
40:   it("rejects superadmin from admin+manager routes", () => {
41:     const req = { user: { id: "1" }, role: "superadmin" };
42:     const res = mockRes();
43:     authorize("admin", "manager")(req, res, mockNext);
44:     expect(res.status).toHaveBeenCalledWith(403);
45:     expect(mockNext).not.toHaveBeenCalled();
46:   });
47: 
48:   it("rejects bank admin from superadmin-only routes", () => {
49:     const req = { user: { id: "1" }, role: "admin" };
50:     const res = mockRes();
51:     authorize("superadmin")(req, res, mockNext);
52:     expect(res.status).toHaveBeenCalledWith(403);
53:     expect(mockNext).not.toHaveBeenCalled();
54:   });
55: });

(End of file - total 55 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/features/auth/ProtectedRoute.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/features/auth/ProtectedRoute.jsx</path>
<type>file</type>
<content>
1: import { Navigate, useLocation } from "react-router-dom";
2: import { useAuth } from "./AuthContext";
3: 
4: /**
5:  * Route guard — JWT only (Phase 13 WP6/WP7).
6:  *
7:  * Demo API-key sessions are gone; every protected page requires a Bearer token.
8:  * If allowedRoles is provided and auth.role isn't in it, redirect home.
9:  * Superadmin-only routes pass allowedRoles={["superadmin"]}.
10:  */
11: const ProtectedRoute = ({ children, allowedRoles }) => {
12:   const { auth } = useAuth();
13:   const location = useLocation();
14: 
15:   const isAuthenticated = !!auth?.token;
16: 
17:   if (!isAuthenticated) {
18:     return <Navigate to="/" replace state={{ from: location.pathname }} />;
19:   }
20: 
21:   if (allowedRoles && !allowedRoles.includes(auth.role)) {
22:     return <Navigate to="/" replace />;
23:   }
24: 
25:   return children;
26: };
27: 
28: export default ProtectedRoute;

(End of file - total 28 lines)
</content>
```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 277.4s)

_Thinking:_

Now I have a clear picture of WP8 gaps. Let me plan the work:

## WP8 — Platform console adjustments (Superadmin model everywhere)

Gaps identified:

1. **Legacy `routes/v1/apiKeyRequest.routes.js` is broken/dead**:
   - Uses `authorize("admin")` but v1 path always sets `req.role = "staff"` via `resolveStaffUser` → would 403 every request (WP5 lesson)
   - Uses `requestedBy: req.user?._id` which would be a Staff id, but model ref is Admin → would cast-fail
   - Dashboard now uses JWT `/api/admin/api-key-requests` (WP6)
   - **Action**: Remove v1 apiKeyRequest routes entirely (or keep for API-key systems?). Wait - bank admins use JWT dashboard now. External systems use API keys but they shouldn't need to create key requests (that's a human admin action). So remove the v1 route and unmount it.

2. **Platform login response returns `data.staff` instead of `data.user`**:
   - AuthContext handles both (`payload.data?.user || payload.data?.staff`) so it works, but WP8 says Superadmin model everywhere - should normalize to `user` for consistency with bank logins.

3. **Stale comments** pointing to `routes/v1/apiKeyRequest.routes.js` in platform apiKey routes and maybe elsewhere - update to JWT path.

4. **`ApiKeyRequest` model comment** still says "via API-key auth" - update.

5. **BUILD_PLAN** phase 12 section still says `requestedBy (Staff ref)` and `/api/v1/api-key-requests/*` - but that's historical Phase 12 docs. WP1 checklist already says requestedBy → Admin. Historical phases might be left as-is since they document what was done then... Actually Phase 13 superseded it. Minor - could update comments in model.

6. **AuthInterceptor** navigates to `/` on 401 - for platform, should go to `/platform/login` with sessionExpired? PlatformLogin checks `location.state?.sessionExpired`. Currently interceptor always goes to `/`. WP8 adjustment: if was superadmin, go to platform login with sessionExpired. But interceptor doesn't know role before clearing... It has setAuth, could read current auth. Actually AuthInterceptor only has setAuth. Could improve: navigate based on previous role. Minor UX polish.

7. **PlatformDashboard logout** goes to `/platform/login` - good.

8. **ProtectedRoute** for superadmin unauthenticated goes to `/` with `from` - PlatformLogin doesn't read `from` from protected route path when redirected from ProtectedRoute... ProtectedRoute sets `state={{ from: location.pathname }}` = `/platform`. PlatformLogin does `navigate(location.state?.from || "/platform")` - good.

9. **Missing platform tests** - Phase 13 WP8 needs tests. Phase 12 WP8 was tests for authorize. Need:
   - Superadmin model everywhere tests
   - Platform key-request review sets reviewedBy Superadmin
   - Platform routes reject non-superadmin
   - Maybe platform login response shape
   - modelForToken already tested

10. **loginSuperadmin** returns `data.staff` - change to `data.user` and update AuthContext comment.

11. **Double protect on /me**: platform index does `use(authRoutes)` then later `use(protect)`. auth.routes has its own protect+authorize on /me. For login POST, authLimiter only. When authRoutes is mounted with `use("/")`, all authRoutes routes match. After authRoutes, protect+authorize applied to subsequent. Good.

12. Wait - `platformRouter.use("/", authRoutes)` - does this mean POST /login goes through authRoutes and returns, never hitting later middleware? Yes for matching routes. For non-matching paths under authRoutes, falls through... Actually express Router.use with a router - if authRoutes doesn't handle the path, it calls next() and continues. authRoutes only has POST /login and GET /me. Other paths continue to protect. Good.

13. **Frontend LoginPage** doesn't exclude superadmin from role switcher links for staff/manager/admin - has Platform link. Superadmin visiting /login/staff: useEffect only redirects if role !== "superadmin", so superadmin stays on login page. Fine.

14. **PlatformDashboard create key form** - doesn't include admin scope in default scopes - fine.

15. **admin scope on create** - VALID_SCOPES includes admin for approve. platformApiKey.controller - need to check if create allows admin scope.

16. **BUILD_PLAN WP8 checklist** - need to write it with items.

Let me also check:
- Does frontend AdminOverview still work with canRevealKey?
- platform create key validator for scopes
- Whether v1 public routes still have demo remnants

I'll implement WP8:

1. Delete `backend/src/routes/v1/apiKeyRequest.routes.js`, remove mount from v1/index.js
2. Fix platform login response: `data.user` instead of `data.staff`
3. Update AuthContext comment (already handles both)
4. Update stale comments (platform apiKey routes, apiKeyRequest model, platform apiKey controller)
5. AuthInterceptor: superadmin → `/platform/login` with sessionExpired? Or navigate to platform login if role was superadmin
6. Add tests:
   - platform auth: login response shape / modelForToken already there
   - reviewedBy Superadmin ref   - platform index authorize gate
   - v1 no longer mounts api-key-requests (harder to test without app mount)
   - fourModelSplit already has ApiKeyRequest
7. Update BUILD_PLAN WP8 checklist
8. Run tests + build

Also check PlatformLogin sessionExpired - AuthInterceptor should navigate superadmin to platform login.

For AuthInterceptor:
```jsx
const AuthInterceptor = ({ setAuth }) => {
  const navigate = useNavigate();
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setAuth((prev) => {
        const wasSuperadmin = prev?.role === "superadmin";
        // navigate after?
        return null;
      });
    });
  });
};
```
Actually setAuth is a setState function, side-effecting navigate inside is messy. Better:
```jsx
registerUnauthorizedHandler(() => {
  // We need to know role - read from localStorage before clear
  const raw = localStorage.getItem("cue_auth");
  const prev = raw ? JSON.parse(raw) : null;
  setAuth(null);
  if (prev?.role === "superadmin") {
    navigate("/platform/login", { replace: true, state: { sessionExpired: true } });
  } else {
    navigate("/", { replace: true });
  }
});
```
But localStorage is cleared by useEffect after setAuth - reading before setAuth is fine.

Also ProtectedRoute for unauthenticated superadmin path: go to platform login if path starts with /platform:
```jsx
if (!isAuthenticated) {
  const to = location.pathname.startsWith("/platform") ? "/platform/login" : "/";
  return <Navigate to={to} replace state={{ from: location.pathname, sessionExpired: false }} />;
}
```

And if role mismatch for platform routes, redirect to login instead of home.

Let me also check if there are frontend tests for AuthContext.

Also verify: does `getAuthMe` work for superadmin? Yes - identity() with kind superadmin returns id/name/email/role/kind/mustChangePassword. AuthContext toAuth handles it. Good.

platformAuth loginSuperadmin returns staff wrapper - fix to user.

Does PlatformDashboard use `auth?.name`? Yes - after login identity has name. Good.

Check apiKey create scopes validation - does it allow "admin"?

Implementing WP8: removing broken v1 key-request route, normalizing platform login to Superadmin/`user` shape, fixing session-expired redirects, updating comments, and adding tests.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/validators/apiKey.validator.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/validators/apiKey.validator.js</path>
<type>file</type>
<content>
1: import { body, param } from "express-validator";
2: 
3: /**
4:  * Valid scopes that can be assigned to an API key.
5:  * Must match the VALID_SCOPES array in the ApiKey model.
6:  */
7: const VALID_SCOPES = [
8:   "branches:read",
9:   "tickets:write",
10:   "tickets:read",
11:   "staff:read",
12:   "analytics:read",
13:   "webhooks:manage",
14:   "admin",
15: ];
16: 
17: /**
18:  * Validation rules for creating a new API key.
19:  *
20:  * POST /api/platform/api-keys
21:  * Body: { bankName, label?, scopes?, rateLimit?, expiresAt? }
22:  */
23: export const validateCreateApiKey = [
24:   body("bankName")
25:     .trim()
26:     .notEmpty()
27:     .withMessage("Bank name is required")
28:     .isLength({ min: 2, max: 100 })
29:     .withMessage("Bank name must be between 2 and 100 characters"),
30: 
31:   body("label")
32:     .optional()
33:     .trim()
34:     .isLength({ max: 200 })
35:     .withMessage("Label must be under 200 characters"),
36: 
37:   body("scopes")
38:     .optional()
39:     .isArray({ min: 1 })
40:     .withMessage("Scopes must be a non-empty array")
41:     .custom((scopes) => {
42:       const invalid = scopes.filter((s) => !VALID_SCOPES.includes(s));
43:       if (invalid.length > 0) {
44:         throw new Error(`Invalid scope(s): ${invalid.join(", ")}`);
45:       }
46:       return true;
47:     }),
48: 
49:   body("rateLimit")
50:     .optional()
51:     .isInt({ min: 1, max: 10000 })
52:     .withMessage("Rate limit must be between 1 and 10,000 requests per minute"),
53: 
54:   body("expiresAt")
55:     .optional()
56:     .isISO8601()
57:     .withMessage("Expiration date must be a valid ISO 8601 date")
58:     .custom((value) => {
59:       if (new Date(value) <= new Date()) {
60:         throw new Error("Expiration date must be in the future");
61:       }
62:       return true;
63:     }),
64: ];
65: 
66: /**
67:  * Validation rules for rotating an API key.
68:  *
69:  * POST /api/platform/api-keys/:id/rotate
70:  * Params: { id }
71:  */
72: export const validateRotateApiKey = [
73:   param("id")
74:     .isMongoId()
75:     .withMessage("Invalid API key ID"),
76: ];
77: 
78: /**
79:  * Validation rules for deleting an API key.
80:  *
81:  * DELETE /api/platform/api-keys/:id
82:  * Params: { id }
83:  */
84: export const validateDeleteApiKey = [
85:   param("id")
86:     .isMongoId()
87:     .withMessage("Invalid API key ID"),
88: ];

(End of file - total 88 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js",
  "limit": 50
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js</path>
<type>file</type>
<content>
1: import ApiKey from "../../models/apiKey.model.js";
2: import { sendSuccess, sendError } from "../../utils/response.js";
3: import { parsePagination, paginatedResponse } from "../../utils/pagination.js";
4: import { validationResult } from "express-validator";
5: 
6: /**
7:  * Platform API key controller — superadmin-only key lifecycle.
8:  *
9:  * Replaces the old /api/v1/api-keys routes (authorize("admin")) which
10:  * let ANY bank admin see ALL banks' keys — a multi-tenancy hole.
11:  *
12:  * The raw API key is only returned ONCE — at creation or rotation.
13:  * Bank admins never call these endpoints; they submit ApiKeyRequests instead.
14:  */
15: 
16: const handleValidation = (req, res) => {
17:   const errors = validationResult(req);
18:   if (!errors.isEmpty()) {
19:     sendError(res, {
20:       statusCode: 400,
21:       message: "Validation failed",
22:       errors: errors.array().map((e) => e.msg),
23:     });
24:     return false;
25:   }
26:   return true;
27: };
28: 
29: /**
30:  * POST /api/platform/api-keys
31:  * Create a key for a bank. Returns raw key ONCE.
32:  */
33: export const createApiKey = async (req, res, next) => {
34:   try {
35:     if (!handleValidation(req, res)) return;
36: 
37:     const { bankName, label, scopes, rateLimit, expiresAt } = req.body;
38:     const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();
39: 
40:     const apiKey = await ApiKey.create({
41:       bankName,
42:       label: label || "",
43:       keyHash,
44:       keyPrefix,
45:       scopes: scopes || ["branches:read", "tickets:read"],
46:       rateLimit: rateLimit || 100,
47:       expiresAt: expiresAt || null,
48:     });
49: 
50:     return sendSuccess(res, {

(Showing lines 1-50 of 197. Use offset=51 to continue.)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue",
  "pattern": "v1/api-key-requests|api-key-requests",
  "include": "*.{js,jsx,md,json}"
}
```

**Output:**
```
Found 18 matches
/home/gamp/Desktop/cue/BUILD_PLAN.md:
  Line 108: - [x] JWT admin key-request routes: `POST/GET /api/admin/api-key-requests`, `GET /:id` one-time reveal — `bankName` always `req.user.bank`

  Line 109: - [x] Mounted in `app.js`: `/api/managers`, `/api/admin/api-key-requests`; staff routes add `GET /:staffId`

  Line 498:   └─ Bank admin: POST /api/v1/api-key-requests to request a key

  Line 508: /api/v1/api-key-requests/* → API-key auth + authorize("admin") + bankScope


/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js:
  Line 19:  *   GET /api/admin/api-key-requests/:id

  Line 40:  * POST /api/admin/api-key-requests

  Line 133:  * GET /api/admin/api-key-requests

  Line 187:  * GET /api/admin/api-key-requests/:id


/home/gamp/Desktop/cue/backend/src/app.js:
  Line 83: app.use("/api/admin/api-key-requests", adminKeyRequestRouter);


/home/gamp/Desktop/cue/backend/src/routes/v1/index.js:
  Line 58: v1Router.use("/api-key-requests", apiKeyRequestRouter);


/home/gamp/Desktop/cue/backend/src/routes/v1/apiKeyRequest.routes.js:
  Line 21:  *   GET /api/v1/api-key-requests/:id

  Line 42:  * POST /api/v1/api-key-requests

  Line 133:  * GET /api/v1/api-key-requests

  Line 186:  * GET /api/v1/api-key-requests/:id


/home/gamp/Desktop/cue/frontend/src/features/staff/apiKeyRequestApi.js:
  Line 4:  * Bank admin API key request API — JWT `/api/admin/api-key-requests` (WP6).

  Line 13:   apiClient.post("/admin/api-key-requests", data, { token });

  Line 17:   apiClient.get("/admin/api-key-requests", { token });

  Line 24:   apiClient.get(`/admin/api-key-requests/${id}`, { token });

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/components/Navbar/Navbar.jsx",
  "limit": 100
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/components/Navbar/Navbar.jsx</path>
<type>file</type>
<content>
1: import { useState } from "react";
2: import { Link, useNavigate } from "react-router-dom";
3: import { motion, AnimatePresence } from "framer-motion";
4: import { useAuth } from "../../features/auth/AuthContext";
5: import { useTheme } from "../../features/theme/ThemeContext";
6: import { useBrand } from "../../features/brand/BrandContext";
7: import logoUrl from "../../assets/logo.svg";
8: import styles from "./Navbar.module.css";
9: 
10: const NAV_LINKS = ["Product", "How it works", "For branches", "Pricing"];
11: 
12: /**
13:  * Navbar — marketing + session shell.
14:  *
15:  * WP7: demo UserSwitcher is gone. Signed-out visitors get a "Sign in"
16:  * link to /login/staff (role picker lives on that page).
17:  */
18: const Navbar = () => {
19:   const { brand } = useBrand();
20:   const [open, setOpen] = useState(false);
21:   const { auth, logout } = useAuth();
22:   const { theme, toggleTheme } = useTheme();
23:   const navigate = useNavigate();
24:   const firstName = auth?.name?.split(" ")[0];
25: 
26:   const handleSignOut = () => {
27:     logout();
28:     navigate("/");
29:   };
30: 
31:   return (
32:     <header className={styles.header}>
33:       <div className={styles.container}>
34:         <Link to="/" className={styles.logo}>
35:           <img src={logoUrl} alt={brand.name} className={styles.logoIcon} />
36:           <span>{brand.name}</span>
37:         </Link>
38: 
39:         <nav className={styles.nav}>
40:           {NAV_LINKS.map((link) => (
41:             <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}>
42:               {link}
43:             </a>
44:           ))}
45:           <Link to="/find-nearby" className={styles.boardsLink}>
46:             Find Nearby
47:           </Link>
48:           <Link to="/boards" className={styles.boardsLink}>
49:             Live Boards
50:           </Link>
51:         </nav>
52: 
53:         <button
54:           className={styles.themeToggle}
55:           onClick={toggleTheme}
56:           aria-label="Toggle dark mode"
57:         >
58:           {theme === "dark" ? "☀" : "☾"}
59:         </button>
60: 
61:         <div className={styles.authGroup}>
62:           {auth?.token ? (
63:             <>
64:               {auth.role === "superadmin" ? (
65:                 <Link to="/platform" className={styles.accountLink}>
66:                   Platform
67:                 </Link>
68:               ) : (
69:                 <Link to="/staff" className={styles.accountLink}>
70:                   {firstName}
71:                 </Link>
72:               )}
73:               <button className={styles.cta} onClick={handleSignOut}>
74:                 Sign out
75:               </button>
76:             </>
77:           ) : (
78:             <>
79:               <Link to="/login/staff" className={styles.loginLink}>
80:                 Sign in
81:               </Link>
82:               <Link to="/platform/login" className={styles.loginLink}>
83:                 Platform
84:               </Link>
85:               <Link to="/contact" className={styles.cta}>
86:                 Request a demo
87:               </Link>
88:             </>
89:           )}
90:         </div>
91: 
92:         <button
93:           className={styles.menuToggle}
94:           onClick={() => setOpen((o) => !o)}
95:           aria-label="Toggle menu"
96:           aria-expanded={open}
97:         >
98:           <span className={open ? styles.barOpen1 : styles.bar} />
99:           <span className={open ? styles.barOpen2 : styles.bar} />
100:         </button>

(Showing lines 1-100 of 163. Use offset=101 to continue.)
</content>
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "backend/tests/**/*.test.js"
}
```

**Output:**
```
/home/gamp/Desktop/cue/backend/tests/middlewares/superadmin.authorize.test.js
/home/gamp/Desktop/cue/backend/tests/middlewares/apiKey.middleware.test.js
/home/gamp/Desktop/cue/backend/tests/middlewares/validate.test.js
/home/gamp/Desktop/cue/backend/tests/middlewares/tenantMatch.test.js
/home/gamp/Desktop/cue/backend/tests/middlewares/requireStaffServing.test.js
/home/gamp/Desktop/cue/backend/tests/middlewares/auth.middleware.test.js
/home/gamp/Desktop/cue/backend/tests/middlewares/modelForToken.test.js
/home/gamp/Desktop/cue/backend/tests/middlewares/error.middleware.test.js
/home/gamp/Desktop/cue/backend/tests/utils/response.test.js
/home/gamp/Desktop/cue/backend/tests/utils/keyWrap.test.js
/home/gamp/Desktop/cue/backend/tests/utils/pagination.test.js
/home/gamp/Desktop/cue/backend/tests/validators/auth.validator.test.js
/home/gamp/Desktop/cue/backend/tests/validators/provisioning.validator.test.js
/home/gamp/Desktop/cue/backend/tests/models/fourModelSplit.test.js
/home/gamp/Desktop/cue/backend/tests/models/invite.model.test.js
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/package.json"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/package.json</path>
<type>file</type>
<content>
1: {
2:   "name": "smart-queue-management-system",
3:   "version": "1.0.0",
4:   "description": "This is a RESTful backend service designed to help users to join queues remotely, to track their positions, to manage and call the next ticket....",
5:   "type": "module",
6:   "main": "server.js",
7:   "scripts": {
8:     "dev": "nodemon src/server.js",
9:     "start": "node src/server.js",
10:     "seed:admin": "node src/scripts/seedAdmin.js",
11:     "seed:superadmin": "node src/scripts/seedSuperadmin.js",
12:     "seed:apikey": "node src/scripts/seedApiKey.js",
13:     "migrate:split-staff": "node src/scripts/migrateSplitStaff.js",
14:     "test": "vitest run",
15:     "test:watch": "vitest"
16:   },
17:   "repository": {
18:     "type": "git",
19:     "url": "git+.git"
20:   },
21:   "keywords": [],
22:   "author": "",
23:   "license": "ISC",
24:   "bugs": {
25:     "url": "https://github.com/ayomidade/Smart-Queue-Management-System-Backend-API/issues"
26:   },
27:   "homepage": "https://github.com/ayomidade/Smart-Queue-Management-System-Backend-API#readme",
28:   "dependencies": {
29:     "bcryptjs": "^3.0.3",
30:     "compression": "^1.8.2",
31:     "cors": "^2.8.6",
32:     "dotenv": "^17.4.2",
33:     "express": "^5.2.1",
34:     "express-rate-limit": "^8.6.2",
35:     "express-validator": "^7.3.2",
36:     "groq-sdk": "^1.6.0",
37:     "helmet": "^8.3.0",
38:     "js-yaml": "^5.3.0",
39:     "jsonwebtoken": "^9.0.3",
40:     "mongoose": "^9.9.3",
41:     "multer": "^2.3.0",
42:     "resend": "^6.21.0",
43:     "socket.io": "^4.8.3",
44:     "swagger-jsdoc": "^6.3.0",
45:     "swagger-ui-express": "^5.0.1",
46:     "web-push": "^3.6.7"
47:   },
48:   "devDependencies": {
49:     "nodemon": "^3.1.14",
50:     "vitest": "^5.0.0"
51:   },
52:   "allowScripts": {
53:     "@scarf/scarf@1.4.0": true
54:   }
55: }

(End of file - total 55 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/package.json"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/package.json</path>
<type>file</type>
<content>
1: {
2:   "name": "frontend",
3:   "private": true,
4:   "version": "0.0.0",
5:   "type": "module",
6:   "scripts": {
7:     "dev": "vite",
8:     "build": "vite build",
9:     "lint": "eslint .",
10:     "test": "vitest run",
11:     "test:watch": "vitest",
12:     "preview": "vite preview"
13:   },
14:   "dependencies": {
15:     "framer-motion": "^13.1.0",
16:     "gsap": "^3.15.0",
17:     "react": "^19.2.8",
18:     "react-dom": "^19.2.8",
19:     "react-router-dom": "^7.18.2",
20:     "socket.io-client": "^4.8.3"
21:   },
22:   "devDependencies": {
23:     "@eslint/js": "^10.0.1",
24:     "@testing-library/jest-dom": "^7.0.1",
25:     "@testing-library/react": "^16.3.3",
26:     "@testing-library/user-event": "^14.6.7",
27:     "@types/react": "^19.2.17",
28:     "@types/react-dom": "^19.2.3",
29:     "@vitejs/plugin-react": "^6.0.4",
30:     "eslint": "^10.8.0",
31:     "eslint-plugin-react-hooks": "^7.1.1",
32:     "eslint-plugin-react-refresh": "^0.5.3",
33:     "globals": "^17.7.0",
34:     "jsdom": "^30.0.1",
35:     "vite": "^8.2.0",
36:     "vitest": "^5.0.0"
37:   }
38: }

(End of file - total 38 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/BUILD_PLAN.md",
  "limit": 50,
  "offset": 460
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/BUILD_PLAN.md</path>
<type>file</type>
<content>
460: - [ ] Add multi-tenancy isolation tests
461: - [ ] Update CI pipeline for new structure
462: - [ ] Update frontend tests for removed features
463: - [ ] Run full test suite, fix any regressions
464: 
465: ---
466: 
467: ## Phase 12 — Platform Superadmin Console & Bank-Scoped Admin (Option B) ✅
468: 
469: **Goal:** Split platform operations (superadmin) from bank operations (bank-scoped admin). Superadmin monitors API usage and exclusively owns API key lifecycle; bank admin requests keys for their own bank. Everything bank-facing becomes bank-scoped.
470: 
471: **Decisions (locked):**
472: 
473: | Topic | Decision |
474: |---|---|
475: | Superadmin auth | JWT-only login at `/platform`; only persona who must log in; excluded from demo user switcher |
476: | Dashboard | New `/platform` route: Overview / API Keys / Key Requests |
477: | Usage tracking | Daily buckets (`ApiKeyUsage`) + `ApiKey.requestCount` total |
478: | Key ownership | Superadmin only creates/revokes/suspends/rotates; bank admin only **requests** |
479: | Bank admin UI | Visible **"Request API key"** button + request-status list on AdminOverview |
480: | Request form | Multi-select scopes: `branches:read`, `tickets:read`, `tickets:write`, `staff:read`, `analytics:read`, `webhooks:manage` (`admin` scope reserved for superadmin-created keys) |
481: | Raw-key delivery | **Encrypted one-time store**: on approve, AES-256-GCM-encrypt raw key onto `ApiKeyRequest`; shown once to superadmin immediately; bank admin's first GET of approved request returns raw key once then ciphertext is permanently deleted |
482: | Rotation reveal | **Approval only** — rotated keys shown once to superadmin; bank admin does not get rotation reveals |
483: | Platform scope v1 | **Keys + usage only** (no bank/branch health, no other platform actions yet) |
484: | Bank scoping (Option B) | Fix `getAdminOverview` + `canAccessBranch`; audit remaining admin routes |
485: 
486: **Architecture after this phase:**
487: 
488: ```
489: Superadmin (platform operator)
490:   └─ JWT login at POST /api/platform/login
491:   └─ Dashboard at /platform  (Overview | API Keys | Key Requests)
492:   └─ Owns: key CRUD, usage monitoring, key-request approval
493:   └─ NOT in demo user switcher, NOT bank-scoped, no API key needed
494: 
495: Bank Admin / Manager / Staff (bank personas)
496:   └─ Demo API-key + X-Staff-Id switcher (unchanged)
497:   └─ /staff dashboard (admin now bank-scoped)
498:   └─ Bank admin: POST /api/v1/api-key-requests to request a key
499:   └─ Superadmin approves → key created → raw key shown once to superadmin,
500:      staged encrypted for bank admin's one-time reveal from request status
501: ```
502: 
503: **Route security split:**
504: 
505: ```
506: /api/platform/*            → protect (JWT) + authorize("superadmin")  ← no bankScope
507: /api/v1/api-keys/*         → REMOVED (multi-tenancy hole: any admin saw all keys)
508: /api/v1/api-key-requests/* → API-key auth + authorize("admin") + bankScope
509: ```

(Showing lines 460-509 of 594. Use offset=510 to continue.)
</content>
```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 53.7s)

_Thinking:_

I have a clear picture of WP8. Let me implement:

## WP8 gaps identified:

1. **Legacy `routes/v1/apiKeyRequest.routes.js` is broken/dead**:
   - Uses `authorize("admin")` but on v1 path `resolveStaffUser` always sets `req.role = "staff"` → every request would 403 (WP5 lesson)
   - Also `requestedBy: req.user?._id` would be a Staff id, but model ref is Admin → would fail validation
   - Dashboard uses JWT `/api/admin/api-key-requests` (WP4/WP6)
   - External bank systems don't need to request keys via v1 — key requests are a human bank-admin action
   - **Fix: Remove the mount and delete the file** (or leave file but unmount — better delete and update comments)

2. **Platform login response returns `data.staff` instead of `data.user`**:
   - AuthContext handles both (`payload.data?.user || payload.data?.staff`) so it works
   - But for "Superadmin model everywhere" consistency, should return `user` (and maybe keep `kind`)
   - Also missing `mustChangePassword` in platform login response

3. **Platform login response missing `kind`** — toAuth uses `data.role || data.kind`, role is set so OK

4. **Stale comments** pointing to `routes/v1/apiKeyRequest.routes.js` in platform apiKey routes/controllers — update to JWT admin path

5. **ApiKeyRequest model comment** still says "via API-key auth" — update to JWT admin

6. **BUILD_PLAN** Phase 12 architecture still says Demo switcher and v1 key-requests — Phase 12 is historical ✅, but WP8 checklist should document the adjustment. Phase 13 WP8 checklist needs writing.

7. **AuthInterceptor navigates to `/` on 401** — for superadmin should go to `/platform/login` with sessionExpired? PlatformLogin checks `location.state?.sessionExpired` but interceptor doesn't pass it. WP8 polish: navigate superadmin to platform login with sessionExpired.

   Looking at AuthInterceptor:
   ```js
   registerUnauthorizedHandler(() => {
     setAuth(null);
     navigate("/", { replace: true });
   });
   ```
   PlatformLogin checks `location.state?.sessionExpired` — so we should navigate there with that state for superadmin. But interceptor doesn't know role at time of clear... we can read before clear.

 Actually ProtectedRoute for unauthenticated redirects to `/` with `from`. For platform routes, better redirect to `/platform/login`. ProtectedRoute could check if path starts with `/platform`.

8. **ProtectedRoute** for `/platform` when not authenticated goes to `/` not `/platform/login`. WP8 fix: if location starts with /platform, go to /platform/login with sessionExpired or from.

9. **LoginPage** for superadmin: if superadmin visits `/login/staff` with token and role superadmin, the effect only redirects when `role !== "superadmin"`, so superadmin stays on login page — OK-ish, they can navigate. Fine.

10. **Platform tests**: Need tests for:
    - platform auth (maybe skip full login without mongo)
    - platform routes reject non-superadmin (already have authorize tests)
    - reviewKeyRequest sets reviewedBy Superadmin (unit test with mocks?)
    - v1 no longer mounts api-key-requests
    - platform login returns Superadmin model shape

11. **getPlatformMe** duplicates getAuthMe — fine

12. **Frontend**: PlatformDashboard logout → `/platform/login` good. ProtectedRoute should send superadmin to platform login when unauthenticated on /platform.

13. **AdminOverview** key request API uses JWT — good.

14. **Double-check**: Does platform login response need `kind: "superadmin"` for toAuth? `role: "superadmin"` is enough.

Let me also check if there's a seed for testing, and whether we should update `platformAuth` to return `user` instead of `staff`:

```js
data: {
  user: {
    id: superadmin._id,
    name: superadmin.name,
    email: superadmin.email,
    role: "superadmin",
    kind: "superadmin",
    mustChangePassword: !!superadmin.mustChangePassword,
  },
  token,
},
```

AuthContext already handles `payload.data?.user || payload.data?.staff`.

For session expired redirect:
```js
const AuthInterceptor = ({ setAuth }) => {
  const navigate = useNavigate();
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      // Need to know role — read from localStorage before clear
      let wasSuperadmin = false;
      try {
        const raw = localStorage.getItem("cue_auth");
        if (raw) wasSuperadmin = JSON.parse(raw)?.role === "superadmin";
      } catch {}
      setAuth(null);
      if (wasSuperadmin) {
        navigate("/platform/login", { replace: true, state: { sessionExpired: true } });
      } else {
        navigate("/", { replace: true, state: { sessionExpired: true } });
      }
    });
    return () => registerUnauthorizedHandler(null);
  }, [navigate, setAuth]);
  return null;
};
```

And ProtectedRoute:
```js
if (!isAuthenticated) {
  const isPlatform = location.pathname.startsWith("/platform");
  return (
    <Navigate
      to={isPlatform ? "/platform/login" : "/"}
      replace
      state={{ from: location.pathname, sessionExpired: isPlatform }}
    />
  );
}
```

Actually sessionExpired only makes sense for 401 mid-session, not first visit. First visit shouldn't say session expired. So:
- ProtectedRoute unauth: `/platform/login` with `state={{ from }}` without sessionExpired
- AuthInterceptor 401: sessionExpired true

Also role mismatch on /platform should redirect to platform login? Currently goes to `/`. Fine.

For removing v1 apiKeyRequest:
- Remove import and mount from v1/index.js
- Delete file routes/v1/apiKeyRequest.routes.js
- Update comments in platform routes/controllers- Update apiKeyRequest.model.js comment
- Update BUILD_PLAN route security line for Phase 12? Phase 12 is historical — but the route no longer exists. I'll note in WP8 checklist. Optionally fix line 508 to say "REMOVED (WP8) — JWT /api/admin/api-key-requests is the path". Actually Phase 12 section is marked ✅ historical; WP8 should document the change.

Add tests:
1. `backend/tests/platform/platformRoutes.test.js` or extend superadmin tests:
   - loginSuperadmin response shape with mocked Superadmin
   - platform key request review sets reviewedBy (mock)
   - authorize on platform router chain (already covered)
   - Ensure v1 router doesn't export api-key-requests — could test by importing v1Router and checking stack

2. Test that reviewing sets reviewedBy to Superadmin id — unit test the controller with mocks.

Let me write a platform test file covering:
- platformAuth login returns user (not staff) + token with kind superadmin — mock Superadmin
- getPlatformMe shape
- reviewKeyRequest sets reviewedBy (mock models)
- platform router requires superadmin authorize for non-login (test authorize chain already done)

Actually testing controllers without mongo: platformAuth uses Superadmin.findOne which needs DB. Can mock with vi.mock.

Simpler approach for tests without DB:
1. Unit test that `loginSuperadmin` returns `user` key - need to mock Superadmin
2. Test v1 index no longer has api-key-requests
3. Test platform index applies authorize - can mount platform router with supertest if available... no supertest in package.json.

Tests are pure unit with vitest, no supertest. So:
- Import v1Router and inspect `v1Router.stack` for path
- Mock Superadmin for login test
- Mock ApiKeyRequest for review test

Also frontend tests? Optional - AuthContext test would be nice but needs lots of mocks. Focus backend.

Also check: does PlatformLogin need Navbar on /platform/login? App has Navbar for platform login but not for /platform dashboard — intentional.

`identity()` for superadmin doesn't set bank/branch — correct.

Does getAuthMe work for superadmin? Yes, identity with kind superadmin.

MustChangePassword for superadmin: seed might not set it. Fine.

AdminOverview key request — uses JWT. Good.

One more issue: **Platform index comment** says GET /me under authRoutes applies protect — login is open. Order is:
```
platformRouter.use("/", authRoutes);  // login + me with protect
platformRouter.use(protect);
platformRouter.use(authorize("superadmin"));
```
authRoutes has `/me` with its own protect+authorize. Login POST open with authLimiter. When using `use("/", authRoutes)`, for POST /login it enters authRoutes, handles login, responds — never hits subsequent protect. Good.

For GET /overview, falls through authRoutes (no match), then protect+authorize. Good.

Implement now.

Also update platform apiKey.routes.js comment to point to adminApiKeyRequest.routes.js.

And BUILD_PLAN WP8 checklist.

Should I also fix phase 12 historical notes? User said WP8 first then WP9. WP8 checklist should document:
- [x] Legacy v1 `/api/v1/api-key-requests` removed (broken: authorize("admin") vs role staff; dashboard uses JWT)
- [x] Platform login returns `user` (Superadmin identity), not `staff`
- [x] Session-expired: superadmin → `/platform/login` with state
- [x] ProtectedRoute: unauthenticated `/platform*` → `/platform/login`
- [x] Stale comments updated (requestedBy Admin path)
- [x] Tests: platform login shape, v1 no key-requests, reviewedBy Superadmin

Let me also check platformAuth missing `kind` and `mustChangePassword` in login response for consistency with identity().

I'll implement everything now.

Implementing WP8: removing the broken v1 key-request route, normalizing the Superadmin login shape, fixing platform session redirects, updating comments, and adding tests.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/v1/index.js",
  "oldString": "import adminRouter from \"./admin.routes.js\";\nimport analyticsRouter from \"./analytics.routes.js\";\nimport apiKeyRequestRouter from \"./apiKeyRequest.routes.js\";\nimport { bankScope } from \"../../middlewares/bankScope.middleware.js\";",
  "newString": "import adminRouter from \"./admin.routes.js\";\nimport analyticsRouter from \"./analytics.routes.js\";\nimport { bankScope } from \"../../middlewares/bankScope.middleware.js\";"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/v1/index.js",
  "oldString": "v1Router.use(\"/analytics\", analyticsRouter);\n// Bank admin → superadmin API key request flow (bank-scoped via bankName).\nv1Router.use(\"/api-key-requests\", apiKeyRequestRouter);\nv1Router.get(\"/auth/me\", getme);",
  "newString": "v1Router.use(\"/analytics\", analyticsRouter);\n// API key requests live on JWT /api/admin/api-key-requests (WP4/WP8).\n// The old /v1/api-key-requests path is removed — it used authorize(\"admin\")\n// while resolveStaffUser always sets role \"staff\", so every call 403'd.\nv1Router.get(\"/auth/me\", getme);"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: bash**

**Input:**
```json
{
  "command": "rm /home/gamp/Desktop/cue/backend/src/routes/v1/apiKeyRequest.routes.js"
}
```

**Output:**
```
(no output)
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/platform/platformAuth.controller.js",
  "oldString": "    return sendSuccess(res, {\n      statusCode: 200,\n      message: \"Login successful\",\n      data: {\n        staff: {\n          id: superadmin._id,\n          name: superadmin.name,\n          email: superadmin.email,\n          role: \"superadmin\",\n        },\n        token,\n      },\n    });",
  "newString": "    // Same identity key as bank logins (`user`) so AuthContext.toAuth\n    // and GET /auth/me share one shape. Superadmin has no bank/branch.\n    return sendSuccess(res, {\n      statusCode: 200,\n      message: \"Login successful\",\n      data: {\n        user: {\n          id: superadmin._id,\n          name: superadmin.name,\n          email: superadmin.email,\n          role: \"superadmin\",\n          kind: \"superadmin\",\n          mustChangePassword: !!superadmin.mustChangePassword,\n        },\n        token,\n      },\n    });"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/platform/apiKey.routes.js",
  "oldString": " * Bank admins submit ApiKeyRequests instead (see routes/v1/apiKeyRequest.routes.js).",
  "newString": " * Bank admins submit ApiKeyRequests on JWT /api/admin/api-key-requests\n * (routes/adminApiKeyRequest.routes.js) instead."
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/models/apiKeyRequest.model.js",
  "oldString": " * 1. Bank admin (admin role, via API-key auth) POSTs a request with\n *    label, scopes, rateLimit. bankName is forced from their API key.",
  "newString": " * 1. Bank admin (Admin JWT) POSTs a request with label, scopes, rateLimit.\n *    bankName is forced from Admin.bank (JWT /api/admin/api-key-requests)."
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js",
  "oldString": " * Bank admins never call these endpoints; they submit ApiKeyRequests instead.",
  "newString": " * Bank admins never call these endpoints; they submit ApiKeyRequests on\n * JWT /api/admin/api-key-requests instead."
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/features/auth/ProtectedRoute.jsx",
  "oldString": "  if (!isAuthenticated) {\n    return <Navigate to=\"/\" replace state={{ from: location.pathname }} />;\n  }",
  "newString": "  if (!isAuthenticated) {\n    // Platform console signs in at its own login page (WP8).\n    if (location.pathname.startsWith(\"/platform\")) {\n      return (\n        <Navigate\n          to=\"/platform/login\"\n          replace\n          state={{ from: location.pathname }}\n        />\n      );\n    }\n    return <Navigate to=\"/\" replace state={{ from: location.pathname }} />;\n  }"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 15.0s)

_Thinking:_

Continue with AuthContext interceptor for superadmin session expired redirect, AuthContext comment about platform login shape, and tests. Also update AuthContext login identity handling - it already accepts `payload.data?.user || payload.data?.staff`, so platform login now returns `user` - good.

Update AuthContext comment about platform login wrapping under `staff`.

Updating AuthContext session-expired redirect for superadmin and the login-shape comment.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/features/auth/AuthContext.jsx",
  "newString": "    const payload = await fn(credentials);\n    const { token } = payload.data || {};\n    // All logins wrap identity under `user` (platform included since WP8).\n    const identity = payload.data?.user || payload.data?.staff;",
  "oldString": "    const payload = await fn(credentials);\n    const { token } = payload.data || {};\n    // Platform login wraps identity under `staff`; bank logins use `user`.\n    const identity = payload.data?.user || payload.data?.staff;"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/features/auth/AuthContext.jsx",
  "newString": "const AuthInterceptor = ({ setAuth }) => {\n  const navigate = useNavigate();\n\n  useEffect(() => {\n    registerUnauthorizedHandler(() => {\n      setAuth(null);\n      // Superadmin session-expiry returns to the platform login (WP8);\n      // bank roles land on the marketing home with the shared notice path.\n      // Role is not available after setAuth(null) — detect via localStorage.\n      let wasSuperadmin = false;\n      try {\n        const raw = localStorage.getItem(\"cue_auth\");\n        wasSuperadmin = raw && JSON.parse(raw)?.role === \"superadmin\";\n      } catch {\n        wasSuperadmin = false;\n      }\n      if (wasSuperadmin) {\n        navigate(\"/platform/login\", {\n          replace: true,\n          state: { sessionExpired: true },\n        });\n      } else {\n        navigate(\"/\", { replace: true });\n      }\n    });\n\n    return () => registerUnauthorizedHandler(null);\n  }, [navigate, setAuth]);\n\n  return null;\n};",
  "oldString": "const AuthInterceptor = ({ setAuth }) => {\n  const navigate = useNavigate();\n\n  useEffect(() => {\n    registerUnauthorizedHandler(() => {\n      setAuth(null);\n      navigate(\"/\", { replace: true });\n    });\n\n    return () => registerUnauthorizedHandler(null);\n  }, [navigate, setAuth]);\n\n  return null;\n};"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/platform/platformUsage.controller.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/platform/platformUsage.controller.js</path>
<type>file</type>
<content>
1: import ApiKey from "../../models/apiKey.model.js";
2: import ApiKeyUsage from "../../models/apiKeyUsage.model.js";
3: import ApiKeyRequest from "../../models/apiKeyRequest.model.js";
4: import { sendSuccess } from "../../utils/response.js";
5: import { usageDateKey } from "../../utils/keyWrap.js";
6: 
7: /**
8:  * Platform usage controller — API usage monitoring for superadmin.
9:  *
10:  * Data sources:
11:  * - ApiKey.requestCount        → lifetime total per key
12:  * - ApiKeyUsage {apiKey,date}  → daily buckets for charts
13:  * - ApiKeyRequest              → pending request counts
14:  */
15: 
16: /**
17:  * GET /api/platform/overview
18:  * High-level platform stats for the Overview tab.
19:  */
20: export const getPlatformOverview = async (req, res, next) => {
21:   try {
22:     const today = usageDateKey();
23:     const sevenDaysAgo = usageDateKey(
24:       new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
25:     );
26: 
27:     const [totalKeys, activeKeys, pendingRequests, todayUsage, weekUsage] =
28:       await Promise.all([
29:         ApiKey.countDocuments(),
30:         ApiKey.countDocuments({ isActive: true }),
31:         ApiKeyRequest.countDocuments({ status: "pending" }),
32:         ApiKeyUsage.aggregate([
33:           { $match: { date: today } },
34:           { $group: { _id: null, total: { $sum: "$count" } } },
35:         ]),
36:         ApiKeyUsage.aggregate([
37:           { $match: { date: { $gte: sevenDaysAgo, $lte: today } } },
38:           { $group: { _id: null, total: { $sum: "$count" } } },
39:         ]),
40:       ]);
41: 
42:     return sendSuccess(res, {
43:       statusCode: 200,
44:       message: "Platform overview fetched",
45:       data: {
46:         totalKeys,
47:         activeKeys,
48:         suspendedKeys: totalKeys - activeKeys,
49:         pendingRequests,
50:         requestsToday: todayUsage[0]?.total || 0,
51:         requestsLast7Days: weekUsage[0]?.total || 0,
52:       },
53:     });
54:   } catch (error) {
55:     next(error);
56:   }
57: };
58: 
59: /**
60:  * GET /api/platform/usage?days=7
61:  * Daily request totals for the last N days (default 7),
62:  * plus a per-key breakdown for the same window.
63:  */
64: export const getPlatformUsage = async (req, res, next) => {
65:   try {
66:     const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);
67:     const end = new Date();
68:     const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
69:     const startKey = usageDateKey(start);
70:     const endKey = usageDateKey(end);
71: 
72:     const [daily, byKey] = await Promise.all([
73:       ApiKeyUsage.aggregate([
74:         { $match: { date: { $gte: startKey, $lte: endKey } } },
75:         { $group: { _id: "$date", total: { $sum: "$count" } } },
76:         { $sort: { _id: 1 } },
77:       ]),
78:       ApiKeyUsage.aggregate([
79:         { $match: { date: { $gte: startKey, $lte: endKey } } },
80:         { $group: { _id: "$apiKey", total: { $sum: "$count" } } },
81:         { $sort: { total: -1 } },
82:         { $limit: 50 },
83:       ]),
84:     ]);
85: 
86:     // Resolve key metadata for the per-key breakdown.
87:     const keyIds = byKey.map((e) => e._id);
88:     const keyDocs = await ApiKey.find({ _id: { $in: keyIds } })
89:       .select("bankName label keyPrefix isActive requestCount")
90:       .lean();
91:     const keyById = Object.fromEntries(keyDocs.map((k) => [String(k._id), k]));
92: 
93:     const byKeyWithMeta = byKey.map((entry) => ({
94:       apiKey: entry._id,
95:       requests: entry.total,
96:       bankName: keyById[String(entry._id)]?.bankName || "Unknown",
97:       label: keyById[String(entry._id)]?.label || "",
98:       keyPrefix: keyById[String(entry._id)]?.keyPrefix || "",
99:       isActive: keyById[String(entry._id)]?.isActive ?? null,
100:       lifetimeRequests: keyById[String(entry._id)]?.requestCount || 0,
101:     }));
102: 
103:     return sendSuccess(res, {
104:       statusCode: 200,
105:       message: "Usage fetched",
106:       data: {
107:         days,
108:         startDate: startKey,
109:         endDate: endKey,
110:         daily: daily.map((d) => ({ date: d._id, requests: d.total })),
111:         byKey: byKeyWithMeta,
112:       },
113:     });
114:   } catch (error) {
115:     next(error);
116:   }
117: };

(End of file - total 117 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js",
  "limit": 50,
  "offset": 70
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js</path>
<type>file</type>
<content>
70:  */
71: const loginAgainst = async (Model, kind, req, res, next) => {
72:   try {
73:     if (!runValidation(req, res)) return;
74: 
75:     const { email, password } = req.body;
76:     const doc = await Model.findOne({ email: email.toLowerCase() }).select(
77:       "+password",
78:     );
79: 
80:     if (!doc || doc.isActive === false) {
81:       return sendError(res, { statusCode: 401, message: "Invalid credentials" });
82:     }
83: 
84:     const isMatch = await doc.comparePassword(password);
85:     if (!isMatch) {
86:       return sendError(res, { statusCode: 401, message: "Invalid credentials" });
87:     }
88: 
89:     return sendSuccess(res, {
90:       statusCode: 200,
91:       message: "Login successful",
92:       data: {
93:         user: identity(doc, kind),
94:         token: issueToken(doc, kind),
95:       },
96:     });
97:   } catch (error) {
98:     next(error);
99:   }
100: };
101: 
102: /** POST /api/auth/login/staff */
103: export const loginStaff = (req, res, next) =>
104:   loginAgainst(Staff, "staff", req, res, next);
105: 
106: /** POST /api/auth/login/manager */
107: export const loginManager = (req, res, next) =>
108:   loginAgainst(Manager, "manager", req, res, next);
109: 
110: /** POST /api/auth/login/admin */
111: export const loginAdmin = (req, res, next) =>
112:   loginAgainst(Admin, "admin", req, res, next);
113: 
114: /**
115:  * POST /api/auth/register/admin — PUBLIC, instant.
116:  * Body: { name, email, password, bankName }
117:  * Creates an Admin and logs them in immediately (mustChangePassword: false —
118:  * they chose their own password).
119:  */

(Showing lines 70-119 of 439. Use offset=120 to continue.)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/frontend/src",
  "pattern": "data\\.staff|payload\\.data\\?\\.staff"
}
```

**Output:**
```
Found 2 matches
/home/gamp/Desktop/cue/frontend/src/features/auth/AuthContext.jsx:
  Line 122:     const identity = payload.data?.user || payload.data?.staff;


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerOverview.jsx:
  Line 33:       setPerformance(perfRes.data.staffPerformance || []);

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/features/auth/authApi.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/features/auth/authApi.js</path>
<type>file</type>
<content>
1: import { apiClient } from "../../lib/apiClient";
2: 
3: /**
4:  * Auth API — JWT logins for all four kinds (Phase 13 WP6/WP7).
5:  *
6:  * - staff/manager/admin → POST /auth/login/:kind  (bank dashboard)
7:  * - superadmin          → POST /platform/login    (platform console)
8:  * - change-password     → POST /auth/change-password (any kind, Bearer)
9:  * - me                  → GET  /auth/me
10:  */
11: 
12: export const loginStaff = (credentials) =>
13:   apiClient.post("/auth/login/staff", credentials);
14: 
15: export const loginManager = (credentials) =>
16:   apiClient.post("/auth/login/manager", credentials);
17: 
18: export const loginAdmin = (credentials) =>
19:   apiClient.post("/auth/login/admin", credentials);
20: 
21: export const loginPlatform = (credentials) =>
22:   apiClient.post("/platform/login", credentials);
23: 
24: export const getAuthMe = (token) => apiClient.get("/auth/me", { token });
25: 
26: export const changePassword = (data, token) =>
27:   apiClient.post("/auth/change-password", data, { token });

(End of file - total 27 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/tests/middlewares/modelForToken.test.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/tests/middlewares/modelForToken.test.js</path>
<type>file</type>
<content>
1: import { describe, it, expect, vi, beforeEach } from "vitest";
2: import jwt from "jsonwebtoken";
3: import { modelForToken, authorize } from "../../src/middlewares/auth.middleware.js";
4: 
5: const mockRes = () => {
6:   const res = {};
7:   res.status = vi.fn().mockReturnValue(res);
8:   res.json = vi.fn().mockReturnValue(res);
9:   return res;
10: };
11: 
12: const mockNext = vi.fn();
13: 
14: /**
15:  * modelForToken — picks which of the four collections a JWT refers to.
16:  *
17:  * After the split, every login signs { id, kind, role } where kind and
18:  * role are the same string. Old tokens that only have `role` still work
19:  * (fallback), unknown kinds return null (protect → 401).
20:  */
21: describe("modelForToken", () => {
22:   it("resolves kind=staff to the Staff model", () => {
23:     const Model = modelForToken({ id: "x", kind: "staff", role: "staff" });
24:     expect(Model).toBeTruthy();
25:     expect(Model.modelName).toBe("Staff");
26:   });
27: 
28:   it("resolves kind=admin to the Admin model", () => {
29:     const Model = modelForToken({ id: "x", kind: "admin", role: "admin" });
30:     expect(Model.modelName).toBe("Admin");
31:   });
32: 
33:   it("resolves kind=manager to the Manager model", () => {
34:     const Model = modelForToken({ id: "x", kind: "manager", role: "manager" });
35:     expect(Model.modelName).toBe("Manager");
36:   });
37: 
38:   it("resolves kind=superadmin to the Superadmin model", () => {
39:     const Model = modelForToken({ id: "x", kind: "superadmin", role: "superadmin" });
40:     expect(Model.modelName).toBe("Superadmin");
41:   });
42: 
43:   it("falls back to role claim for pre-split tokens (no kind)", () => {
44:     const Model = modelForToken({ id: "x", role: "admin" });
45:     expect(Model.modelName).toBe("Admin");
46:   });
47: 
48:   it("returns null for unknown kind", () => {
49:     expect(modelForToken({ id: "x", kind: "customer", role: "customer" })).toBeNull();
50:   });
51: 
52:   it("returns null for missing payload", () => {
53:     expect(modelForToken(null)).toBeNull();
54:     expect(modelForToken(undefined)).toBeNull();
55:     expect(modelForToken({})).toBeNull();
56:   });
57: });
58: 
59: describe("authorize — four kinds (post-split roles)", () => {
60:   beforeEach(() => {
61:     vi.clearAllMocks();
62:   });
63: 
64:   it("allows each kind on its own route", () => {
65:     for (const kind of ["staff", "admin", "manager", "superadmin"]) {
66:       mockNext.mockClear();
67:       authorize(kind)({ user: { id: "1" }, role: kind }, mockRes(), mockNext);
68:       expect(mockNext).toHaveBeenCalled();
69:     }
70:   });
71: 
72:   it("rejects manager from admin-only routes", () => {
73:     authorize("admin")({ user: { id: "1" }, role: "manager" }, mockRes(), mockNext);
74:     expect(mockNext).not.toHaveBeenCalled();
75:   });
76: 
77:   it("rejects staff from manager+admin routes", () => {
78:     authorize("admin", "manager")(
79:       { user: { id: "1" }, role: "staff" },
80:       mockRes(),
81:       mockNext,
82:     );
83:     expect(mockNext).not.toHaveBeenCalled();
84:   });
85: });

(End of file - total 85 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/middlewares/apiKey.middleware.js",
  "limit": 80
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/middlewares/apiKey.middleware.js</path>
<type>file</type>
<content>
1: import ApiKey from "../models/apiKey.model.js";
2: import ApiKeyUsage from "../models/apiKeyUsage.model.js";
3: import { sendError } from "../utils/response.js";
4: import { usageDateKey } from "../utils/keyWrap.js";
5: 
6: /**
7:  * API Key Authentication Middleware
8:  *
9:  * Authenticates requests using the X-API-Key header.
10:  * On success, attaches `req.apiKey` (the ApiKey document) and `req.bankName`
11:  * to the request for downstream controllers to use.
12:  *
13:  * Usage:
14:  *   router.get("/endpoint", authenticateApiKey, requireScope("tickets:read"), handler)
15:  *
16:  * The key is looked up by hashing it with bcrypt and comparing against stored hashes.
17:  * This is intentionally slow (bcrypt) to prevent timing attacks.
18:  *
19:  * After authentication, we update `lastUsedAt` fire-and-forget (don't await).
20:  */
21: 
22: export const authenticateApiKey = async (req, res, next) => {
23:   try {
24:     const apiKey = req.headers["x-api-key"];
25: 
26:     if (!apiKey) {
27:       return sendError(res, {
28:         statusCode: 401,
29:         message: "API key required. Pass it via the X-API-Key header.",
30:       });
31:     }
32: 
33:     // Verify the key against all stored hashes.
34:     // Returns the matching ApiKey document or null.
35:     const keyDoc = await ApiKey.verifyKey(apiKey);
36: 
37:     if (!keyDoc) {
38:       return sendError(res, {
39:         statusCode: 401,
40:         message: "Invalid or revoked API key",
41:       });
42:     }
43: 
44:     // Check if the key has expired
45:     if (keyDoc.expiresAt && keyDoc.expiresAt < new Date()) {
46:       return sendError(res, {
47:         statusCode: 401,
48:         message: "API key has expired",
49:       });
50:     }
51: 
52:     // Check if the key is active (not disabled)
53:     if (!keyDoc.isActive) {
54:       return sendError(res, {
55:         statusCode: 403,
56:         message: "API key has been disabled. Contact support.",
57:       });
58:     }
59: 
60:     // Check if we're in the grace period (key was rotated, old key still valid temporarily)
61:     if (keyDoc.gracePeriodEndsAt && keyDoc.gracePeriodEndsAt < new Date()) {
62:       return sendError(res, {
63:         statusCode: 401,
64:         message: "API key has expired due to rotation. Use the new key.",
65:       });
66:     }
67: 
68:     // Attach key info to request for downstream use
69:     req.apiKey = keyDoc;
70:     req.bankName = keyDoc.bankName;
71: 
72:     // Update lastUsedAt + usage counters fire-and-forget (non-blocking).
73:     // We use updateOne instead of save to avoid triggering middleware.
74:     // Usage tracking:
75:     //   - ApiKey.requestCount  → lifetime total (cheap $inc)
76:     //   - ApiKeyUsage          → daily bucket {apiKey, date:"YYYY-MM-DD"} for charts
77:     const today = usageDateKey();
78:     ApiKey.updateOne(
79:       { _id: keyDoc._id },
80:       {

(Showing lines 1-80 of 216. Use offset=81 to continue.)
</content>
```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 41.0s)

_Thinking:_

There's a bug in my AuthInterceptor - I call setAuth(null) which triggers localStorage removal in useEffect, but I try to read localStorage AFTER setAuth(null). Actually setAuth is async in React - the state update is batched, and the useEffect that removes localStorage runs after re-render. So when the handler runs synchronously after setAuth(null), localStorage still has the old value. That should work.

Wait, but I wrote:
```
setAuth(null);
// ... read localStorage
```
setAuth(null) schedules a re-render. localStorage.removeItem happens in useEffect after re-render. So at the moment of reading, localStorage still has the data. Good.

Actually cleaner would be to read localStorage BEFORE setAuth(null). Let me reorder for clarity.

Also PlatformLogin already handles sessionExpired state - good.

Now I need to write WP8 tests. What tests make sense without Mongo:
1. Platform login response shape - needs mocking Superadmin model
2. Platform route authorization - already have superadmin.authorize.test.js
3. reviewKeyRequest sets reviewedBy - needs mock
4. Verify v1 doesn't export api-key-requests - can check v1Router stack
5. Superadmin model has no bank - already in fourModelSplit

Let me write a platform test file covering:
- loginSuperadmin returns user (not staff) and token with kind superadmin - mock Superadmin
- platform router stack: login open, rest protected - harder without supertest
- Can import platformRouter and inspect layers

Also check getPlatformMe vs getAuthMe - fine.

Fix AuthInterceptor order - read localStorage first.

Also check: PlatformLogin uses loginPlatform which returns { auth, path } from login() - it doesn't use return value, navigates itself. Fine.

PlatformDashboard handleLogout navigates to /platform/login - good.

For ProtectedRoute role mismatch on /platform - if bank user hits /platform, goes to "/" - OK.

Write tests:
1. backend/tests/platform/superadmin.platform.test.js covering:
   - loginSuperadmin mock Superadmin → data.user not data.staff, jwt kind superadmin
   - reviewKeyRequest sets reviewedBy to req.user._id (mock models)
   - v1Router no longer has /api-key-requests layerLet me also check if there's an issue with AuthInterceptor reading localStorage after setAuth - I'll fix order.

Also update BUILD_PLAN WP8 checklist.

And check PlatformLogin comment about staff wrapper - already updated in AuthContext.

Check if platform login used `data.staff` elsewhere in frontend tests - no.

Let me also verify identity in getAuthMe for superadmin works - identity() with kind superadmin doesn't set bank/branch - fine.

mustChangePassword for superadmin - Superadmin model has it. platformAuth returns it now.

One issue: AuthContext toAuth on getAuthMe refresh - for superadmin identity has role and kind. Good.

Let me write tests and fix interceptor, update BUILD_PLAN.

Fixing interceptor read order, then adding WP8 tests and updating the plan.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/features/auth/AuthContext.jsx",
  "newString": "    registerUnauthorizedHandler(() => {\n      // Superadmin session-expiry returns to /platform/login with the\n      // expired notice; bank roles land on the marketing home (WP8).\n      // Read role BEFORE clearing — setAuth(null) wipes storage.\n      let wasSuperadmin = false;\n      try {\n        const raw = localStorage.getItem(\"cue_auth\");\n        wasSuperadmin = !!raw && JSON.parse(raw)?.role === \"superadmin\";\n      } catch {\n        wasSuperadmin = false;\n      }\n      setAuth(null);\n      if (wasSuperadmin) {\n        navigate(\"/platform/login\", {\n          replace: true,\n          state: { sessionExpired: true },\n        });\n      } else {\n        navigate(\"/\", { replace: true });\n      }\n    });",
  "oldString": "    registerUnauthorizedHandler(() => {\n      setAuth(null);\n      // Superadmin session-expiry returns to the platform login (WP8);\n      // bank roles land on the marketing home with the shared notice path.\n      // Role is not available after setAuth(null) — detect via localStorage.\n      let wasSuperadmin = false;\n      try {\n        const raw = localStorage.getItem(\"cue_auth\");\n        wasSuperadmin = raw && JSON.parse(raw)?.role === \"superadmin\";\n      } catch {\n        wasSuperadmin = false;\n      }\n      if (wasSuperadmin) {\n        navigate(\"/platform/login\", {\n          replace: true,\n          state: { sessionExpired: true },\n        });\n      } else {\n        navigate(\"/\", { replace: true });\n      }\n    });"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: write**

**Input:**
```json
{
  "content": "import { describe, it, expect, vi, beforeEach } from \"vitest\";\nimport jwt from \"jsonwebtoken\";\nimport {\n  loginSuperadmin,\n  getPlatformMe,\n} from \"../../src/controllers/platform/platformAuth.controller.js\";\nimport { reviewKeyRequest } from \"../../src/controllers/platform/platformKeyRequest.controller.js\";\nimport Superadmin from \"../../src/models/superadmin.model.js\";\nimport ApiKeyRequest from \"../../src/models/apiKeyRequest.model.js\";\nimport ApiKey from \"../../src/models/apiKey.model.js\";\nimport v1Router from \"../../src/routes/v1/index.js\";\n\nprocess.env.JWT_SECRET = process.env.JWT_SECRET || \"test-secret\";\n\nconst mockRes = () => {\n  const res = {};\n  res.status = vi.fn().mockReturnValue(res);\n  res.json = vi.fn().mockReturnValue(res);\n  return res;\n};\n\n/**\n * Platform surface — Superadmin model everywhere (Phase 13 WP8).\n *\n * - login issues { id, kind: \"superadmin\", role: \"superadmin\" } JWT\n * - response wraps identity under `user` (same key as bank logins)\n * - getPlatformMe returns superadmin profile from protect's req.user\n * - reviewKeyRequest stamps reviewedBy with the Superadmin id\n * - legacy v1 /api-key-requests router is gone (authorize(\"admin\")\n *   could never pass under resolveStaffUser's role \"staff\")\n */\ndescribe(\"platformAuth — Superadmin model\", () => {\n  beforeEach(() => {\n    vi.clearAllMocks();\n  });\n\n  it(\"loginSuperadmin returns user identity + superadmin JWT\", async () => {\n    const fake = {\n      _id: \"64b000000000000000000001\",\n      name: \"Platform Ops\",\n      email: \"superadmin@cue.dev\",\n      isActive: true,\n      mustChangePassword: false,\n      comparePassword: vi.fn().mockResolvedValue(true),\n    };\n    vi.spyOn(Superadmin, \"findOne\").mockReturnValue({\n      select: vi.fn().mockResolvedValue(fake),\n    });\n\n    const req = { body: { email: \"superadmin@cue.dev\", password: \"secret\" } };\n    const res = mockRes();\n    const next = vi.fn();\n\n    await loginSuperadmin(req, res, next);\n\n    expect(next).not.toHaveBeenCalled();\n    const payload = res.json.mock.calls[0][0];\n    expect(payload.data.user).toMatchObject({\n      email: \"superadmin@cue.dev\",\n      role: \"superadmin\",\n      kind: \"superadmin\",\n    });\n    expect(payload.data.staff).toBeUndefined();\n\n    const claims = jwt.verify(payload.data.token, process.env.JWT_SECRET);\n    expect(claims.kind).toBe(\"superadmin\");\n    expect(claims.role).toBe(\"superadmin\");\n    expect(claims.id).toBe(fake._id);\n  });\n\n  it(\"loginSuperadmin rejects bad password with generic 401\", async () => {\n    const fake = {\n      _id: \"64b000000000000000000001\",\n      email: \"superadmin@cue.dev\",\n      isActive: true,\n      comparePassword: vi.fn().mockResolvedValue(false),\n    };\n    vi.spyOn(Superadmin, \"findOne\").mockReturnValue({\n      select: vi.fn().mockResolvedValue(fake),\n    });\n\n    const res = mockRes();\n    await loginSuperadmin(\n      { body: { email: \"superadmin@cue.dev\", password: \"wrong\" } },\n      res,\n      vi.fn(),\n    );\n    expect(res.status).toHaveBeenCalledWith(401);\n  });\n\n  it(\"getPlatformMe returns the protect-loaded Superadmin profile\", async () => {\n    const res = mockRes();\n    await getPlatformMe(\n      {\n        user: {\n          _id: \"64b000000000000000000001\",\n          name: \"Platform Ops\",\n          email: \"superadmin@cue.dev\",\n        },\n        role: \"superadmin\",\n      },\n      res,\n      vi.fn(),\n    );\n    const payload = res.json.mock.calls[0][0];\n    expect(payload.data).toMatchObject({\n      email: \"superadmin@cue.dev\",\n      role: \"superadmin\",\n    });\n  });\n});\n\ndescribe(\"platformKeyRequest — reviewedBy is Superadmin\", () => {\n  beforeEach(() => {\n    vi.clearAllMocks();\n  });\n\n  it(\"approve stamps reviewedBy with the superadmin user id\", async () => {\n    const superadminId = \"64b000000000000000000001\";\n    const request = {\n      _id: \"64b0000000000000000000aa\",\n      bankName: \"acme\",\n      status: \"pending\",\n      scopes: [\"tickets:read\"],\n      rateLimit: 100,\n      label: \"prod\",\n      save: vi.fn().mockResolvedValue(true),\n    };\n    vi.spyOn(ApiKeyRequest, \"findById\").mockResolvedValue(request);\n    vi.spyOn(ApiKey, \"generateKey\").mockResolvedValue({\n      rawKey: \"cue_raw\",\n      keyHash: \"hash\",\n      keyPrefix: \"cue_abcd\",\n    });\n    vi.spyOn(ApiKey, \"create\").mockResolvedValue({\n      _id: \"64b0000000000000000000bb\",\n      keyPrefix: \"cue_abcd\",\n      scopes: [\"tickets:read\"],\n      rateLimit: 100,\n    });\n\n    const res = mockRes();\n    const next = vi.fn();\n    await reviewKeyRequest(\n      {\n        params: { id: \"64b0000000000000000000aa\" },\n        body: { action: \"approve\", reviewNote: \"ok\" },\n        user: { _id: superadminId, role: \"superadmin\" },\n      },\n      res,\n      next,\n    );\n\n    expect(next).not.toHaveBeenCalled();\n    expect(request.reviewedBy).toBe(superadminId);\n    expect(request.status).toBe(\"approved\");\n    expect(request.encryptedRawKey).toBeTruthy();\n    expect(request.save).toHaveBeenCalled();\n    const payload = res.json.mock.calls[0][0];\n    expect(payload.data.key).toBe(\"cue_raw\");\n  });\n\n  it(\"reject stamps reviewedBy and does not create a key\", async () => {\n    const request = {\n      _id: \"64b0000000000000000000aa\",\n      bankName: \"acme\",\n      status: \"pending\",\n      save: vi.fn().mockResolvedValue(true),\n    };\n    vi.spyOn(ApiKeyRequest, \"findById\").mockResolvedValue(request);\n    const createSpy = vi.spyOn(ApiKey, \"create\");\n\n    const res = mockRes();\n    await reviewKeyRequest(\n      {\n        params: { id: \"64b0000000000000000000aa\" },\n        body: { action: \"reject\", reviewNote: \"no\" },\n        user: { _id: \"64b000000000000000000001\", role: \"superadmin\" },\n      },\n      res,\n      vi.fn(),\n    );\n\n    expect(request.status).toBe(\"rejected\");\n    expect(request.reviewedBy).toBe(\"64b000000000000000000001\");\n    expect(createSpy).not.toHaveBeenCalled();\n  });\n});\n\ndescribe(\"v1 router — api-key-requests removed (WP8)\", () => {\n  it(\"does not mount /api-key-requests\", () => {\n    const stack = (v1Router.stack || []).map((layer) => ({\n      name: layer.name,\n      path: layer.route?.path,\n      regexp: String(layer.regexp || \"\"),\n    }));\n    const mounts = stack.filter(\n      (l) => l.path && String(l.path).includes(\"api-key-request\"),\n    );\n    const regexpHits = stack.filter((l) =>\n      l.regexp.includes(\"api-key-request\"),\n    );\n    expect(mounts).toHaveLength(0);\n    expect(regexpHits).toHaveLength(0);\n  });\n});\n",
  "filePath": "/home/gamp/Desktop/cue/backend/tests/platform/superadmin.platform.test.js"
}
```

**Output:**
```
Wrote file successfully.
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/BUILD_PLAN.md",
  "limit": 40,
  "offset": 115
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/BUILD_PLAN.md</path>
<type>file</type>
<content>
115: - [x] Controller defense-in-depth: `denyNonStaffServe` in callNext/call/complete/skip/my-stats/my-history (works on both JWT and v1 paths)
116: - [x] v1 requireScope wiring: tickets write/read, branches:read (branch/queue/counter/board), staff:read, analytics:read
117: - [x] v1 role authorize removed where resolveStaffUser always sets role "staff" (would 403 every API-key request); controller accepts `req.apiKey` integration path for admin overview
118: 
119: ### WP6 — Dashboard moves off v1 onto JWT `/api/*` surface ✅
120: ### WP7 — Frontend: 4 login pages, kill demo switcher/API-key mode ✅
121: ### WP8 — Platform console adjustments (Superadmin model everywhere) ⏳
122: ### WP9 — Docs, env cleanup, full test pass ⏳
123: 
124: **WP6 checklist:**
125: - [x] Backend: `GET /api/admin/overview` (protect + authorize("admin")) — bank scope from `Admin.bank`
126: - [x] `getAdminOverview` accepts JWT path: `bank = req.bankName || req.user?.bank`
127: - [x] Branch create/list/update/delete JWT bank-scoping (`Admin.bank` when no API key)
128: - [x] Analytics `canAccessBranch` uses `Admin.bank` for JWT admin
129: - [x] Frontend API modules migrated off `v1Api` → `apiClient` + Bearer `token`:
130:   - `manageApi.js`, `adminApi.js`, `apiKeyRequestApi.js`, `ticketsApi.js`
131:   - `useCounterOperations`, `useMyCounter`, `useMyStats`, `useTicketHistory`
132:   - `useMyTicket` (public lookup stays unauthenticated; cancel uses JWT)
133: - [x] All StaffHome components pass `auth.token` (StaffSubTab, CounterSubTab, CounterConsole, ManagerOverview, AdminOverview, TicketHistory)
134: - [x] Staff list pagination shape: `res.data` array (paginatedResponse spread)
135: 
136: **WP7 checklist:**
137: - [x] JWT-only `AuthContext` — `login(staff|manager|admin|superadmin)`, `getAuthMe` refresh, no demo auto-init, no `VITE_DEMO_API_KEY`, no `switchUser`
138: - [x] Four login surfaces: `/login/staff`, `/login/manager`, `/login/admin` (+ existing `/platform/login`)
139: - [x] `ProtectedRoute` requires `auth.token` (not apiKey); role allow-list still enforced
140: - [x] Navbar: demo UserSwitcher removed; signed-out “Sign in” → `/login/staff`
141: - [x] `authApi.changePassword` targets `POST /auth/change-password` with Bearer token (kind-aware, not Staff-only)
142: - [x] `mustChangePassword` force prompt on `/staff` + `clearMustChangePassword` after rotation
143: - [x] Counter open allows staff on their own assigned counter (symmetric with close)
144: - [x] LoginPage validates `kind` ∈ {staff, manager, admin}
145: - [x] Backend demo surface removed: `demo.controller.js`, `routes/v1/demo.routes.js`, `GET /api/v1/demo/users` mount
146: - [x] Guest ticket pages off v1 → public `/api/tickets*` + new `GET /api/queues/public` (no auth)
147: 
148: ---
149: 
150: ## Phase 1 — API Key Authentication ✅
151: 
152: **Goal:** Replace JWT-only auth with API key authentication for bank integrations.
153: 
154: **Ships:**

(Showing lines 115-154 of 594. Use offset=155 to continue.)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue",
  "pattern": "apiKeyRequest\\.routes|/v1/api-key-requests"
}
```

**Output:**
```
Found 4 matches
/home/gamp/Desktop/cue/backend/src/routes/v1/index.js:
  Line 57: // The old /v1/api-key-requests path is removed — it used authorize("admin")


/home/gamp/Desktop/cue/BUILD_PLAN.md:
  Line 498:   └─ Bank admin: POST /api/v1/api-key-requests to request a key

  Line 508: /api/v1/api-key-requests/* → API-key auth + authorize("admin") + bankScope

  Line 544: - [x] New v1 routes `apiKeyRequest.routes.js`:

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/features/auth/AuthContext.jsx",
  "limit": 70,
  "offset": 115
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/features/auth/AuthContext.jsx</path>
<type>file</type>
<content>
115:   const login = useCallback(async (kind, credentials) => {
116:     const fn = LOGIN_BY_KIND[kind];
117:     if (!fn) throw new Error(`Unknown login kind: ${kind}`);
118: 
119:     const payload = await fn(credentials);
120:     const { token } = payload.data || {};
121:     // All logins wrap identity under `user` (platform included since WP8).
122:     const identity = payload.data?.user || payload.data?.staff;
123:     if (!token || !identity) {
124:       throw new Error("Login response missing token or user");
125:     }
126: 
127:     const next = toAuth(token, identity);
128:     setAuth(next);
129:     return { auth: next, path: DEFAULT_AFTER_LOGIN[kind] || "/staff" };
130:   }, []);
131: 
132:   /** Superadmin convenience wrapper (kept for PlatformLogin). */
133:   const loginPlatformCreds = useCallback(
134:     (credentials) => login("superadmin", credentials),
135:     [login],
136:   );
137: 
138:   const logout = useCallback(() => setAuth(null), []);
139: 
140:   /**
141:    * Clear mustChangePassword after a successful rotation
142:    * (ChangePassword component calls this so the force prompt dismisses).
143:    */
144:   const clearMustChangePassword = useCallback(() => {
145:     setAuth((prev) =>
146:       prev ? { ...prev, mustChangePassword: false } : prev,
147:     );
148:   }, []);
149: 
150:   return (
151:     <AuthContext.Provider
152:       value={{
153:         auth,
154:         login,
155:         loginPlatform: loginPlatformCreds,
156:         logout,
157:         clearMustChangePassword,
158:       }}
159:     >
160:       {children}
161:       <AuthInterceptor setAuth={setAuth} />
162:     </AuthContext.Provider>
163:   );
164: };
165: 
166: const AuthInterceptor = ({ setAuth }) => {
167:   const navigate = useNavigate();
168: 
169:   useEffect(() => {
170:     registerUnauthorizedHandler(() => {
171:       // Superadmin session-expiry returns to /platform/login with the
172:       // expired notice; bank roles land on the marketing home (WP8).
173:       // Read role BEFORE clearing — setAuth(null) wipes storage.
174:       let wasSuperadmin = false;
175:       try {
176:         const raw = localStorage.getItem("cue_auth");
177:         wasSuperadmin = !!raw && JSON.parse(raw)?.role === "superadmin";
178:       } catch {
179:         wasSuperadmin = false;
180:       }
181:       setAuth(null);
182:       if (wasSuperadmin) {
183:         navigate("/platform/login", {
184:           replace: true,

(Showing lines 115-184 of 202. Use offset=185 to continue.)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/backend",
  "pattern": "requestedBy.*Staff|role.*superadmin"
}
```

**Output:**
```
Found 15 matches
/home/gamp/Desktop/cue/backend/src/controllers/platform/platformAuth.controller.js:
  Line 45:       { id: superadmin._id, kind: "superadmin", role: "superadmin" },

  Line 60:           role: "superadmin",

  Line 85:         role: req.role || "superadmin",


/home/gamp/Desktop/cue/backend/src/scripts/migrateSplitStaff.js:
  Line 16:  *   role "superadmin" → superadmins   (Superadmin model)


/home/gamp/Desktop/cue/backend/tests/middlewares/superadmin.authorize.test.js:
  Line 26:     const req = { user: { id: "1" }, role: "superadmin" };

  Line 33:     const req = { user: { id: "1" }, role: "superadmin" };

  Line 41:     const req = { user: { id: "1" }, role: "superadmin" };


/home/gamp/Desktop/cue/backend/tests/platform/superadmin.platform.test.js:
  Line 25:  * - login issues { id, kind: "superadmin", role: "superadmin" } JWT

  Line 60:       role: "superadmin",

  Line 67:     expect(claims.role).toBe("superadmin");

  Line 100:         role: "superadmin",

  Line 108:       role: "superadmin",

  Line 148:         user: { _id: superadminId, role: "superadmin" },

  Line 178:         user: { _id: "64b000000000000000000001", role: "superadmin" },


/home/gamp/Desktop/cue/backend/tests/middlewares/modelForToken.test.js:
  Line 39:     const Model = modelForToken({ id: "x", kind: "superadmin", role: "superadmin" });

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx",
  "limit": 40
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx</path>
<type>file</type>
<content>
1: import { useCallback, useEffect, useState } from "react";
2: import { motion } from "framer-motion";
3: import { useAuth } from "../../features/auth/AuthContext";
4: import {
5:   fetchAdminOverview,
6:   createBranch,
7: } from "../../features/staff/adminApi";
8: import {
9:   requestApiKey,
10:   fetchApiKeyRequests,
11:   revealApiKeyRequest,
12: } from "../../features/staff/apiKeyRequestApi";
13: import { ApiError } from "../../lib/apiClient";
14: import styles from "./StaffHome.module.css";
15: 
16: // Scopes a bank admin may request (admin scope is superadmin-only).
17: const REQUESTABLE_SCOPES = [
18:   "branches:read",
19:   "tickets:read",
20:   "tickets:write",
21:   "staff:read",
22:   "analytics:read",
23:   "webhooks:manage",
24: ];
25: 
26: /**
27:  * AdminOverview — cross-branch dashboard for bank-scoped admin role.
28:  * Shows all branches (this bank only), all managers with staff counts,
29:  * a form to create branches, and the API key request panel
30:  * (request new key + view status / one-time reveal).
31:  *
32:  * Manager creation form is deferred to WP4 (Manager model + dedicated
33:  * endpoint with temp password + invite links).
34:  */
35: const AdminOverview = () => {
36:   const { auth } = useAuth();
37:   const [data, setData] = useState(null);
38:   const [loading, setLoading] = useState(true);
39:   const [error, setError] = useState(null);
40: 

(Showing lines 1-40 of 385. Use offset=41 to continue.)
</content>
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "frontend/src/**/*Auth*"
}
```

**Output:**
```
/home/gamp/Desktop/cue/frontend/src/features/auth/AuthContext.jsx
```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 69.2s)

_Thinking:_

Update BUILD_PLAN WP8 checklist and run tests. Also check if AdminOverview comment about manager creation deferred to WP4 needs update - minor. Let me update BUILD_PLAN and run tests.

Updating the WP8 checklist and running tests.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/BUILD_PLAN.md",
  "newString": "### WP8 — Platform console adjustments (Superadmin model everywhere) ✅\n### WP9 — Docs, env cleanup, full test pass ⏳",
  "oldString": "### WP8 — Platform console adjustments (Superadmin model everywhere) ⏳\n### WP9 — Docs, env cleanup, full test pass ⏳"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/BUILD_PLAN.md",
  "newString": "- [x] Guest ticket pages off v1 → public `/api/tickets*` + new `GET /api/queues/public` (no auth)\n\n**WP8 checklist:**\n- [x] Platform login response identity key → `user` (matches bank logins); payload includes `role`/`kind`/`mustChangePassword`; JWT still `{ id, kind: \"superadmin\", role: \"superadmin\" }`\n- [x] Legacy `routes/v1/apiKeyRequest.routes.js` **removed** + unmounted from `v1/index.js` (`authorize(\"admin\")` always 403’d under `resolveStaffUser` role `\"staff\"`; dashboard uses JWT `/api/admin/api-key-requests`)\n- [x] Stale comments updated: platform api-key routes, platform key controller, `apiKeyRequest.model.js` → JWT admin path (requestedBy → Admin)\n- [x] `ProtectedRoute`: unauthenticated `/platform*` → `/platform/login` (not marketing home)\n- [x] `AuthInterceptor`: superadmin 401 → `/platform/login` with `sessionExpired` state (PlatformLogin already renders the notice)\n- [x] PlatformDashboard / platformApi / PlatformLogin already Superadmin-model + JWT-only (verified, no change)\n- [x] `reviewedBy` → Superadmin on platform approve/reject (tested)\n- [x] Tests: `tests/platform/superadmin.platform.test.js` — login shape + JWT kind, reject bad password, getPlatformMe, approve/reject stamp `reviewedBy`, v1 router has no `api-key-requests`\n- [x] authorize(\"superadmin\") isolation already covered by `superadmin.authorize.test.js` + `modelForToken.test.js`\n\n---",
  "oldString": "- [x] Guest ticket pages off v1 → public `/api/tickets*` + new `GET /api/queues/public` (no auth)\n\n---"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: bash**

**Input:**
```json
{
  "command": "npm test 2>&1",
  "workdir": "/home/gamp/Desktop/cue/backend",
  "timeout": 120000
}
```

**Output:**
```
npm notice run smart-queue-management-system@1.0.0 test
npm notice run vitest run

 RUN  v5.0.0 /home/gamp/Desktop/cue/backend


 Test Files  16 passed (16)
      Tests  123 passed (123)
   Start at  12:18:00
   Duration  39.20s (import 72%, transform 21%, tests 4%, worker 4%)

    Isolate  16 workers spawned · ~2.54s startup each (spawn + environment, per file)
             at least ~11.02s faster with isolate: false — reuses workers across files instead of one per file


```

**Tool: bash**

**Input:**
```json
{
  "command": "npm test 2>&1 && npm run build 2>&1",
  "workdir": "/home/gamp/Desktop/cue/frontend",
  "timeout": 120000
}
```

**Output:**
```
npm notice run frontend@0.0.0 test
npm notice run vitest run

 RUN  v5.0.0 /home/gamp/Desktop/cue/frontend


 Test Files  2 passed (2)
      Tests  8 passed (8)
   Start at  12:17:59
   Duration  28.06s (environment 73%, setup 12%, tests 8%, transform 4%, import 2%, worker 1%)

npm notice run frontend@0.0.0 build
npm notice run vite build
vite v8.2.2 building client environment for production...
transforming...
✓ 550 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                 0.54 kB │ gzip:  0.33 kB
dist/assets/SplitFlapBoard-CScboK_F.css         0.04 kB │ gzip:  0.06 kB
dist/assets/MotionBackground-EDPDeuNe.css       0.44 kB │ gzip:  0.27 kB
dist/assets/FlapUnit-DSD43QmB.css               0.70 kB │ gzip:  0.38 kB
dist/assets/Contact-Cd2pagkb.css                2.39 kB │ gzip:  0.84 kB
dist/assets/LoginPage-B4Vixr4H.css              2.47 kB │ gzip:  0.92 kB
dist/assets/NearestBranch-Devvl3jF.css          2.75 kB │ gzip:  0.90 kB
dist/assets/Branch-CqJodSU_.css                 3.12 kB │ gzip:  0.96 kB
dist/assets/Kiosk-CIx0xwPK.css                  3.56 kB │ gzip:  0.98 kB
dist/assets/Boards-CI7PsP93.css                 3.78 kB │ gzip:  1.22 kB
dist/assets/TicketPage-BmnPbBSs.css             4.13 kB │ gzip:  1.23 kB
dist/assets/Appointment-Db7QMx4x.css            4.26 kB │ gzip:  1.16 kB
dist/assets/NotFound-BZmeblkS.css               4.36 kB │ gzip:  1.58 kB
dist/assets/Board-DcZVuyKg.css                  5.39 kB │ gzip:  1.58 kB
dist/assets/index-xkllxhr3.css                  6.57 kB │ gzip:  2.09 kB
dist/assets/Platform-DC6vainy.css               7.71 kB │ gzip:  1.91 kB
dist/assets/Landing-BwrVP7ac.css                8.78 kB │ gzip:  1.89 kB
dist/assets/StaffHome-DOlY-_Yf.css             15.31 kB │ gzip:  2.92 kB
dist/assets/prefersReducedMotion-H_9XR_Vq.js    0.10 kB │ gzip:  0.11 kB
dist/assets/SplitFlapBoard-CnpyxlqY.js          0.57 kB │ gzip:  0.39 kB
dist/assets/FlapUnit-Wi0t0mcV.js                0.77 kB │ gzip:  0.45 kB
dist/assets/MotionBackground-BYY9E_Z5.js        0.91 kB │ gzip:  0.49 kB
dist/assets/Platform.module-CSE0V78f.js         1.64 kB │ gzip:  0.61 kB
dist/assets/PlatformLogin-D45zgX8D.js           2.60 kB │ gzip:  1.16 kB
dist/assets/LoginPage-CNTFfX1r.js               3.68 kB │ gzip:  1.58 kB
dist/assets/NearestBranch-BvGJtVYH.js           4.03 kB │ gzip:  1.55 kB
dist/assets/Branch-B62Shs19.js                  4.59 kB │ gzip:  1.73 kB
dist/assets/Contact-C9Tq8km0.js                 4.77 kB │ gzip:  1.88 kB
dist/assets/Kiosk-BrqmKwam.js                   5.26 kB │ gzip:  2.02 kB
dist/assets/Boards-B23ZLTnG.js                  6.41 kB │ gzip:  2.15 kB
dist/assets/Appointment-CrX5iZh-.js             8.11 kB │ gzip:  2.65 kB
dist/assets/TicketPage-Dz0JdfHT.js              8.16 kB │ gzip:  2.71 kB
dist/assets/Board-BNnNQ_MD.js                   8.95 kB │ gzip:  2.99 kB
dist/assets/PlatformDashboard-CVp7ZRtR.js      10.22 kB │ gzip:  3.03 kB
dist/assets/NotFound-DKWNqGrd.js               11.01 kB │ gzip:  4.14 kB
dist/assets/StaffHome-DUjMNzv8.js              34.30 kB │ gzip:  8.31 kB
dist/assets/esm-Ckkn2Ami.js                    41.16 kB │ gzip: 12.86 kB
dist/assets/Landing-BCTXQTPH.js                63.03 kB │ gzip: 25.15 kB
dist/assets/gsap-DWxn8li7.js                   69.58 kB │ gzip: 27.28 kB
dist/assets/proxy-GcLvUCXa.js                 129.60 kB │ gzip: 42.29 kB
dist/assets/index-CZf6QglG.js                 241.78 kB │ gzip: 77.51 kB

✓ built in 4.56s

```

**Tool: bash**

**Input:**
```json
{
  "command": "node --check src/routes/v1/index.js && node --check src/controllers/platform/platformAuth.controller.js && node --check tests/platform/superadmin.platform.test.js",
  "workdir": "/home/gamp/Desktop/cue/backend"
}
```

**Output:**
```
(no output)
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue",
  "pattern": "apiKeyRequest\\.routes|v1/api-key-requests|data\\.staff"
}
```

**Output:**
```
Found 8 matches
/home/gamp/Desktop/cue/BUILD_PLAN.md:
  Line 150: - [x] Legacy `routes/v1/apiKeyRequest.routes.js` **removed** + unmounted from `v1/index.js` (`authorize("admin")` always 403’d under `resolveStaffUser` role `"staff"`; dashboard uses JWT `/api/admin/api-key-requests`)

  Line 509:   └─ Bank admin: POST /api/v1/api-key-requests to request a key

  Line 519: /api/v1/api-key-requests/* → API-key auth + authorize("admin") + bankScope

  Line 555: - [x] New v1 routes `apiKeyRequest.routes.js`:


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerOverview.jsx:
  Line 33:       setPerformance(perfRes.data.staffPerformance || []);


/home/gamp/Desktop/cue/backend/src/routes/v1/index.js:
  Line 57: // The old /v1/api-key-requests path is removed — it used authorize("admin")


/home/gamp/Desktop/cue/deferred/frontend/src/pages/StaffHome/manager/StaffTab.jsx:
  Line 31:       perfRes.data.staffPerformance.forEach((p) => {


/home/gamp/Desktop/cue/backend/tests/platform/superadmin.platform.test.js:
  Line 63:     expect(payload.data.staff).toBeUndefined();

```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue",
  "pattern": "apiKeyRequest\\.routes|data\\.staff"
}
```

**Output:**
```
Found 5 matches
/home/gamp/Desktop/cue/BUILD_PLAN.md:
  Line 150: - [x] Legacy `routes/v1/apiKeyRequest.routes.js` **removed** + unmounted from `v1/index.js` (`authorize("admin")` always 403’d under `resolveStaffUser` role `"staff"`; dashboard uses JWT `/api/admin/api-key-requests`)

  Line 555: - [x] New v1 routes `apiKeyRequest.routes.js`:


/home/gamp/Desktop/cue/backend/tests/platform/superadmin.platform.test.js:
  Line 63:     expect(payload.data.staff).toBeUndefined();


/home/gamp/Desktop/cue/deferred/frontend/src/pages/StaffHome/manager/StaffTab.jsx:
  Line 31:       perfRes.data.staffPerformance.forEach((p) => {


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerOverview.jsx:
  Line 33:       setPerformance(perfRes.data.staffPerformance || []);

```

**Tool: bash**

**Input:**
```json
{
  "command": "npm test 2>&1",
  "workdir": "/home/gamp/Desktop/cue/backend"
}
```

**Output:**
```
npm notice run smart-queue-management-system@1.0.0 test
npm notice run vitest run

 RUN  v5.0.0 /home/gamp/Desktop/cue/backend


 Test Files  16 passed (16)
      Tests  123 passed (123)
   Start at  12:18:00
   Duration  39.49s (import 68%, transform 23%, tests 5%, worker 4%)

    Isolate  16 workers spawned · ~2.84s startup each (spawn + environment, per file)
             at least ~12.31s faster with isolate: false — reuses workers across files instead of one per file


```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 9.5s)

_Thinking:_

All tests pass: 123 backend + 8 frontend = 131, vite build green. WP8 is done. Let me provide a summary of what was done.

The user asked "What did we do so far?" originally, then "Continue if you have next steps". I've completed WP8. I should summarize what was done in this turn and overall status.

**WP8 complete** — 123 backend + 8 frontend tests green, `vite build` ok.

### This session (WP8)
- **Removed** broken legacy `routes/v1/apiKeyRequest.routes.js` (always 403’d: `authorize("admin")` vs `resolveStaffUser` role `"staff"`) and unmounted it from `v1/index.js`
- **Platform login** now returns identity under `user` (same key as bank logins) with `role`/`kind`/`mustChangePassword`
- **`ProtectedRoute`**: unauthenticated `/platform*` → `/platform/login`
- **`AuthInterceptor`**: superadmin 401 → `/platform/login` with `sessionExpired` notice
- **Stale comments** fixed (platform key routes/controller, `apiKeyRequest.model.js` → JWT admin path)
- **New tests** `backend/tests/platform/superadmin.platform.test.js` (6): login JWT kind + shape, bad password, `getPlatformMe`, approve/reject stamp `reviewedBy`, v1 has no key-requests
- **`BUILD_PLAN.md`** WP8 marked ✅ with checklist

### Phase 13 status
| WP | Status |
|---|---|
| WP1–WP7 | ✅ (from prior sessions, uncommitted) |
| WP8 | ✅ this session |
| WP9 | ⏳ docs, env cleanup, full test pass |

Nothing committed. Next: **WP9**, or say if you want a commit first.

---

## User

so i tried creating a manager account with a temporary password from the admin management dashboard but a staff account was created instead, where is the logic written in the code so i can go throughh it myself?

---

## Assistant (Plan · MiMo-V2.6-Flash Free · 13.2s)

_Thinking:_

The user wants to know where the logic is for creating a manager account with temporary password from the admin management dashboard, but a staff account was created instead. They want to read through the code themselves. I'm in plan mode - read only. I should find the relevant code paths.

Locating the manager-create path end-to-end so you can follow it yourself.

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/frontend/src",
  "pattern": "createManager|POST.*managers|temp.?password|Cue-"
}
```

**Output:**
```
Found 2 matches
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx:
  Line 90:       // Password optional — blank means server generates a temp password.


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx:
  Line 33:  * endpoint with temp password + invite links).

```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/backend/src",
  "pattern": "createManager|Cue-|tempPassword|mustChangePassword"
}
```

**Output:**
```
Found 50 matches
/home/gamp/Desktop/cue/backend/src/models/manager.model.js:
  Line 15:  *   name, email, password, branch, bank, isActive, mustChangePassword

  Line 64:     mustChangePassword: {


/home/gamp/Desktop/cue/backend/src/models/admin.model.js:
  Line 53:     mustChangePassword: {


/home/gamp/Desktop/cue/backend/src/models/superadmin.model.js:
  Line 44:     mustChangePassword: {


/home/gamp/Desktop/cue/backend/src/routes/manager.routes.js:
  Line 3:   createManager,

  Line 9:   createManagerValidator,

  Line 26: router.post("/", createManagerValidator, validate, createManager);


/home/gamp/Desktop/cue/backend/src/routes/auth.routes.js:
  Line 7:   createManagerInvite,

  Line 18:   createManagerInviteValidator,

  Line 102:   createManagerInviteValidator,

  Line 104:   createManagerInvite,


/home/gamp/Desktop/cue/backend/src/validators/staff.validator.js:
  Line 5:  * When omitted, the server generates a temp password (Cue-XXXXXX-XXXXXX)

  Line 6:  * and returns it once as `tempPassword` with mustChangePassword: true.


/home/gamp/Desktop/cue/backend/src/validators/auth.validator.js:
  Line 89: export const createManagerInviteValidator = [


/home/gamp/Desktop/cue/backend/src/validators/manager.validator.js:
  Line 9: export const createManagerValidator = [


/home/gamp/Desktop/cue/backend/src/models/staff.model.js:
  Line 66:     mustChangePassword: {


/home/gamp/Desktop/cue/backend/src/controllers/user.controller.js:
  Line 65:     account.mustChangePassword = false;


/home/gamp/Desktop/cue/backend/src/controllers/manager.controller.js:
  Line 12:  *   2. Admin omits password → server generates Cue-XXXXXX-XXXXXX,

  Line 13:  *      returns it ONCE as `tempPassword`, sets mustChangePassword: true.

  Line 36: export const createManager = async (req, res, next) => {

  Line 58:     let tempPassword = null;

  Line 61:       tempPassword = generateTempPassword();

  Line 62:       finalPassword = tempPassword;

  Line 73:       mustChangePassword: mustChange,

  Line 78:       message: tempPassword

  Line 88:         mustChangePassword: manager.mustChangePassword,

  Line 90:         tempPassword,


/home/gamp/Desktop/cue/backend/src/controllers/platform/platformAuth.controller.js:
  Line 62:           mustChangePassword: !!superadmin.mustChangePassword,


/home/gamp/Desktop/cue/backend/src/utils/password.js:
  Line 5:  * Format: Cue-XXXXXX-XXXXXX (hex, uppercased) — meets min-8 rule.

  Line 8:  * Paired with mustChangePassword: true so the user must rotate on first login.

  Line 12:   return `Cue-${part()}-${part()}`;


/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js:
  Line 38:     mustChangePassword: !!doc.mustChangePassword,

  Line 117:  * Creates an Admin and logs them in immediately (mustChangePassword: false —

  Line 139:       mustChangePassword: false,

  Line 160: export const createManagerInvite = async (req, res, next) => {

  Line 330:         mustChangePassword: false,

  Line 356:       mustChangePassword: false,

  Line 391:  * Clears mustChangePassword after a successful rotation.

  Line 429:     account.mustChangePassword = false;


/home/gamp/Desktop/cue/backend/src/controllers/staff.controller.js:
  Line 16:  *   - Creator supplies password → used as-is (mustChangePassword false)

  Line 18:  *     it ONCE as `tempPassword`, mustChangePassword true

  Line 79:  * returned once in `tempPassword`.

  Line 98:     let tempPassword = null;

  Line 101:       tempPassword = generateTempPassword();

  Line 102:       finalPassword = tempPassword;

  Line 111:       mustChangePassword: mustChange,

  Line 123:       message: tempPassword

  Line 132:         mustChangePassword: staff.mustChangePassword,

  Line 134:         tempPassword,

  Line 190:           mustChangePassword: staff.mustChangePassword,

```

**Tool: glob**

**Input:**
```json
{
  "pattern": "backend/src/routes/manager*"
}
```

**Output:**
```
/home/gamp/Desktop/cue/backend/src/routes/manager.routes.js
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "frontend/src/**/*Manager*"
}
```

**Output:**
```
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerOverview.jsx
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "frontend/src/**/*Staff*"
}
```

**Output:**
```
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.jsx
```

---

## Assistant (Plan · MiMo-V2.6-Flash Free · 10.5s)

_Thinking:_

The issue is likely that the AdminOverview still uses StaffSubTab for creating staff, and there's no manager creation form wired yet - or the staff creation form is being used when they think they're creating a manager. Let me look at StaffSubTab and AdminOverview and how the frontend creates managers.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx</path>
<type>file</type>
<content>
1: import { useCallback, useEffect, useState } from "react";
2: import { motion } from "framer-motion";
3: import { useAuth } from "../../features/auth/AuthContext";
4: import {
5:   fetchStaffList,
6:   createStaff,
7:   deactivateStaffApi,
8:   fetchBranchQueues,
9:   assignQueuesToStaff,
10: } from "../../features/staff/manageApi";
11: import { fetchBranches } from "../../features/staff/adminApi";
12: import { ApiError } from "../../lib/apiClient";
13: import styles from "./StaffHome.module.css";
14: 
15: /**
16:  * StaffSubTab — staff list, create form, and queue assignment.
17:  * Used inside ManagePanel for manager/admin.
18:  *
19:  * After the four-model split this form creates Staff only — managers
20:  * have their own collection and creation flow (WP4).
21:  * Admin: picks a branch via dropdown (bank-scoped by Admin.bank).
22:  * Manager: auto-assigns to own branch.
23:  *
24:  * All calls use JWT Bearer (WP6) — bank/branch scoping is server-side.
25:  * Password is optional; server may return a one-time tempPassword.
26:  */
27: const StaffSubTab = () => {
28:   const { auth } = useAuth();
29:   const isAdmin = auth.role === "admin";
30:   const token = auth.token;
31: 
32:   const [staffList, setStaffList] = useState([]);
33:   const [queues, setQueues] = useState([]);
34:   const [branches, setBranches] = useState([]);
35:   const [loading, setLoading] = useState(true);
36:   const [error, setError] = useState(null);
37:   const [form, setForm] = useState({
38:     name: "",
39:     email: "",
40:     password: "",
41:     branch: "",
42:   });
43:   const [formError, setFormError] = useState(null);
44:   const [submitting, setSubmitting] = useState(false);
45:   const [assigningQueue, setAssigningQueue] = useState(null);
46: 
47:   const load = useCallback(async () => {
48:     try {
49:       const promises = [
50:         fetchStaffList(token),
51:         fetchBranchQueues(token),
52:       ];
53:       if (isAdmin) {
54:         promises.push(fetchBranches(token));
55:       }
56:       const results = await Promise.all(promises);
57:       setStaffList(results[0].data);
58:       setQueues(
59:         results[1].data.filter(
60:           (q) => q.branch?._id === auth.branch || q.branch === auth.branch,
61:         ),
62:       );
63:       if (isAdmin && results[2]) {
64:         setBranches(results[2].data);
65:       }
66:       setError(null);
67:     } catch (err) {
68:       setError(err.message || "Couldn't load staff.");
69:     } finally {
70:       setLoading(false);
71:     }
72:   }, [token, auth.branch, isAdmin]);
73: 
74:   useEffect(() => {
75:     load();
76:   }, [load]);
77: 
78:   const handleChange = (field) => (e) =>
79:     setForm((f) => ({ ...f, [field]: e.target.value }));
80: 
81:   const handleCreate = async (e) => {
82:     e.preventDefault();
83:     setFormError(null);
84:     setSubmitting(true);
85:     try {
86:       const payload = { ...form };
87:       if (!isAdmin) {
88:         payload.branch = auth.branch;
89:       }
90:       // Password optional — blank means server generates a temp password.
91:       if (!payload.password) delete payload.password;
92:       await createStaff(payload, token);
93:       setForm({ name: "", email: "", password: "", branch: "" });
94:       await load();
95:     } catch (err) {
96:       setFormError(
97:         err instanceof ApiError
98:           ? err.errors?.join(", ") || err.message
99:           : "Couldn't create staff.",
100:       );
101:     } finally {
102:       setSubmitting(false);
103:     }
104:   };
105: 
106:   const handleDeactivate = async (staffId) => {
107:     await deactivateStaffApi(staffId, token);
108:     await load();
109:   };
110: 
111:   const handleQueueToggle = async (staffId, queueId) => {
112:     const staff = staffList.find((s) => s._id === staffId);
113:     if (!staff) return;
114:     const current = (staff.queues || []).map((q) => q._id || q);
115:     const next = current.includes(queueId)
116:       ? current.filter((id) => id !== queueId)
117:       : [...current, queueId];
118:     setAssigningQueue(staffId);
119:     try {
120:       await assignQueuesToStaff(staffId, next, token);
121:       await load();
122:     } catch (err) {
123:       setError(
124:         err instanceof ApiError ? err.message : "Couldn't update queues.",
125:       );
126:     } finally {
127:       setAssigningQueue(null);
128:     }
129:   };
130: 
131:   if (loading) return <p className={styles.mgmtStatus}>Loading staff…</p>;
132:   if (error) return <p className={styles.mgmtStatusError}>{error}</p>;
133: 
134:   return (
135:     <motion.div
136:       initial={{ opacity: 0, y: 12 }}
137:       animate={{ opacity: 1, y: 0 }}
138:       transition={{ duration: 0.4 }}
139:     >
140:       {staffList.length === 0 && (
141:         <p className={styles.mgmtStatus}>No staff on your branch yet.</p>
142:       )}
143: 
144:       {staffList.map((s) => {
145:         const assignedQueues = s.queues || [];
146:         return (
147:           <div key={s._id} className={styles.mgmtRow}>
148:             <div>
149:               <div className={styles.mgmtRowTitle}>{s.name}</div>
150:               <div className={styles.mgmtRowSub}>
151:                 {s.email} · {s.role || "staff"}
152:                 {s.branch?.name && <> · {s.branch.name}</>}
153:                 {s.counter && (
154:                   <> · Counter {s.counter.label || s.counter}</>
155:                 )}
156:               </div>
157:               {!isAdmin && queues.length > 0 && (
158:                 <div className={styles.mgmtQueueChips}>
159:                   {queues.map((q) => {
160:                     const qId = q._id;
161:                     const isAssigned = assignedQueues.some(
162:                       (aq) => (aq._id || aq) === qId,
163:                     );
164:                     return (
165:                       <button
166:                         key={qId}
167:                         className={`${styles.mgmtQueueChip} ${isAssigned ? styles.mgmtQueueChipActive : ""}`}
168:                         onClick={() => handleQueueToggle(s._id, qId)}
169:                         disabled={assigningQueue === s._id}
170:                       >
171:                         {q.serviceName}
172:                       </button>
173:                     );
174:                   })}
175:                 </div>
176:               )}
177:             </div>
178:             <div className={styles.mgmtRowActions}>
179:               <button
180:                 className={styles.mgmtLinkBtn}
181:                 onClick={() => handleDeactivate(s._id)}
182:               >
183:                 Deactivate
184:               </button>
185:             </div>
186:           </div>
187:         );
188:       })}
189: 
190:       <div className={styles.mgmtSubHeading}>Add staff</div>
191:       <form onSubmit={handleCreate} className={styles.mgmtInlineForm}>
192:         <input
193:           required
194:           placeholder="Name"
195:           value={form.name}
196:           onChange={handleChange("name")}
197:         />
198:         <input
199:           required
200:           type="email"
201:           placeholder="Email"
202:           value={form.email}
203:           onChange={handleChange("email")}
204:         />
205:         <input
206:           required
207:           type="password"
208:           placeholder="Temporary password"
209:           value={form.password}
210:           onChange={handleChange("password")}
211:         />
212:         {isAdmin && (
213:           <select
214:             required
215:             value={form.branch}
216:             onChange={handleChange("branch")}
217:             className={styles.mgmtInlineSelect}
218:           >
219:             <option value="" disabled>
220:               Assign branch…
221:             </option>
222:             {branches.map((b) => (
223:               <option key={b._id} value={b._id}>
224:                 {b.name}
225:               </option>
226:             ))}
227:           </select>
228:         )}
229:         {formError && <p className={styles.mgmtStatusError}>{formError}</p>}
230:         <button
231:           type="submit"
232:           className={styles.mgmtSubmitBtn}
233:           disabled={submitting}
234:         >
235:           {submitting ? "Adding…" : "Add"}
236:         </button>
237:       </form>
238:     </motion.div>
239:   );
240: };
241: 
242: export default StaffSubTab;

(End of file - total 242 lines)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/frontend/src",
  "pattern": "createManager|/managers|role.*manager|kind.*manager"
}
```

**Output:**
```
Found 2 matches
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.jsx:
  Line 34:   const isManager = auth.role === "manager";


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/CounterConsole.jsx:
  Line 54:   if (auth.role === "manager") {

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/features/staff/manageApi.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/features/staff/manageApi.js</path>
<type>file</type>
<content>
1: import { apiClient } from "../../lib/apiClient";
2: 
3: /**
4:  * Staff management API — JWT `/api/*` surface (Phase 13 WP6).
5:  *
6:  * All functions take a Bearer `token` from AuthContext.
7:  * Branch scoping (admin bank / manager branch) is enforced server-side.
8:  */
9: 
10: /** Fetch staff (admin: bank-scoped; manager: own branch) */
11: export const fetchStaffList = (token) =>
12:   apiClient.get("/staff", { token });
13: 
14: /** Create staff — password optional (server may return tempPassword) */
15: export const createStaff = (data, token) =>
16:   apiClient.post("/staff", data, { token });
17: 
18: /** Assign queues to a staff member */
19: export const assignQueuesToStaff = (staffId, queueIds, token) =>
20:   apiClient.patch(`/staff/${staffId}/queues`, { queues: queueIds }, { token });
21: 
22: /** Soft-deactivate a staff member */
23: export const deactivateStaffApi = (staffId, token) =>
24:   apiClient.delete(`/staff/${staffId}`, { token });
25: 
26: /** Fetch counters for a branch */
27: export const fetchBranchCounters = (branchId, token) =>
28:   apiClient.get(`/counters/${branchId}`, { token });
29: 
30: /** Create a new counter */
31: export const createCounter = (data, token) =>
32:   apiClient.post("/counters", data, { token });
33: 
34: /** Assign a staff member to a counter */
35: export const assignStaffToCounter = (counterId, staffId, token) =>
36:   apiClient.patch(`/counters/${counterId}/assign-staff`, { staffId }, { token });
37: 
38: /** Unassign staff from a counter */
39: export const unassignStaffFromCounter = (counterId, token) =>
40:   apiClient.patch(`/counters/${counterId}/unassign-staff`, {}, { token });
41: 
42: /** Fetch queues for the signed-in identity's scope */
43: export const fetchBranchQueues = (token) =>
44:   apiClient.get("/queues", { token });

(End of file - total 44 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/manager.controller.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/manager.controller.js</path>
<type>file</type>
<content>
1: import Manager from "../models/manager.model.js";
2: import Branch from "../models/branch.model.js";
3: import { sendSuccess, sendError } from "../utils/response.js";
4: import { parsePagination, paginatedResponse } from "../utils/pagination.js";
5: import { generateTempPassword } from "../utils/password.js";
6: 
7: /**
8:  * Manager controller — Phase 13 WP4.
9:  *
10:  * Managers live in their own collection (no `role` field). Creation paths:
11:  *   1. Admin creates with a body password → used as-is.
12:  *   2. Admin omits password → server generates Cue-XXXXXX-XXXXXX,
13:  *      returns it ONCE as `tempPassword`, sets mustChangePassword: true.
14:  *   3. Admin issues an invite link → invitee sets their own password (auth.controller).
15:  *
16:  * Bank is always denormalized from Branch.bank (never taken from the body).
17:  * Admins may only manage branches inside their own bank.
18:  */
19: 
20: /** Load branch + enforce it belongs to the admin's bank (admins only). */
21: const assertBranchInAdminBank = async (branchId, req) => {
22:   const branch = await Branch.findById(branchId);
23:   if (!branch || branch.isActive === false) {
24:     return { error: "Branch not found", statusCode: 404 };
25:   }
26:   if (req.user.bank && branch.bank !== req.user.bank) {
27:     return { error: "Branch does not belong to your bank", statusCode: 403 };
28:   }
29:   return { branch };
30: };
31: 
32: /**
33:  * POST /api/managers — admin only (route already authorize("admin")).
34:  * Body: { name, email, password?, branch }
35:  */
36: export const createManager = async (req, res, next) => {
37:   try {
38:     const { name, email, password, branch } = req.body;
39: 
40:     const check = await assertBranchInAdminBank(branch, req);
41:     if (check.error) {
42:       return sendError(res, {
43:         statusCode: check.statusCode,
44:         message: check.error,
45:       });
46:     }
47: 
48:     const existing = await Manager.findOne({ email: email.toLowerCase() });
49:     if (existing) {
50:       return sendError(res, {
51:         statusCode: 400,
52:         message: "Manager with this email already exists",
53:       });
54:     }
55: 
56:     // Dual path: explicit password (legacy UI) vs server-generated temp password.
57:     let finalPassword = password;
58:     let tempPassword = null;
59:     let mustChange = false;
60:     if (!finalPassword) {
61:       tempPassword = generateTempPassword();
62:       finalPassword = tempPassword;
63:       mustChange = true;
64:     }
65: 
66:     const manager = await Manager.create({
67:       name,
68:       email,
69:       password: finalPassword,
70:       branch: check.branch._id,
71:       // Denormalized tenant — same value Branch.bank holds.
72:       bank: check.branch.bank,
73:       mustChangePassword: mustChange,
74:     });
75: 
76:     return sendSuccess(res, {
77:       statusCode: 201,
78:       message: tempPassword
79:         ? "Manager created — share the temporary password once"
80:         : "Manager created successfully",
81:       data: {
82:         id: manager._id,
83:         name: manager.name,
84:         email: manager.email,
85:         role: "manager",
86:         branch: manager.branch,
87:         bank: manager.bank,
88:         mustChangePassword: manager.mustChangePassword,
89:         // Returned ONLY when the server generated it — never stored in plain text.
90:         tempPassword,
91:       },
92:     });
93:   } catch (error) {
94:     next(error);
95:   }
96: };
97: 
98: /**
99:  * GET /api/managers — admin only; bank-scoped to the admin's tenant.
100:  */
101: export const getAllManagers = async (req, res, next) => {
102:   try {
103:     const { page, limit, skip } = parsePagination(req.query);
104:     const filter = { isActive: true };
105:     // Admin bank scoping (Manager.bank is denormalized at creation).
106:     if (req.user.bank) {
107:       filter.bank = req.user.bank;
108:     }
109: 
110:     const [total, managers] = await Promise.all([
111:       Manager.countDocuments(filter),
112:       Manager.find(filter)
113:         .populate("branch", "name location")
114:         .skip(skip)
115:         .limit(limit),
116:     ]);
117: 
118:     const items = managers.map((m) => ({
119:       ...(typeof m.toObject === "function" ? m.toObject() : m),
120:       role: "manager",
121:     }));
122: 
123:     return sendSuccess(res, {
124:       statusCode: 200,
125:       message: "Managers fetched successfully",
126:       ...paginatedResponse(items, total, page, limit),
127:     });
128:   } catch (error) {
129:     next(error);
130:   }
131: };
132: 
133: /**
134:  * PATCH /api/managers/:managerId/branch — admin reassigns branch.
135:  * Body: { branchId }
136:  * Bank is re-denormalized from the new branch.
137:  */
138: export const assignManagerBranch = async (req, res, next) => {
139:   try {
140:     const { branchId } = req.body;
141:     const { managerId } = req.params;
142: 
143:     const check = await assertBranchInAdminBank(branchId, req);
144:     if (check.error) {
145:       return sendError(res, {
146:         statusCode: check.statusCode,
147:         message: check.error,
148:       });
149:     }
150: 
151:     const manager = await Manager.findById(managerId);
152:     if (!manager) {
153:       return sendError(res, { statusCode: 404, message: "Manager not found" });
154:     }
155:     // Cross-bank guard: admin cannot touch another bank's manager.
156:     if (req.user.bank && manager.bank !== req.user.bank) {
157:       return sendError(res, {
158:         statusCode: 403,
159:         message: "Manager does not belong to your bank",
160:       });
161:     }
162: 
163:     manager.branch = check.branch._id;
164:     manager.bank = check.branch.bank;
165:     await manager.save();
166:     await manager.populate("branch", "name location");
167: 
168:     return sendSuccess(res, {
169:       statusCode: 200,
170:       message: "Manager assigned to branch successfully",
171:       data: {
172:         id: manager._id,
173:         name: manager.name,
174:         branch: manager.branch,
175:         bank: manager.bank,
176:       },
177:     });
178:   } catch (error) {
179:     next(error);
180:   }
181: };
182: 
183: /**
184:  * DELETE /api/managers/:managerId — soft-deactivate (admin).
185:  */
186: export const deactivateManager = async (req, res, next) => {
187:   try {
188:     const { managerId } = req.params;
189:     const target = await Manager.findById(managerId);
190: 
191:     if (!target) {
192:       return sendError(res, { statusCode: 404, message: "Manager not found" });
193:     }
194:     if (req.user.bank && target.bank !== req.user.bank) {
195:       return sendError(res, {
196:         statusCode: 403,
197:         message: "Manager does not belong to your bank",
198:       });
199:     }
200: 
201:     target.isActive = false;
202:     await target.save();
203: 
204:     return sendSuccess(res, {
205:       statusCode: 200,
206:       message: "Manager deactivated successfully",
207:     });
208:   } catch (error) {
209:     next(error);
210:   }
211: };

(End of file - total 211 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/staff.controller.js",
  "limit": 150
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/staff.controller.js</path>
<type>file</type>
<content>
1: import Staff from "../models/staff.model.js";
2: import Queue from "../models/queue.model.js";
3: import Branch from "../models/branch.model.js";
4: import jwt from "jsonwebtoken";
5: import { sendEmail } from "../services/email.service.js";
6: import { getBrandSync } from "../config/brand.config.js";
7: import { sendSuccess, sendError } from "../utils/response.js";
8: import { parsePagination, paginatedResponse } from "../utils/pagination.js";
9: import { generateTempPassword } from "../utils/password.js";
10: 
11: /**
12:  * Staff controller — JWT /api/staff surface (dashboard, not v1).
13:  * After the four-model split, this collection holds staff only.
14:  *
15:  * Provisioning paths (Phase 13 WP4):
16:  *   - Creator supplies password → used as-is (mustChangePassword false)
17:  *   - Creator omits password → server generates temp password, returns
18:  *     it ONCE as `tempPassword`, mustChangePassword true
19:  *   - Invite link → invitee sets own password (auth.controller)
20:  *
21:  * Bank scoping: managers → own branch; admins → branches where
22:  * Branch.bank === Admin.bank (403 otherwise).
23:  */
24: 
25: /** Resolve a safe branch id for createStaff + validate tenant ownership. */
26: const resolveBranchForCreate = async (req, res) => {
27:   // Manager: always own branch (never trust body).
28:   if (req.role === "manager") {
29:     if (!req.user.branch) {
30:       sendError(res, {
31:         statusCode: 400,
32:         message: "Manager has no branch assigned",
33:       });
34:       return null;
35:     }
36:     return { branchId: req.user.branch };
37:   }
38: 
39:   // Admin (or other privileged roles on this router): body.branch required.
40:   const branchId = req.body.branch;
41:   if (!branchId) {
42:     sendError(res, { statusCode: 400, message: "branch is required" });
43:     return null;
44:   }
45: 
46:   const branch = await Branch.findById(branchId);
47:   if (!branch || branch.isActive === false) {
48:     sendError(res, { statusCode: 404, message: "Branch not found" });
49:     return null;
50:   }
51: 
52:   // Admin may only create staff inside their own bank's branches.
53:   if (req.role === "admin" && req.user.bank && branch.bank !== req.user.bank) {
54:     sendError(res, {
55:       statusCode: 403,
56:       message: "Branch does not belong to your bank",
57:     });
58:     return null;
59:   }
60: 
61:   return { branchId: branch._id };
62: };
63: 
64: /** Bank filter for list/read ops. Returns null when no scoping applies. */
65: const bankBranchFilter = async (req) => {
66:   if (req.role === "manager") {
67:     return req.user.branch ? { branch: req.user.branch } : { branch: null };
68:   }
69:   if (req.role === "admin" && req.user.bank) {
70:     const branches = await Branch.find({ bank: req.user.bank }).select("_id");
71:     return { branch: { $in: branches.map((b) => b._id) } };
72:   }
73:   return null;
74: };
75: 
76: /**
77:  * POST /api/staff — admin or manager creates a staff member.
78:  * Dual path: body.password if provided; else server temp password
79:  * returned once in `tempPassword`.
80:  */
81: export const createStaff = async (req, res, next) => {
82:   try {
83:     const { name, email, password } = req.body;
84: 
85:     const resolved = await resolveBranchForCreate(req, res);
86:     if (!resolved) return; // sendError already called
87: 
88:     const existingStaff = await Staff.findOne({ email: email.toLowerCase() });
89:     if (existingStaff) {
90:       return sendError(res, {
91:         statusCode: 400,
92:         message: "Staff with this email already exists",
93:       });
94:     }
95: 
96:     // Dual path: explicit password vs server-generated temp password.
97:     let finalPassword = password;
98:     let tempPassword = null;
99:     let mustChange = false;
100:     if (!finalPassword) {
101:       tempPassword = generateTempPassword();
102:       finalPassword = tempPassword;
103:       mustChange = true;
104:     }
105: 
106:     const staff = await Staff.create({
107:       name,
108:       email,
109:       password: finalPassword,
110:       branch: resolved.branchId,
111:       mustChangePassword: mustChange,
112:     });
113: 
114:     // Welcome email only — temp password is NEVER emailed (returned once in JSON).
115:     await sendEmail({
116:       to: staff.email,
117:       subject: `Your ${getBrandSync().name} Staff Account is Ready`,
118:       html: `<h2>Welcome to ${getBrandSync().name}</h2><p>Your staff account has been created for branch <b>${getBrandSync().name}</b>.</p><p><b>Email:</b> ${staff.email}</p><p>Your creator will share your temporary password separately. Please log in and change it.</p>`,
119:     }).catch(() => {});
120: 
121:     return sendSuccess(res, {
122:       statusCode: 201,
123:       message: tempPassword
124:         ? "Staff created — share the temporary password once"
125:         : "Staff account created successfully",
126:       data: {
127:         id: staff._id,
128:         name: staff.name,
129:         email: staff.email,
130:         role: "staff",
131:         branch: staff.branch,
132:         mustChangePassword: staff.mustChangePassword,
133:         // Only present when the server generated it (one-time display).
134:         tempPassword,
135:       },
136:     });
137:   } catch (error) {
138:     next(error);
139:   }
140: };
141: 
142: export const loginStaff = async (req, res, next) => {
143:   try {
144:     const { email, password } = req.body;
145: 
146:     if (!email || !password) {
147:       return sendError(res, {
148:         statusCode: 400,
149:         message: "Email and password are required",
150:       });

(Showing lines 1-150 of 442. Use offset=151 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/manager.routes.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/routes/manager.routes.js</path>
<type>file</type>
<content>
1: import express from "express";
2: import {
3:   createManager,
4:   getAllManagers,
5:   assignManagerBranch,
6:   deactivateManager,
7: } from "../controllers/manager.controller.js";
8: import {
9:   createManagerValidator,
10:   assignManagerBranchValidator,
11: } from "../validators/manager.validator.js";
12: import { protect, authorize } from "../middlewares/auth.middleware.js";
13: import validate from "../middlewares/validate.js";
14: 
15: /**
16:  * Manager routes — Phase 13 WP4.
17:  * JWT-only (dashboard surface); all routes admin-scoped by bank in the controller.
18:  *
19:  * Managers do NOT have routes here — they cannot create other managers.
20:  */
21: const router = express.Router();
22: 
23: router.use(protect);
24: router.use(authorize("admin"));
25: 
26: router.post("/", createManagerValidator, validate, createManager);
27: router.get("/", getAllManagers);
28: router.patch(
29:   "/:managerId/branch",
30:   assignManagerBranchValidator,
31:   validate,
32:   assignManagerBranch,
33: );
34: router.delete("/:managerId", deactivateManager);
35: 
36: export default router;

(End of file - total 36 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx</path>
<type>file</type>
<content>
1: import { useCallback, useEffect, useState } from "react";
2: import { motion } from "framer-motion";
3: import { useAuth } from "../../features/auth/AuthContext";
4: import {
5:   fetchAdminOverview,
6:   createBranch,
7: } from "../../features/staff/adminApi";
8: import {
9:   requestApiKey,
10:   fetchApiKeyRequests,
11:   revealApiKeyRequest,
12: } from "../../features/staff/apiKeyRequestApi";
13: import { ApiError } from "../../lib/apiClient";
14: import styles from "./StaffHome.module.css";
15: 
16: // Scopes a bank admin may request (admin scope is superadmin-only).
17: const REQUESTABLE_SCOPES = [
18:   "branches:read",
19:   "tickets:read",
20:   "tickets:write",
21:   "staff:read",
22:   "analytics:read",
23:   "webhooks:manage",
24: ];
25: 
26: /**
27:  * AdminOverview — cross-branch dashboard for bank-scoped admin role.
28:  * Shows all branches (this bank only), all managers with staff counts,
29:  * a form to create branches, and the API key request panel
30:  * (request new key + view status / one-time reveal).
31:  *
32:  * Manager creation form is deferred to WP4 (Manager model + dedicated
33:  * endpoint with temp password + invite links).
34:  */
35: const AdminOverview = () => {
36:   const { auth } = useAuth();
37:   const [data, setData] = useState(null);
38:   const [loading, setLoading] = useState(true);
39:   const [error, setError] = useState(null);
40: 
41:   // Branch creation form
42:   const [branchForm, setBranchForm] = useState({ name: "", location: "" });
43:   const [branchFormError, setBranchFormError] = useState(null);
44:   const [branchSubmitting, setBranchSubmitting] = useState(false);
45: 
46:   // API key request state
47:   const [keyRequests, setKeyRequests] = useState([]);
48:   const [keyForm, setKeyForm] = useState({
49:     label: "",
50:     rateLimit: 100,
51:     scopes: ["branches:read", "tickets:read", "tickets:write"],
52:   });
53:   const [keyFormError, setKeyFormError] = useState(null);
54:   const [keySubmitting, setKeySubmitting] = useState(false);
55:   const [adminRevealKey, setAdminRevealKey] = useState(null); // one-time raw key display
56: 
57:   const load = useCallback(async () => {
58:     try {
59:       // JWT admin overview — bank scope from Admin.bank server-side (WP6).
60:       const res = await fetchAdminOverview(auth.token);
61:       setData(res.data);
62:       setError(null);
63:     } catch (err) {
64:       setError(err.message || "Couldn't load admin overview.");
65:     } finally {
66:       setLoading(false);
67:     }
68:   }, [auth.token]);
69: 
70:   const loadKeyRequests = useCallback(async () => {
71:     try {
72:       const res = await fetchApiKeyRequests(auth.token);
73:       // paginatedResponse nests under data: { data: [...], meta }
74:       setKeyRequests(res.data?.data || res.data?.items || []);
75:     } catch {
76:       // Non-fatal — request panel just stays empty.
77:       setKeyRequests([]);
78:     }
79:   }, [auth.token]);
80: 
81:   useEffect(() => {
82:     load();
83:     loadKeyRequests();
84:   }, [load, loadKeyRequests]);
85: 
86:   const handleBranchChange = (field) => (e) =>
87:     setBranchForm((f) => ({ ...f, [field]: e.target.value }));
88: 
89:   const handleCreateBranch = async (e) => {
90:     e.preventDefault();
91:     setBranchFormError(null);
92:     setBranchSubmitting(true);
93:     try {
94:       await createBranch(branchForm, auth.token);
95:       setBranchForm({ name: "", location: "" });
96:       await load();
97:     } catch (err) {
98:       setBranchFormError(
99:         err instanceof ApiError ? err.message : "Couldn't create branch.",
100:       );
101:     } finally {
102:       setBranchSubmitting(false);
103:     }
104:   };
105: 
106:   // ── API key request handlers ──────────────────────────────
107:   const toggleScope = (scope) =>
108:     setKeyForm((f) => ({
109:       ...f,
110:       scopes: f.scopes.includes(scope)
111:         ? f.scopes.filter((s) => s !== scope)
112:         : [...f.scopes, scope],
113:     }));
114: 
115:   const handleRequestKey = async (e) => {
116:     e.preventDefault();
117:     setKeyFormError(null);
118:     if (keyForm.scopes.length === 0) {
119:       setKeyFormError("Select at least one scope.");
120:       return;
121:     }
122:     setKeySubmitting(true);
123:     try {
124:       await requestApiKey(keyForm, auth.token);
125:       setKeyForm({
126:         label: "",
127:         rateLimit: 100,
128:         scopes: ["branches:read", "tickets:read", "tickets:write"],
129:       });
130:       await loadKeyRequests();
131:     } catch (err) {
132:       setKeyFormError(
133:         err instanceof ApiError
134:           ? err.errors?.join(", ") || err.message
135:           : "Couldn't submit request.",
136:       );
137:     } finally {
138:       setKeySubmitting(false);
139:     }
140:   };
141: 
142:   const handleRevealKey = async (id) => {
143:     try {
144:       const res = await revealApiKeyRequest(id, auth.token);
145:       if (res.data?.key) {
146:         setAdminRevealKey({ id, key: res.data.key });
147:       } else {
148:         setKeyFormError("Key already revealed previously.");
149:       }
150:       await loadKeyRequests();
151:     } catch (err) {
152:       setKeyFormError(err.message || "Couldn't reveal key.");
153:     }
154:   };
155: 
156:   if (loading) return <p className={styles.mgmtStatus}>Loading overview…</p>;
157:   if (error) return <p className={styles.mgmtStatusError}>{error}</p>;
158:   if (!data) return null;
159: 
160:   return (
161:     <motion.div
162:       initial={{ opacity: 0, y: 12 }}
163:       animate={{ opacity: 1, y: 0 }}
164:       transition={{ duration: 0.4 }}
165:     >
166:       {/* ── Summary Cards ─────────────────────────── */}
167:       <div className={styles.ovStatRow}>
168:         <div className={styles.ovStatCard}>
169:           <span className={styles.ovStatValue}>{data.summary.totalBranches}</span>
170:           <span className={styles.ovStatLabel}>branches</span>
171:         </div>
172:         <div className={styles.ovStatCard}>
173:           <span className={styles.ovStatValue}>{data.summary.totalManagers}</span>
174:           <span className={styles.ovStatLabel}>managers</span>
175:         </div>
176:         <div className={styles.ovStatCard}>
177:           <span className={styles.ovStatValue}>{data.summary.totalStaff}</span>
178:           <span className={styles.ovStatLabel}>total staff</span>
179:         </div>
180:       </div>
181: 
182:       {/* ── Branches List ─────────────────────────── */}
183:       <div className={styles.mgmtSubHeading}>Branches</div>
184:       {data.branches.length === 0 && (
185:         <p className={styles.mgmtStatus}>No branches yet.</p>
186:       )}
187:       {data.branches.map((b) => (
188:         <div key={b.id} className={styles.mgmtRow}>
189:           <div>
190:             <div className={styles.mgmtRowTitle}>{b.name}</div>
191:             <div className={styles.mgmtRowSub}>{b.location || "No location"}</div>
192:           </div>
193:           <div className={styles.mgmtRowActions}>
194:             <span
195:               className={b.dayOpen ? styles.mgmtBadgeOpen : styles.mgmtBadgeClosed}
196:             >
197:               {b.dayOpen ? "Open" : "Closed"}
198:             </span>
199:           </div>
200:         </div>
201:       ))}
202: 
203:       {/* ── Create Branch Form ─────────────────────── */}
204:       <div className={styles.mgmtSubHeading}>Add branch</div>
205:       <form onSubmit={handleCreateBranch} className={styles.mgmtInlineForm}>
206:         <input
207:           required
208:           placeholder="Branch name"
209:           value={branchForm.name}
210:           onChange={handleBranchChange("name")}
211:         />
212:         <input
213:           placeholder="Location"
214:           value={branchForm.location}
215:           onChange={handleBranchChange("location")}
216:         />
217:         {branchFormError && (
218:           <p className={styles.mgmtStatusError}>{branchFormError}</p>
219:         )}
220:         <button
221:           type="submit"
222:           className={styles.mgmtSubmitBtn}
223:           disabled={branchSubmitting}
224:         >
225:           {branchSubmitting ? "Adding…" : "Add branch"}
226:         </button>
227:       </form>
228: 
229:       {/* ── Managers List ──────────────────────────── */}
230:       <div className={styles.mgmtSubHeading}>Managers</div>
231:       {data.managers.length === 0 && (
232:         <p className={styles.mgmtStatus}>
233:           No managers yet. Manager accounts are created via the dedicated
234:           Manager flow (coming in WP4).
235:         </p>
236:       )}
237:       {data.managers.map((m) => (
238:         <div key={m.id} className={styles.mgmtRow}>
239:           <div>
240:             <div className={styles.mgmtRowTitle}>{m.name}</div>
241:             <div className={styles.mgmtRowSub}>
242:               {m.email}
243:               {m.branch && <> · {m.branch.name}</>}
244:             </div>
245:           </div>
246:           <div className={styles.mgmtRowActions}>
247:             <span className={styles.ovStaffCount}>
248:               {m.staffCount} staff
249:             </span>
250:           </div>
251:         </div>
252:       ))}
253: 
254:       {/* ── API Key Request Panel ─────────────────────── */}
255:       <div className={styles.mgmtSubHeading}>API key access</div>
256:       <p className={styles.mgmtStatus}>
257:         Request an API key for your bank. The superadmin reviews it on the
258:         platform console — once approved you can reveal the key once here.
259:       </p>
260: 
261:       <form onSubmit={handleRequestKey} className={styles.mgmtInlineForm}>
262:         <input
263:           placeholder="Label (e.g. Core banking backend)"
264:           value={keyForm.label}
265:           onChange={(e) =>
266:             setKeyForm((f) => ({ ...f, label: e.target.value }))
267:           }
268:         />
269:         <input
270:           type="number"
271:           min={1}
272:           max={10000}
273:           title="Rate limit (requests/min)"
274:           placeholder="Rate limit"
275:           value={keyForm.rateLimit}
276:           onChange={(e) =>
277:             setKeyForm((f) => ({
278:               ...f,
279:               rateLimit: parseInt(e.target.value, 10) || 100,
280:             }))
281:           }
282:           style={{ maxWidth: 140 }}
283:         />
284:         <div className={styles.scopeChips}>
285:           {REQUESTABLE_SCOPES.map((scope) => (
286:             <button
287:               type="button"
288:               key={scope}
289:               className={
290:                 keyForm.scopes.includes(scope)
291:                   ? styles.scopeChipActive
292:                   : styles.scopeChip
293:               }
294:               onClick={() => toggleScope(scope)}
295:             >
296:               {scope}
297:             </button>
298:           ))}
299:         </div>
300:         {keyFormError && (
301:           <p className={styles.mgmtStatusError}>{keyFormError}</p>
302:         )}
303:         <button
304:           type="submit"
305:           className={styles.mgmtSubmitBtn}
306:           disabled={keySubmitting}
307:         >
308:           {keySubmitting ? "Submitting…" : "Request API key"}
309:         </button>
310:       </form>
311: 
312:       {/* One-time raw key reveal modal */}
313:       {adminRevealKey && (
314:         <div className={styles.keyModalBackdrop}>
315:           <div className={styles.keyModal}>
316:             <h4>Your API key</h4>
317:             <div className={styles.rawKeyBox}>
318:               <code>{adminRevealKey.key}</code>
319:               <button
320:                 type="button"
321:                 className={styles.scopeChip}
322:                 onClick={() => navigator.clipboard?.writeText(adminRevealKey.key)}
323:               >
324:                 Copy
325:               </button>
326:             </div>
327:             <p className={styles.mgmtStatusError} style={{ background: "none", padding: 0 }}>
328:               This is the only time this key will be shown. Store it securely.
329:             </p>
330:             <button
331:               type="button"
332:               className={styles.mgmtSubmitBtn}
333:               onClick={() => setRevealedKey(null)}
334:             >
335:               I've saved it
336:             </button>
337:           </div>
338:         </div>
339:       )}
340: 
341:       <div className={styles.mgmtSubHeading}>Request status</div>
342:       {keyRequests.length === 0 && (
343:         <p className={styles.mgmtStatus}>No API key requests yet.</p>
344:       )}
345:       {keyRequests.map((r) => (
346:         <div key={r.id} className={styles.mgmtRow}>
347:           <div>
348:             <div className={styles.mgmtRowTitle}>
349:               {r.label || "API key request"}
350:             </div>
351:             <div className={styles.mgmtRowSub}>
352:               scopes: {r.scopes?.join(", ")} · {r.rateLimit}/min ·{" "}
353:               {new Date(r.createdAt).toLocaleString()}
354:               {r.reviewNote ? ` · note: ${r.reviewNote}` : ""}
355:             </div>
356:           </div>
357:           <div className={styles.mgmtRowActions}>
358:             <span
359:               className={
360:                 r.status === "approved"
361:                   ? styles.mgmtBadgeOpen
362:                   : r.status === "rejected"
363:                     ? styles.mgmtBadgeClosed
364:                     : styles.mgmtBadgePending
365:               }
366:             >
367:               {r.status}
368:             </span>
369:             {r.canRevealKey && (
370:               <button
371:                 type="button"
372:                 className={styles.mgmtSubmitBtn}
373:                 onClick={() => handleRevealKey(r.id)}
374:               >
375:                 Reveal key
376:               </button>
377:             )}
378:           </div>
379:         </div>
380:       ))}
381:     </motion.div>
382:   );
383: };
384: 
385: export default AdminOverview;

(End of file - total 385 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.jsx</path>
<type>file</type>
<content>
1: import { useState } from "react";
2: import { Link } from "react-router-dom";
3: import { motion } from "framer-motion";
4: import { useAuth } from "../../features/auth/AuthContext";
5: import { useBrand } from "../../features/brand/BrandContext";
6: import { useMyCounter } from "../../features/staff/useMyCounter";
7: import { useMyStats } from "../../features/staff/useMyStats";
8: import ChangePassword from "../../components/ChangePassword/ChangePassword";
9: import CounterConsole from "./CounterConsole";
10: import TicketHistory from "./TicketHistory";
11: import ManagePanel from "./ManagePanel";
12: import AdminOverview from "./AdminOverview";
13: import ManagerOverview from "./ManagerOverview";
14: import MotionBackground from "../../components/MotionBackground/MotionBackground";
15: import logoUrl from "../../assets/logo.svg";
16: import styles from "./StaffHome.module.css";
17: 
18: const fadeUp = {
19:   hidden: { opacity: 0, y: 20 },
20:   visible: (i = 0) => ({
21:     opacity: 1,
22:     y: 0,
23:     transition: { duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
24:   }),
25: };
26: 
27: const StaffHome = () => {
28:   const { auth, logout } = useAuth();
29:   const { brand } = useBrand();
30:   const counterState = useMyCounter();
31:   const { stats, refetch: refetchStats } = useMyStats();
32: 
33:   const isAdmin = auth.role === "admin";
34:   const isManager = auth.role === "manager";
35: 
36:   // Admin: Overview (cross-branch) + Branches/Staff management
37:   // Manager: Overview (branch analytics) + Staff + Counters — NO counter console
38:   // Staff: Console + History
39:   const topTabs = isAdmin
40:     ? [
41:         { id: "overview", label: "Overview" },
42:         { id: "manage", label: "Manage" },
43:       ]
44:     : isManager
45:       ? [
46:           { id: "overview", label: "Overview" },
47:           { id: "manage", label: "Manage" },
48:         ]
49:       : [
50:           { id: "console", label: "Console" },
51:           { id: "history", label: "History" },
52:         ];
53: 
54:   // Hooks always run — early return only affects render output.
55:   const [activeTab, setActiveTab] = useState(topTabs[0].id);
56: 
57:   // Temp-password / invite-created accounts must rotate on first login.
58:   if (auth.mustChangePassword) {
59:     return (
60:       <section className={styles.page}>
61:         <MotionBackground />
62:         <div className={styles.container}>
63:           <div className={styles.logoHeader}>
64:             <img src={logoUrl} alt="" />
65:             <span>{brand.name}</span>
66:           </div>
67:           <motion.p className={styles.eyebrow} custom={0} variants={fadeUp}>
68:             № 010 — first sign-in
69:           </motion.p>
70:           <motion.h1 className={styles.heading} custom={1} variants={fadeUp}>
71:             Set a new password, {auth.name?.split(" ")[0]}.
72:           </motion.h1>
73:           <p style={{ color: "var(--text-muted, #6b7280)", marginBottom: "1.25rem" }}>
74:             Your temporary password must be changed before you can use the
75:             console.
76:           </p>
77:           <ChangePassword />
78:           <button className={styles.logoutBtn} onClick={logout} style={{ marginTop: "1rem" }}>
79:             Sign out
80:           </button>
81:         </div>
82:       </section>
83:     );
84:   }
85: 
86:   return (
87:     <section className={styles.page}>
88:       <MotionBackground />
89:       <div className={styles.container}>
90:         <div className={styles.logoHeader}>
91:           <img src={logoUrl} alt="" />
92:           <span>{brand.name}</span>
93:         </div>
94:         <motion.div
95:           className={styles.headerRow}
96:           initial="hidden"
97:           animate="visible"
98:         >
99:           <div>
100:             <motion.p className={styles.eyebrow} custom={0} variants={fadeUp}>
101:               № 010 — staff console
102:             </motion.p>
103:             <motion.h1 className={styles.heading} custom={1} variants={fadeUp}>
104:               Signed in, {auth.name.split(" ")[0]}.
105:             </motion.h1>
106:           </div>
107:           <motion.div
108:             className={styles.headerActions}
109:             custom={2}
110:             variants={fadeUp}
111:           >
112:             {auth.branch && (
113:               <Link
114:                 to={`/board/${auth.branch}`}
115:                 className={styles.boardLink}
116:                 target="_blank"
117:                 rel="noopener noreferrer"
118:               >
119:                 Live Board
120:               </Link>
121:             )}
122:             <button className={styles.logoutBtn} onClick={logout}>
123:               Sign out
124:             </button>
125:           </motion.div>
126:         </motion.div>
127: 
128:         {/* ── Top-level tabs ────────────────────────── */}
129:         {topTabs.length > 1 && (
130:           <div className={styles.topTabs} role="tablist">
131:             {topTabs.map((tab) => (
132:               <button
133:                 key={tab.id}
134:                 role="tab"
135:                 aria-selected={activeTab === tab.id}
136:                 className={
137:                   activeTab === tab.id ? styles.topTabActive : styles.topTab
138:                 }
139:                 onClick={() => setActiveTab(tab.id)}
140:               >
141:                 {tab.label}
142:               </button>
143:             ))}
144:           </div>
145:         )}
146: 
147:         {/* ── Overview tab (admin: cross-branch, manager: branch) ── */}
148:         {activeTab === "overview" && (
149:           <motion.div
150:             initial={{ opacity: 0, y: 20 }}
151:             animate={{ opacity: 1, y: 0 }}
152:             transition={{ duration: 0.5, delay: 0.3 }}
153:           >
154:             {isAdmin ? <AdminOverview /> : <ManagerOverview />}
155:           </motion.div>
156:         )}
157: 
158:         {/* ── Console tab (staff only) ──────────────── */}
159:         {activeTab === "console" && (
160:           <>
161:             <motion.div
162:               className={styles.statRow}
163:               initial={{ opacity: 0, y: 16 }}
164:               animate={{ opacity: 1, y: 0 }}
165:               transition={{ duration: 0.5, delay: 0.3 }}
166:             >
167:               <div className={styles.statCard}>
168:                 <span className={styles.statValue}>
169:                   {stats?.ticketsServedToday ?? "—"}
170:                 </span>
171:                 <span className={styles.statLabel}>served today</span>
172:               </div>
173:             </motion.div>
174: 
175:             <motion.div
176:               initial={{ opacity: 0, y: 20 }}
177:               animate={{ opacity: 1, y: 0 }}
178:               transition={{ duration: 0.5, delay: 0.4 }}
179:             >
180:               <CounterConsole counterState={counterState} onServed={refetchStats} />
181:             </motion.div>
182:           </>
183:         )}
184: 
185:         {/* ── History tab (staff only) ──────────────── */}
186:         {activeTab === "history" && (
187:           <motion.div
188:             initial={{ opacity: 0, y: 20 }}
189:             animate={{ opacity: 1, y: 0 }}
190:             transition={{ duration: 0.5, delay: 0.4 }}
191:           >
192:             <TicketHistory />
193:           </motion.div>
194:         )}
195: 
196:         {/* ── Manage tab (admin + manager) ──────────── */}
197:         {activeTab === "manage" && (
198:           <motion.div
199:             initial={{ opacity: 0, y: 20 }}
200:             animate={{ opacity: 1, y: 0 }}
201:             transition={{ duration: 0.5, delay: 0.3 }}
202:           >
203:             <ManagePanel />
204:           </motion.div>
205:         )}
206:       </div>
207:     </section>
208:   );
209: };
210: 
211: export default StaffHome;

(End of file - total 211 lines)
</content>
```

---

## Assistant (Plan · MiMo-V2.6-Flash Free · 20.4s)

_Thinking:_

I found the issue. The user tried to create a manager from the admin management dashboard, but a staff account was created instead. Let me trace through:

1. `StaffSubTab.jsx` - the form under "Manage" tab says "Add staff" and always calls `createStaff` → `POST /staff`. The password field is labeled "Temporary password" which might make the user think they're creating a manager with temp password.

2. There's NO frontend manager creation form yet - AdminOverview even says "Manager accounts are created via the dedicated Manager flow (coming in WP4)" and "Manager creation form is deferred to WP4".

3. Backend has `POST /api/managers` with createManager which supports temp password - but frontend never calls it.

4. The Manage panel only has StaffSubTab for creating staff.

So the root cause: the UI only offers "Add staff" form (with "Temporary password" label), and there's no manager create form in the frontend. Backend manager creation exists but is unwired from the UI.

The user asked where the logic is so they can go through it themselves. They're in plan mode - just want to know where to read.

## Root cause

There is **no manager-create form in the frontend**. The only account form on the admin Manage panel always creates **Staff**.

### Read this path (what actually runs)

1. **UI form (always staff)** — `frontend/src/pages/StaffHome/StaffSubTab.jsx`
   - Heading is “Add staff” (line 190)
   - Password field label is “Temporary password” (line 208) — easy to misread as manager provisioning
   - Submit always calls `createStaff(...)` (line 92) → `POST /staff`

2. **API helper** — `frontend/src/features/staff/manageApi.js:15`  
   `createStaff` → `POST /staff`

3. **Backend creates Staff only** — `backend/src/controllers/staff.controller.js:81`  
   `createStaff` → `Staff.create({ ... })` (line 106), dual password path + temp password at lines 96–104

4. **Manage tab wiring** — `frontend/src/pages/StaffHome/StaffHome.jsx:196–204` → `ManagePanel` (only staff UI)

### Manager logic exists but is **not wired to the dashboard**

| Piece | Path |
|---|---|
| Route | `backend/src/routes/manager.routes.js:26` — `POST /api/managers` |
| Controller | `backend/src/controllers/manager.controller.js:36` — `createManager` (temp password at 60–64 → `Manager.create` at 66) |
| Temp password helper | `backend/src/utils/password.js` |
| Frontend API | **Missing** — no `createManager` in `manageApi.js` |
| UI form | **Missing** — `AdminOverview.jsx:32` still says deferred; empty-state text at 233–234 (“coming in WP4”) |

So: backend manager provisioning works via `POST /api/managers`, but the dashboard never calls it — the only form submits `POST /staff`.

If you want, next step is wiring a Manager create form (name, email, branch, optional/temp password) to `/api/managers`.

---

## User

admin is meant to create a manger account not a staff account.
So wire it into  the frontend

---

## Assistant (Build · MiMo-V2.6-Flash Free · 18.9s)

_Thinking:_

The user wants me to wire the manager creation form into the frontend so admins can create manager accounts. Let me look at the existing structure and implement:

1. Add `createManager` API function to manageApi.js
2. Add a manager create form to AdminOverview.jsx (or a dedicated component)
3. Possibly update ManagePanel to have staff vs manager tabs for admins

Let me read ManagePanel and related files to understand the structure.

Wiring manager creation into the admin dashboard. Checking `ManagePanel` and related pieces first.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagePanel.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagePanel.jsx</path>
<type>file</type>
<content>
1: import { useState } from "react";
2: import { useAuth } from "../../features/auth/AuthContext";
3: import StaffSubTab from "./StaffSubTab";
4: import CounterSubTab from "./CounterSubTab";
5: import styles from "./StaffHome.module.css";
6: 
7: /**
8:  * ManagePanel — management interface for manager/admin roles.
9:  *
10:  * Admin sees: Staff sub-tab only (branch management is in AdminOverview)
11:  * Manager sees: Staff + Counters sub-tabs
12:  */
13: const ManagePanel = () => {
14:   const { auth } = useAuth();
15:   const isAdmin = auth.role === "admin";
16: 
17:   const subTabs = isAdmin
18:     ? [{ id: "staff", label: "Staff" }]
19:     : [
20:         { id: "staff", label: "Staff" },
21:         { id: "counters", label: "Counters" },
22:       ];
23: 
24:   const [activeTab, setActiveTab] = useState(subTabs[0].id);
25: 
26:   return (
27:     <div className={styles.mgmtPanel}>
28:       <div className={styles.mgmtHeader}>
29:         <p className={styles.mgmtEyebrow}>№ 012 — management</p>
30:       </div>
31: 
32:       {subTabs.length > 1 && (
33:         <div className={styles.mgmtTabs} role="tablist">
34:           {subTabs.map((tab) => (
35:             <button
36:               key={tab.id}
37:               role="tab"
38:               aria-selected={activeTab === tab.id}
39:               className={
40:                 activeTab === tab.id ? styles.mgmtTabActive : styles.mgmtTab
41:               }
42:               onClick={() => setActiveTab(tab.id)}
43:             >
44:               {tab.label}
45:             </button>
46:           ))}
47:         </div>
48:       )}
49: 
50:       <div className={styles.mgmtTabContent}>
51:         {activeTab === "staff" && <StaffSubTab />}
52:         {activeTab === "counters" && <CounterSubTab />}
53:       </div>
54:     </div>
55:   );
56: };
57: 
58: export default ManagePanel;

(End of file - total 58 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/validators/manager.validator.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/validators/manager.validator.js</path>
<type>file</type>
<content>
1: import { body } from "express-validator";
2: 
3: /**
4:  * POST /api/managers — admin creates a manager.
5:  * `branch` is required; `bank` is denormalized from Branch.bank server-side
6:  * (never trusted from the body). Password is optional — if omitted the
7:  * server generates a temp password returned once to the creator.
8:  */
9: export const createManagerValidator = [
10:   body("name")
11:     .trim()
12:     .notEmpty()
13:     .withMessage("Manager name is required")
14:     .isLength({ min: 2, max: 100 })
15:     .withMessage("Name must be between 2 and 100 characters"),
16:   body("email")
17:     .trim()
18:     .notEmpty()
19:     .withMessage("Email is required")
20:     .isEmail()
21:     .withMessage("Please provide a valid email")
22:     .normalizeEmail(),
23:   body("password")
24:     .optional()
25:     .isLength({ min: 8 })
26:     .withMessage("Password must be at least 8 characters"),
27:   body("branch")
28:     .notEmpty()
29:     .withMessage("Branch is required")
30:     .isMongoId()
31:     .withMessage("Invalid branch ID"),
32: ];
33: 
34: /** PATCH /api/managers/:managerId/branch — reassign a manager's branch. */
35: export const assignManagerBranchValidator = [
36:   body("branchId")
37:     .notEmpty()
38:     .withMessage("Branch ID is required")
39:     .isMongoId()
40:     .withMessage("Invalid branch ID"),
41: ];

(End of file - total 41 lines)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/frontend/src/features/staff",
  "pattern": "fetchManagers|createManager|/managers"
}
```

**Output:**
```
No files found
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/features/staff/adminApi.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/features/staff/adminApi.js</path>
<type>file</type>
<content>
1: import { apiClient } from "../../lib/apiClient";
2: 
3: /**
4:  * Admin & analytics API — JWT `/api/*` surface (Phase 13 WP6).
5:  * Bank scope comes from Admin.bank / Manager.branch server-side.
6:  */
7: 
8: /** Admin overview — cross-branch dashboard for this admin's bank */
9: export const fetchAdminOverview = (token) =>
10:   apiClient.get("/admin/overview", { token });
11: 
12: /** Branch analytics — live dashboard for a single branch */
13: export const fetchBranchAnalytics = (branchId, token) =>
14:   apiClient.get(`/analytics/branch/${branchId}`, { token });
15: 
16: /** Branch staff performance — tickets served per staff member today */
17: export const fetchBranchStaffPerformance = (branchId, token) =>
18:   apiClient.get(`/analytics/branch/${branchId}/staff-performance`, { token });
19: 
20: /** Create a new branch (admin) */
21: export const createBranch = (data, token) =>
22:   apiClient.post("/branches", data, { token });
23: 
24: /** List branches (admin) */
25: export const fetchBranches = (token) =>
26:   apiClient.get("/branches", { token });

(End of file - total 26 lines)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome",
  "pattern": "mgmtSubHeading|mgmtInlineForm|mgmtInlineSelect|tempPassword|Temp"
}
```

**Output:**
```
Found 26 matches
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx:
  Line 25:  * Password is optional; server may return a one-time tempPassword.

  Line 190:       <div className={styles.mgmtSubHeading}>Add staff</div>

  Line 191:       <form onSubmit={handleCreate} className={styles.mgmtInlineForm}>

  Line 208:           placeholder="Temporary password"

  Line 217:             className={styles.mgmtInlineSelect}


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/CounterSubTab.jsx:
  Line 133:                 className={styles.mgmtInlineSelect}

  Line 151:       <div className={styles.mgmtSubHeading}>Add counter</div>

  Line 152:       <form onSubmit={handleCreate} className={styles.mgmtInlineForm}>


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.jsx:
  Line 57:   // Temp-password / invite-created accounts must rotate on first login.


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerOverview.jsx:
  Line 114:           <div className={styles.mgmtSubHeading}>Queue status</div>

  Line 136:         <div className={styles.mgmtSubHeading}>Counters</div>

  Line 179:         <div className={styles.mgmtSubHeading}>Staff performance</div>


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx:
  Line 183:       <div className={styles.mgmtSubHeading}>Branches</div>

  Line 204:       <div className={styles.mgmtSubHeading}>Add branch</div>

  Line 205:       <form onSubmit={handleCreateBranch} className={styles.mgmtInlineForm}>

  Line 230:       <div className={styles.mgmtSubHeading}>Managers</div>

  Line 255:       <div className={styles.mgmtSubHeading}>API key access</div>

  Line 261:       <form onSubmit={handleRequestKey} className={styles.mgmtInlineForm}>

  Line 341:       <div className={styles.mgmtSubHeading}>Request status</div>


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css:
  Line 432:   .mgmtInlineForm {

  Line 437:   .mgmtInlineForm input {

  Line 568: .mgmtSubHeading {

  Line 637: .mgmtInlineForm {

  Line 643: .mgmtInlineForm input {

  Line 653: .mgmtInlineForm input:focus {

  Line 658: .mgmtInlineSelect {

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/admin.controller.js",
  "limit": 80
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/admin.controller.js</path>
<type>file</type>
<content>
1: import Staff from "../models/staff.model.js";
2: import Manager from "../models/manager.model.js";
3: import Branch from "../models/branch.model.js";
4: import { sendSuccess } from "../utils/response.js";
5: 
6: /**
7:  * GET /api/v1/admin/overview
8:  *
9:  * Bank-scoped admin-only endpoint that returns a cross-branch overview
10:  * for THIS admin's bank only (Option B multi-tenancy):
11:  * - All branches belonging to req.bankName (if v1/API-key context)
12:  * - All managers whose branch is in req.bankBranchIds
13:  * - Summary totals scoped to that bank
14:  *
15:  * Legacy JWT admins without req.bankName keep the old unscoped behavior
16:  * (single-deployment / non-tenanted mode).
17:  *
18:  * After the four-model split, managers live in the Manager collection
19:  * (no role field to filter on).
20:  */
21: export const getAdminOverview = async (req, res, next) => {
22:   try {
23:     // JWT path: only admins. API-key path (v1): the key itself is the
24:     // bank identity — requireScope("analytics:read") already gated access,
25:     // and resolveStaffUser always sets role "staff" (not "admin").
26:     const isApiKeyIntegration = !!req.apiKey;
27:     if (!isApiKeyIntegration && req.role !== "admin") {
28:       const error = new Error("Access denied: admin only");
29:       error.statusCode = 403;
30:       return next(error);
31:     }
32: 
33:     // Bank scope: API-key path uses key.bankName; JWT dashboard uses Admin.bank.
34:     const bank = req.bankName || req.user?.bank || null;
35: 
36:     const branchFilter = { isActive: true };
37:     if (bank) {
38:       branchFilter.bank = bank;
39:     }
40: 
41:     let managerFilter = { isActive: true };
42:     if (bank) {
43:       // JWT path has no bankScope middleware — filter Manager by denormalized bank.
44:       // API-key path may also have bankBranchIds from bankScope.
45:       if (Array.isArray(req.bankBranchIds) && req.bankBranchIds.length >= 0 && req.bankName) {
46:         managerFilter = {
47:           ...managerFilter,
48:           branch: { $in: req.bankBranchIds },
49:         };
50:       } else {
51:         managerFilter = { ...managerFilter, bank };
52:       }
53:     }
54: 
55:     const [branches, managers] = await Promise.all([
56:       Branch.find(branchFilter).sort({ createdAt: -1 }),
57:       Manager.find(managerFilter)
58:         .select("name email branch bank")
59:         .populate("branch", "name location"),
60:     ]);
61: 
62:     // Staff count: prefer bank branch ids (API key) or this bank's branches (JWT).
63:     let staffBranchFilter = { isActive: true };
64:     if (bank) {
65:       if (Array.isArray(req.bankBranchIds) && req.bankName) {
66:         staffBranchFilter = { isActive: true, branch: { $in: req.bankBranchIds } };
67:       } else {
68:         const bankBranchIds = branches.map((b) => b._id);
69:         staffBranchFilter = { isActive: true, branch: { $in: bankBranchIds } };
70:       }
71:     }
72:     const totalStaff = await Staff.countDocuments(staffBranchFilter);
73: 
74:     // Count staff per manager's branch (Staff collection = all staff)
75:     const managerBranchIds = managers.map((m) => m.branch?._id).filter(Boolean);
76:     const staffCounts = await Staff.aggregate([
77:       {
78:         $match: {
79:           isActive: true,
80:           branch: { $in: managerBranchIds },

(Showing lines 1-80 of 123. Use offset=81 to continue.)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/backend/src/controllers/admin.controller.js",
  "pattern": "totalManagers|managers"
}
```

**Output:**
```
Found 18 matches
/home/gamp/Desktop/cue/backend/src/controllers/staff.controller.js:
  Line 21:  * Bank scoping: managers → own branch; admins → branches where


/home/gamp/Desktop/cue/backend/src/controllers/ticket.controller.js:
  Line 17:  * already blocks managers/admins — this catches any path that reaches


/home/gamp/Desktop/cue/backend/src/controllers/staffImport.controller.js:
  Line 64:         // Staff collection only — managers/admins are not importable via CSV.


/home/gamp/Desktop/cue/backend/src/controllers/manager.controller.js:
  Line 33:  * POST /api/managers — admin only (route already authorize("admin")).

  Line 99:  * GET /api/managers — admin only; bank-scoped to the admin's tenant.

  Line 110:     const [total, managers] = await Promise.all([

  Line 118:     const items = managers.map((m) => ({

  Line 134:  * PATCH /api/managers/:managerId/branch — admin reassigns branch.

  Line 184:  * DELETE /api/managers/:managerId — soft-deactivate (admin).


/home/gamp/Desktop/cue/backend/src/controllers/admin.controller.js:
  Line 12:  * - All managers whose branch is in req.bankBranchIds

  Line 18:  * After the four-model split, managers live in the Manager collection

  Line 55:     const [branches, managers] = await Promise.all([

  Line 75:     const managerBranchIds = managers.map((m) => m.branch?._id).filter(Boolean);

  Line 91:     // Enrich managers with their staff count

  Line 92:     const enrichedManagers = managers.map((m) => ({

  Line 108:           totalManagers: managers.length,

  Line 117:         managers: enrichedManagers,


/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js:
  Line 15:  * invite issue/redeem for managers and staff, /me, and change-password.

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css",
  "limit": 50
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css</path>
<type>file</type>
<content>
1: .page {
2:   min-height: 85vh;
3:   background: var(--paper);
4:   padding: 4rem 1.5rem;
5: }
6: 
7: .container {
8:   max-width: 780px;
9:   margin: 0 auto;
10: }
11: 
12: .headerRow {
13:   display: flex;
14:   align-items: flex-start;
15:   justify-content: space-between;
16:   gap: 1rem;
17:   margin-bottom: 2rem;
18: }
19: 
20: .logoHeader {
21:   display: flex;
22:   align-items: center;
23:   gap: 0.6rem;
24:   margin-bottom: 1.5rem;
25: }
26: .logoHeader img {
27:   width: 40px;
28:   height: 40px;
29: }
30: .logoHeader span {
31:   font-family: var(--font-display);
32:   font-weight: 700;
33:   font-size: 1.35rem;
34:   color: var(--paper-ink);
35: }
36: 
37: .eyebrow {
38:   font-family: var(--font-mono);
39:   color: var(--brand-accent);
40:   font-size: 0.85rem;
41:   letter-spacing: 0.08em;
42:   text-transform: uppercase;
43:   margin-bottom: 0.75rem;
44: }
45: 
46: .heading {
47:   font-size: var(--step-3);
48: }
49: 
50: .headerActions {

(Showing lines 1-50 of 942. Use offset=51 to continue.)
</content>
```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 12.5s)

_Thinking:_

I need to wire manager creation into the frontend. Plan:

1. Add `createManager` and `fetchManagers` (maybe) to `manageApi.js` or `adminApi.js`
2. Add a Managers sub-tab to ManagePanel for admin (so they can create managers)
3. Create a ManagerSubTab component similar to StaffSubTab
4. Update AdminOverview empty state text and maybe show create form there too

Best approach: Add "Managers" sub-tab in ManagePanel for admin only, with a ManagerSubTab that:
- Lists managers (GET /managers)
- Create form: name, email, branch (dropdown), password optional (temp if blank)
- Shows one-time tempPassword after create
- Deactivate manager

Also update AdminOverview empty state that says "coming in WP4".

Looking at StaffSubTab - password field is `required` which means server never generates temp password from UI currently (user must type something). For manager form, make password optional so blank → server temp password.

Also AdminOverview has managers list but no create - I could either:
A. Put create form in AdminOverview under Managers section
B. Put Managers tab in ManagePanel

Option A is simpler - one place for admin overview. But Manage is where account creation lives (staff is there). Better UX: Managers sub-tab in ManagePanel for admin.

Actually re-read the user: "admin is meant to create a manager account not a staff account. So wire it into the frontend"

So they want the ability to create managers. I'll:
1. Add createManager to manageApi.js
2. Create ManagerSubTab.jsx 
3. Wire into ManagePanel as Managers tab for admin
4. Update AdminOverview empty state

Also need fetch managers - GET /managers returns paginated response. Check paginatedResponse shape.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/utils/pagination.js",
  "limit": 40
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/utils/pagination.js</path>
<type>file</type>
<content>
1: /**
2:  * Parse pagination params from query string.
3:  * @param {Object} query - req.query
4:  * @param {Object} opts - defaults
5:  * @param {number} opts.defaultLimit - default page size (default 25)
6:  * @param {number} opts.maxLimit - cap on page size (default 100)
7:  * @returns {{ page: number, limit: number, skip: number }}
8:  */
9: export const parsePagination = (query, { defaultLimit = 25, maxLimit = 100 } = {}) => {
10:   const page = Math.max(1, parseInt(query.page, 10) || 1);
11:   const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
12:   const skip = (page - 1) * limit;
13:   return { page, limit, skip };
14: };
15: 
16: /**
17:  * Format a paginated response.
18:  * @param {Array} docs - the slice of documents
19:  * @param {number} total - total count matching the filter
20:  * @param {number} page - current page
21:  * @param {number} limit - page size
22:  * @returns {{ data: Array, meta: { page, limit, total, totalPages } }}
23:  */
24: export const paginatedResponse = (docs, total, page, limit) => ({
25:   data: docs,
26:   meta: {
27:     page,
28:     limit,
29:     total,
30:     totalPages: Math.ceil(total / limit),
31:   },
32: });

(End of file - total 32 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/admin.controller.js",
  "limit": 50,
  "offset": 80
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/admin.controller.js</path>
<type>file</type>
<content>
80:           branch: { $in: managerBranchIds },
81:         },
82:       },
83:       { $group: { _id: "$branch", count: { $sum: 1 } } },
84:     ]);
85: 
86:     const staffCountByBranch = {};
87:     staffCounts.forEach((entry) => {
88:       staffCountByBranch[entry._id.toString()] = entry.count;
89:     });
90: 
91:     // Enrich managers with their staff count
92:     const enrichedManagers = managers.map((m) => ({
93:       id: m._id,
94:       name: m.name,
95:       email: m.email,
96:       branch: m.branch
97:         ? { id: m.branch._id, name: m.branch.name, location: m.branch.location }
98:         : null,
99:       staffCount: m.branch ? staffCountByBranch[m.branch._id.toString()] || 0 : 0,
100:     }));
101: 
102:     return sendSuccess(res, {
103:       statusCode: 200,
104:       message: "Admin overview fetched successfully",
105:       data: {
106:         summary: {
107:           totalBranches: branches.length,
108:           totalManagers: managers.length,
109:           totalStaff,
110:         },
111:         branches: branches.map((b) => ({
112:           id: b._id,
113:           name: b.name,
114:           location: b.location,
115:           dayOpen: b.dayOpen,
116:         })),
117:         managers: enrichedManagers,
118:       },
119:     });
120:   } catch (error) {
121:     next(error);
122:   }
123: };

(End of file - total 123 lines)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css",
  "pattern": "mgmtStatusError|mgmtBadgePending|keyModal"
}
```

**Output:**
```
Found 18 matches
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx:
  Line 132:   if (error) return <p className={styles.mgmtStatusError}>{error}</p>;

  Line 229:         {formError && <p className={styles.mgmtStatusError}>{formError}</p>}


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css:
  Line 560: .mgmtStatusError {

  Line 616: .mgmtBadgePending {

  Line 632: .mgmtBadgePending {

  Line 898: .keyModalBackdrop {

  Line 909: .keyModal {

  Line 920: .keyModal h4 {


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/CounterSubTab.jsx:
  Line 101:       {error && <p className={styles.mgmtStatusError}>{error}</p>}

  Line 160:           <p className={styles.mgmtStatusError}>{createError}</p>


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx:
  Line 157:   if (error) return <p className={styles.mgmtStatusError}>{error}</p>;

  Line 218:           <p className={styles.mgmtStatusError}>{branchFormError}</p>

  Line 301:           <p className={styles.mgmtStatusError}>{keyFormError}</p>

  Line 314:         <div className={styles.keyModalBackdrop}>

  Line 315:           <div className={styles.keyModal}>

  Line 327:             <p className={styles.mgmtStatusError} style={{ background: "none", padding: 0 }}>

  Line 364:                     : styles.mgmtBadgePending


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerOverview.jsx:
  Line 56:   if (error) return <p className={styles.mgmtStatusError}>{error}</p>;

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css",
  "limit": 80,
  "offset": 560
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css</path>
<type>file</type>
<content>
560: .mgmtStatusError {
561:   color: var(--brand-alert);
562:   font-size: 0.85rem;
563:   background: rgba(193, 67, 43, 0.1);
564:   padding: 0.5rem 0.75rem;
565:   border-radius: 8px;
566: }
567: 
568: .mgmtSubHeading {
569:   font-family: var(--font-mono);
570:   font-size: 0.75rem;
571:   letter-spacing: 0.08em;
572:   text-transform: uppercase;
573:   color: var(--paper-soft);
574:   margin: 1.5rem 0 0.75rem;
575: }
576: 
577: .mgmtRow {
578:   display: flex;
579:   align-items: flex-start;
580:   justify-content: space-between;
581:   gap: 1rem;
582:   padding: 0.85rem 0;
583:   border-bottom: 1px solid var(--paper);
584:   font-size: 0.9rem;
585:   flex-wrap: wrap;
586: }
587: 
588: .mgmtRowTitle {
589:   font-weight: 600;
590:   color: var(--ink);
591: }
592: 
593: .mgmtRowSub {
594:   font-size: 0.8rem;
595:   color: var(--paper-soft);
596: }
597: 
598: .mgmtRowActions {
599:   display: flex;
600:   align-items: center;
601:   gap: 0.75rem;
602:   flex-shrink: 0;
603: }
604: 
605: .mgmtLinkBtn {
606:   font-size: 0.8rem;
607:   font-weight: 600;
608:   color: var(--brand-primary);
609: }
610: .mgmtLinkBtn:hover {
611:   text-decoration: underline;
612: }
613: 
614: .mgmtBadgeOpen,
615: .mgmtBadgeClosed,
616: .mgmtBadgePending {
617:   font-family: var(--font-mono);
618:   font-size: 0.7rem;
619:   letter-spacing: 0.05em;
620:   text-transform: uppercase;
621:   padding: 0.2rem 0.55rem;
622:   border-radius: 100px;
623: }
624: .mgmtBadgeOpen {
625:   background: var(--brand-primary);
626:   color: var(--ink);
627: }
628: .mgmtBadgeClosed {
629:   background: var(--paper);
630:   color: var(--paper-soft);
631: }
632: .mgmtBadgePending {
633:   background: rgba(201, 162, 39, 0.2);
634:   color: var(--brand-accent);
635: }
636: 
637: .mgmtInlineForm {
638:   display: flex;
639:   flex-wrap: wrap;

(Showing lines 560-639 of 942. Use offset=640 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/CounterSubTab.jsx",
  "limit": 80
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/CounterSubTab.jsx</path>
<type>file</type>
<content>
1: import { useCallback, useEffect, useState } from "react";
2: import { motion } from "framer-motion";
3: import { useAuth } from "../../features/auth/AuthContext";
4: import {
5:   fetchBranchCounters,
6:   createCounter,
7:   assignStaffToCounter,
8:   unassignStaffFromCounter,
9:   fetchStaffList,
10: } from "../../features/staff/manageApi";
11: import { ApiError } from "../../lib/apiClient";
12: import styles from "./StaffHome.module.css";
13: 
14: /**
15:  * CounterSubTab — counter list, create form, staff assignment.
16:  * Used inside ManagePanel for manager/admin.
17:  *
18:  * JWT Bearer (WP6) — staff list is bank/branch-scoped server-side.
19:  * Staff role field is gone; Server still returns collection as role-ish
20:  * data or Staff docs are always kind staff — filter by branch only.
21:  */
22: const CounterSubTab = () => {
23:   const { auth } = useAuth();
24:   const token = auth.token;
25:   const [counters, setCounters] = useState([]);
26:   const [staffList, setStaffList] = useState([]);
27:   const [loading, setLoading] = useState(true);
28:   const [error, setError] = useState(null);
29:   const [label, setLabel] = useState("");
30:   const [creating, setCreating] = useState(false);
31:   const [createError, setCreateError] = useState(null);
32: 
33:   const load = useCallback(async () => {
34:     try {
35:       const [countersRes, staffRes] = await Promise.all([
36:         fetchBranchCounters(auth.branch, token),
37:         fetchStaffList(token),
38:       ]);
39:       setCounters(countersRes.data);
40:       // Staff collection is Staff-only after the split — no role check needed.
41:       setStaffList(
42:         staffRes.data.filter(
43:           (s) =>
44:             s.branch?._id === auth.branch || s.branch === auth.branch,
45:         ),
46:       );
47:       setError(null);
48:     } catch (err) {
49:       setError(err.message || "Couldn't load counters.");
50:     } finally {
51:       setLoading(false);
52:     }
53:   }, [token, auth.branch]);
54: 
55:   useEffect(() => {
56:     load();
57:   }, [load]);
58: 
59:   const handleCreate = async (e) => {
60:     e.preventDefault();
61:     setCreateError(null);
62:     setCreating(true);
63:     try {
64:       await createCounter({ label, branch: auth.branch }, token);
65:       setLabel("");
66:       await load();
67:     } catch (err) {
68:       setCreateError(
69:         err instanceof ApiError ? err.message : "Couldn't create counter.",
70:       );
71:     } finally {
72:       setCreating(false);
73:     }
74:   };
75: 
76:   const handleAssign = async (counterId, staffId) => {
77:     if (!staffId) return;
78:     try {
79:       await assignStaffToCounter(counterId, staffId, token);
80:       await load();

(Showing lines 1-80 of 174. Use offset=81 to continue.)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/backend/src/app.js",
  "pattern": "managers"
}
```

**Output:**
```
Found 35 matches
/home/gamp/Desktop/cue/backend/src/routes/manager.routes.js:
  Line 19:  * Managers do NOT have routes here — they cannot create other managers.


/home/gamp/Desktop/cue/backend/src/app.js:
  Line 78: app.use("/api/managers", managerRouter);


/home/gamp/Desktop/cue/backend/src/scripts/migrateSplitStaff.js:
  Line 18:  *   role "manager"    → managers      (Manager model, bank denormalized from branch)

  Line 48:   // Denormalize bank for admins/managers via their branch → Branch.bank.

  Line 81:   const managers = [];

  Line 90:     managers.push({ ...rest, branch: doc.branch, bank });

  Line 109:   report("managers", managers, skippedManagers);

  Line 112:     `  (superadmins/admins/managers who can't migrate stay in staffs untouched)`,

  Line 136:   await insert(Manager, managers, "managers");

  Line 152:     ...managers.map((d) => d._id),


/home/gamp/Desktop/cue/backend/src/middlewares/resolveStaffUser.js:
  Line 12:  *   1. X-Staff-Id header (always a Staff id — managers/admins don't


/home/gamp/Desktop/cue/backend/src/controllers/staff.controller.js:
  Line 21:  * Bank scoping: managers → own branch; admins → branches where


/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js:
  Line 15:  * invite issue/redeem for managers and staff, /me, and change-password.


/home/gamp/Desktop/cue/backend/src/validators/staff.validator.js:
  Line 8:  * Managers are created via POST /api/managers; admins self-register.

  Line 31:   // Required for admins; managers always use their own branch (ignored in body).


/home/gamp/Desktop/cue/backend/src/validators/auth.validator.js:
  Line 98:   // branch required only for admins (managers use their own branch).


/home/gamp/Desktop/cue/backend/src/routes/v1/staff.routes.js:
  Line 24:  * bankScope still isolates by key.bankName; managers are scoped to their


/home/gamp/Desktop/cue/backend/src/validators/manager.validator.js:
  Line 4:  * POST /api/managers — admin creates a manager.

  Line 34: /** PATCH /api/managers/:managerId/branch — reassign a manager's branch. */


/home/gamp/Desktop/cue/backend/src/controllers/admin.controller.js:
  Line 12:  * - All managers whose branch is in req.bankBranchIds

  Line 18:  * After the four-model split, managers live in the Manager collection

  Line 55:     const [branches, managers] = await Promise.all([

  Line 75:     const managerBranchIds = managers.map((m) => m.branch?._id).filter(Boolean);

  Line 91:     // Enrich managers with their staff count

  Line 92:     const enrichedManagers = managers.map((m) => ({

  Line 108:           totalManagers: managers.length,

  Line 117:         managers: enrichedManagers,


/home/gamp/Desktop/cue/backend/src/controllers/ticket.controller.js:
  Line 17:  * already blocks managers/admins — this catches any path that reaches


/home/gamp/Desktop/cue/backend/src/controllers/manager.controller.js:
  Line 33:  * POST /api/managers — admin only (route already authorize("admin")).

  Line 99:  * GET /api/managers — admin only; bank-scoped to the admin's tenant.

  Line 110:     const [total, managers] = await Promise.all([

  Line 118:     const items = managers.map((m) => ({

  Line 134:  * PATCH /api/managers/:managerId/branch — admin reassigns branch.

  Line 184:  * DELETE /api/managers/:managerId — soft-deactivate (admin).


/home/gamp/Desktop/cue/backend/src/controllers/staffImport.controller.js:
  Line 64:         // Staff collection only — managers/admins are not importable via CSV.

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/app.js",
  "limit": 50
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/app.js</path>
<type>file</type>
<content>
1: import express, { json, urlencoded } from "express";
2: import compression from "compression";
3: import errorHandler from "./middlewares/error.middleware.js";
4: import notFoundHandler from "./middlewares/notFound.js";
5: import auth_router from "./routes/auth.routes.js";
6: import branch_router from "./routes/branch.route.js";
7: import userRouter from "./routes/user.routes.js";
8: import staff_router from "./routes/staff.routes.js";
9: import queue_router from "./routes/queue.routes.js";
10: import counter_router from "./routes/counter.routes.js";
11: import ticketRouter from "./routes/ticket.routes.js";
12: import analyticsRouter from "./routes/analytics.routes.js";
13: import boardRouter from "./routes/board.routes.js";
14: import kioskRouter from "./routes/kiosk.routes.js";
15: import appointmentRouter from "./routes/appointment.routes.js";
16: import contactRouter from "./routes/contact.routes.js";
17: import webhookRouter from "./routes/webhook.routes.js";
18: import staffImportRouter from "./routes/staffImport.routes.js";
19: import exportRouter from "./routes/export.routes.js";
20: import advancedAnalyticsRouter from "./routes/advancedAnalytics.routes.js";
21: import brandRouter from "./routes/brand.routes.js";
22: import platformRouter from "./routes/platform/index.js";
23: import managerRouter from "./routes/manager.routes.js";
24: import adminOverviewRouter from "./routes/admin.overview.routes.js";
25: import adminKeyRequestRouter from "./routes/adminApiKeyRequest.routes.js";
26: import v1Router from "./routes/v1/index.js";
27: import { authenticateApiKey, apiKeyRateLimit } from "./middlewares/apiKey.middleware.js";
28: import { tenantMatch } from "./middlewares/tenantMatch.js";
29: import { sendSuccess } from "./utils/response.js";
30: import cors from "cors";
31: import helmet from "helmet";
32: import swaggerUi from "swagger-ui-express";
33: import { readFileSync } from "fs";
34: import { fileURLToPath } from "url";
35: import { dirname, join } from "path";
36: import * as yaml from "js-yaml";
37: 
38: const __filename = fileURLToPath(import.meta.url);
39: const __dirname = dirname(__filename);
40: const openapiSpec = yaml.load(
41:   readFileSync(join(__dirname, "docs", "openapi.yaml"), "utf-8")
42: );
43: 
44: const app = express();
45: app.use(helmet());
46: app.use(compression());
47: app.use(
48:   cors({
49:     origin: process.env.CORS_ORIGIN || "http://localhost:5173",
50:     credentials: true,

(Showing lines 1-50 of 149. Use offset=51 to continue.)
</content>
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "frontend/src/**/*ManagerSub*"
}
```

**Output:**
```
No files found
```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 11.1s)

_Thinking:_

I need to wire manager creation into the frontend. Plan:

1. Add `createManager` and `fetchManagers` (and maybe `deactivateManager`) to `manageApi.js`
2. Create `ManagerSubTab.jsx` for admin to list/create managers
3. Wire it into `ManagePanel` as a "Managers" sub-tab for admin
4. Update `AdminOverview` empty state text (remove "coming in WP4")

Also check GET /managers response shape - it uses `paginatedResponse` which returns `{ data: items, meta }` but sendSuccess wraps as:
```
sendSuccess(res, { message, ...paginatedResponse(items, total, page, limit) })
```

Need to check sendSuccess structure.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/utils/response.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/utils/response.js</path>
<type>file</type>
<content>
1: export const sendSuccess = (
2:   res,
3:   {
4:     statusCode = 200,
5:     message = "Request successful",
6:     data = null,
7:     meta = null,
8:   } = {},
9: ) => {
10:   const payload = { status: "success", message };
11:   if (data !== null) payload.data = data;
12:   if (meta !== null) payload.meta = meta;
13:   return res.status(statusCode).json(payload);
14: };
15: 
16: export const sendError = (
17:   res,
18:   { statusCode = 500, message = "Something went wrong", errors = null } = {},
19: ) => {
20:   const payload = { status: "error", message };
21:   if (errors !== null) payload.errors = errors;
22:   return res.status(statusCode).json(payload);
23: };

(End of file - total 23 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css",
  "limit": 80,
  "offset": 630
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css</path>
<type>file</type>
<content>
630:   color: var(--paper-soft);
631: }
632: .mgmtBadgePending {
633:   background: rgba(201, 162, 39, 0.2);
634:   color: var(--brand-accent);
635: }
636: 
637: .mgmtInlineForm {
638:   display: flex;
639:   flex-wrap: wrap;
640:   gap: 0.75rem;
641:   align-items: center;
642: }
643: .mgmtInlineForm input {
644:   font-family: var(--font-body);
645:   font-size: 0.9rem;
646:   padding: 0.65rem 0.9rem;
647:   border-radius: 8px;
648:   border: 1px solid var(--paper-soft);
649:   background: var(--paper);
650:   flex: 1;
651:   min-width: 160px;
652: }
653: .mgmtInlineForm input:focus {
654:   outline: 2px solid var(--brand-primary);
655:   outline-offset: 1px;
656: }
657: 
658: .mgmtInlineSelect {
659:   font-family: var(--font-body);
660:   font-size: 0.85rem;
661:   padding: 0.4rem 0.6rem;
662:   border-radius: 6px;
663:   border: 1px solid var(--paper-soft);
664:   background: var(--paper);
665: }
666: 
667: .mgmtSubmitBtn {
668:   padding: 0.7rem 1.25rem;
669:   background: var(--brand-primary);
670:   color: var(--ink);
671:   border-radius: 100px;
672:   font-weight: 700;
673:   font-size: 0.9rem;
674:   transition:
675:     transform 0.2s ease,
676:     opacity 0.2s ease;
677: }
678: .mgmtSubmitBtn:hover {
679:   transform: translateY(-2px);
680: }
681: .mgmtSubmitBtn:disabled {
682:   opacity: 0.6;
683:   transform: none;
684:   cursor: not-allowed;
685: }
686: 
687: .mgmtQueueChips {
688:   display: flex;
689:   flex-wrap: wrap;
690:   gap: 0.35rem;
691:   margin-top: 0.4rem;
692: }
693: 
694: .mgmtQueueChip {
695:   font-family: var(--font-mono);
696:   font-size: 0.7rem;
697:   letter-spacing: 0.03em;
698:   padding: 0.2rem 0.55rem;
699:   border-radius: 100px;
700:   border: 1px solid var(--paper-soft);
701:   color: var(--paper-soft);
702:   background: transparent;
703:   transition:
704:     background 0.15s ease,
705:     color 0.15s ease,
706:     border-color 0.15s ease;
707: }
708: .mgmtQueueChip:hover {
709:   border-color: var(--brand-primary);

(Showing lines 630-709 of 942. Use offset=710 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx",
  "limit": 30
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx</path>
<type>file</type>
<content>
1: import { useCallback, useEffect, useState } from "react";
2: import { motion } from "framer-motion";
3: import { useAuth } from "../../features/auth/AuthContext";
4: import {
5:   fetchStaffList,
6:   createStaff,
7:   deactivateStaffApi,
8:   fetchBranchQueues,
9:   assignQueuesToStaff,
10: } from "../../features/staff/manageApi";
11: import { fetchBranches } from "../../features/staff/adminApi";
12: import { ApiError } from "../../lib/apiClient";
13: import styles from "./StaffHome.module.css";
14: 
15: /**
16:  * StaffSubTab — staff list, create form, and queue assignment.
17:  * Used inside ManagePanel for manager/admin.
18:  *
19:  * After the four-model split this form creates Staff only — managers
20:  * have their own collection and creation flow (WP4).
21:  * Admin: picks a branch via dropdown (bank-scoped by Admin.bank).
22:  * Manager: auto-assigns to own branch.
23:  *
24:  * All calls use JWT Bearer (WP6) — bank/branch scoping is server-side.
25:  * Password is optional; server may return a one-time tempPassword.
26:  */
27: const StaffSubTab = () => {
28:   const { auth } = useAuth();
29:   const isAdmin = auth.role === "admin";
30:   const token = auth.token;

(Showing lines 1-30 of 242. Use offset=31 to continue.)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/frontend/src",
  "pattern": "res\\.data\\.data|paginatedResponse|meta\\.total"
}
```

**Output:**
```
Found 1 matches
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx:
  Line 73:       // paginatedResponse nests under data: { data: [...], meta }

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/lib/apiClient.js",
  "limit": 80
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/lib/apiClient.js</path>
<type>file</type>
<content>
1: const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
2: 
3: let onUnauthorized = null;
4: 
5: export const registerUnauthorizedHandler = (handler) => {
6:   onUnauthorized = handler;
7: };
8: 
9: export class ApiError extends Error {
10:   constructor(message, status, errors) {
11:     super(message);
12:     this.status = status;
13:     this.errors = errors;
14:   }
15: }
16: 
17: /**
18:  * Core request function.
19:  *
20:  * Supports both legacy JWT auth (via `token` option) and
21:  * v1 API key auth (via `apiKey` option).
22:  *
23:  * For legacy routes: pass `{ token: "jwt..." }`
24:  * For v1 routes:     pass `{ apiKey: "cue_..." }`
25:  *
26:  * If both are provided, API key takes precedence.
27:  */
28: const request = async (
29:   path,
30:   { method = "GET", body, token, apiKey, headers = {} } = {},
31: ) => {
32:   const res = await fetch(`${API_URL}${path}`, {
33:     method,
34:     headers: {
35:       "Content-Type": "application/json",
36:       // API key auth (v1 routes) takes precedence over JWT auth
37:       ...(apiKey
38:         ? { "X-API-Key": apiKey }
39:         : token
40:           ? { Authorization: `Bearer ${token}` }
41:           : {}),
42:       ...headers,
43:     },
44:     body: body ? JSON.stringify(body) : undefined,
45:   });
46: 
47:   let payload = null;
48:   try {
49:     payload = await res.json();
50:   } catch {
51:     // no body to parse
52:   }
53: 
54:   if (!res.ok) {
55:     // A 401 on a request that carried a token means that token is no longer
56:     // good, expired, revoked, account gone. A login/register call never
57:     // attaches a token, so a wrong password there won't trigger this,
58:     // that's an invalid-credentials error, not a session expiry.
59:     if (res.status === 401 && token && onUnauthorized) {
60:       onUnauthorized();
61:     }
62:     throw new ApiError(
63:       payload?.message || "Something went wrong",
64:       res.status,
65:       payload?.errors || null,
66:     );
67:   }
68: 
69:   return payload;
70: };
71: 
72: export const apiClient = {
73:   get: (path, opts) => request(path, { ...opts, method: "GET" }),
74:   post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
75:   patch: (path, body, opts) =>
76:     request(path, { ...opts, method: "PATCH", body }),
77:   put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
78:   delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
79: };
80: 

(Showing lines 1-80 of 94. Use offset=81 to continue.)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/frontend/src",
  "pattern": "fetchStaffList|setStaffList"
}
```

**Output:**
```
Found 9 matches
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx:
  Line 5:   fetchStaffList,

  Line 32:   const [staffList, setStaffList] = useState([]);

  Line 50:         fetchStaffList(token),

  Line 57:       setStaffList(results[0].data);


/home/gamp/Desktop/cue/frontend/src/features/staff/manageApi.js:
  Line 11: export const fetchStaffList = (token) =>


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/CounterSubTab.jsx:
  Line 9:   fetchStaffList,

  Line 26:   const [staffList, setStaffList] = useState([]);

  Line 37:         fetchStaffList(token),

  Line 41:       setStaffList(

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/staff.controller.js",
  "limit": 50,
  "offset": 180
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/staff.controller.js</path>
<type>file</type>
<content>
180:       message: "Login successful",
181:       data: {
182:         staff: {
183:           id: staff._id,
184:           name: staff.name,
185:           email: staff.email,
186:           role: "staff",
187:           branch: staff.branch,
188:           counter: staff.counter,
189:           isEmailVerified: staff.isEmailVerified,
190:           mustChangePassword: staff.mustChangePassword,
191:         },
192:         token,
193:       },
194:     });
195:   } catch (error) {
196:     next(error);
197:   }
198: };
199: 
200: export const getAllStaff = async (req, res, next) => {
201:   try {
202:     const { page, limit, skip } = parsePagination(req.query);
203:     const filter = {};
204: 
205:     // Tenant scoping: manager → own branch; admin → all branches in their bank.
206:     const scope = await bankBranchFilter(req);
207:     if (scope) Object.assign(filter, scope);
208: 
209:     filter.isActive = true;
210: 
211:     const [total, staffs] = await Promise.all([
212:       Staff.countDocuments(filter),
213:       Staff.find(filter)
214:         .populate("branch", "name location")
215:         .populate("counter", "label isOpen")
216:         .populate("queues", "serviceName")
217:         .skip(skip)
218:         .limit(limit),
219:     ]);
220:     // Staff docs have no role field — stamp "staff" for API consumers
221:     // that still read `.role` (frontend list views).
222:     const items = staffs.map((s) => ({
223:       ...(typeof s.toObject === "function" ? s.toObject() : s),
224:       role: "staff",
225:     }));
226:     return sendSuccess(res, {
227:       statusCode: 200,
228:       message: "Staff fetched successfully",
229:       ...paginatedResponse(items, total, page, limit),

(Showing lines 180-229 of 442. Use offset=230 to continue.)
</content>
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "frontend/src/**/*test*"
}
```

**Output:**
```
/home/gamp/Desktop/cue/frontend/src/lib/__tests__/apiClient.test.js
/home/gamp/Desktop/cue/frontend/src/components/ErrorBoundary/__tests__/ErrorBoundary.test.jsx
```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 62.3s)

_Thinking:_

I understand the issue clearly. The admin dashboard's Manage panel only has a Staff tab that creates Staff. I need to:

1. Add `createManager` and `fetchManagers` to manageApi.js
2. Create a ManagerSubTab component (or add Managers sub-tab to ManagePanel for admin)
3. Wire it into ManagePanel
4. Update AdminOverview empty state text
5. Also note: StaffSubTab password field is `required` so server never generates temp password from that form - for manager form I should make password optional so server generates temp password

Also looking at AdminOverview - managers list is there but no create form. Best place for manager create is ManagePanel with a Managers sub-tab for admin.

Let me also check response shape for getAllManagers:
```
return sendSuccess(res, {
  statusCode: 200,
  message: "Managers fetched successfully",
  ...paginatedResponse(items, total, page, limit),
});
```
paginatedResponse returns `{ data: docs, meta: {...} }` so sendSuccess gets `data: items, meta: {...}`.

Staff list uses same pattern and StaffSubTab does `setStaffList(results[0].data)` - so response is `{ status, message, data: [...], meta: {...} }`. Good.

For create manager response:
```
data: {
  id, name, email, role: "manager", branch, bank, mustChangePassword, tempPassword
}
```

I'll create ManagerSubTab.jsx with:
- List managers
- Create form: name, email, branch select, optional password
- One-time temp password modal
- Deactivate

And wire into ManagePanel for admin: Staff | Managers tabs.

Also fix StaffSubTab password field - it's required which prevents server-generated temp passwords. The comment says password is optional but input has `required`. I should make it optional for staff too since that's the intended design. User specifically asked about manager though.

Also AdminOverview empty state says "coming in WP4" - update that.

And AdminOverview has no manager create - the Managers section could have a form OR we put it in Manage. Putting it in Manage panel as "Managers" sub-tab is cleaner and matches Staff sub-tab pattern.

Also need fetchManagers, createManager, deactivateManager API.

For AdminOverview after create - it loads managers from overview. ManagerSubTab will load from GET /managers. After create, refresh both? ManagerSubTab refreshes its own list. AdminOverview refresh happens on tab switch... Actually they're separate components. When user creates manager in Manage, AdminOverview won't auto-refresh until remount. That's OK - switching tabs remounts? Looking at StaffHome - activeTab switches and components unmount/remount when switching between overview and manage. Yes, conditional render means remount. Good.

Also fix StaffSubTab password required → optional so temp password works for staff too. User said admin is meant to create manager not staff - so focus on manager path. I'll still make staff password optional to match the server design.

Looking at StaffSubTab again - password is required in HTML. Server supports optional. I'll make it optional (not required) for staff too since the comment says so.

Actually re-read user message: "admin is meant to create a manager account not a staff account. So wire it into the frontend"

They want manager creation wired. I'll:
1. manageApi.js - add fetchManagers, createManager, deactivateManager
2. ManagerSubTab.jsx - new component
3. ManagePanel - Managers tab for admin only
4. AdminOverview - fix empty state text, remove "coming in WP4"
5. Maybe add create form to AdminOverview managers section too? Redundant if Manage has it. Better in Manage.

Should ManagePanel show Staff for admin? Admin still needs to create staff. Keep both tabs: Managers | Staff for admin. Or put managers first as primary? "Managers | Staff" for admin makes sense given user intent.

Default activeTab is subTabs[0].id - if I put Managers first, default is Managers for admin. That might be what user wants. I'll put Managers first for admin.

Also StaffSubTab password - make optional so server temp works.

Let me also check if AdminOverview managers list should show deactivate - can add later.

For temp password display after create - use keyModal styles like AdminOverview.

Manager list response items have _id (from toObject) or id? getAllManagers:
```
const items = managers.map((m) => ({
  ...(typeof m.toObject === "function" ? m.toObject() : m),
  role: "manager",
}));
```
So `_id` present, branch populated as object.

Implement now.

Adding manager API helpers, a Managers sub-tab with create/list/deactivate + one-time temp password, and wiring it into the admin Manage panel.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/features/staff/manageApi.js",
  "newString": "/** Fetch staff (admin: bank-scoped; manager: own branch) */\nexport const fetchStaffList = (token) =>\n  apiClient.get(\"/staff\", { token });\n\n/** Create staff — password optional (server may return tempPassword) */\nexport const createStaff = (data, token) =>\n  apiClient.post(\"/staff\", data, { token });\n\n/** Fetch managers (admin only, bank-scoped) */\nexport const fetchManagers = (token) =>\n  apiClient.get(\"/managers\", { token });\n\n/**\n * Create a manager (admin only) — POST /managers.\n * Body: { name, email, branch, password? }. Omit password → server\n * generates Cue-XXXXXX-XXXXXX and returns it once as tempPassword.\n */\nexport const createManager = (data, token) =>\n  apiClient.post(\"/managers\", data, { token });\n\n/** Soft-deactivate a manager (admin only) */\nexport const deactivateManagerApi = (managerId, token) =>\n  apiClient.delete(`/managers/${managerId}`, { token });",
  "oldString": "/** Fetch staff (admin: bank-scoped; manager: own branch) */\nexport const fetchStaffList = (token) =>\n  apiClient.get(\"/staff\", { token });\n\n/** Create staff — password optional (server may return tempPassword) */\nexport const createStaff = (data, token) =>\n  apiClient.post(\"/staff\", data, { token });"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: write**

**Input:**
```json
{
  "content": "import { useCallback, useEffect, useState } from \"react\";\nimport { motion } from \"framer-motion\";\nimport { useAuth } from \"../../features/auth/AuthContext\";\nimport {\n  fetchManagers,\n  createManager,\n  deactivateManagerApi,\n} from \"../../features/staff/manageApi\";\nimport { fetchBranches } from \"../../features/staff/adminApi\";\nimport { ApiError } from \"../../lib/apiClient\";\nimport styles from \"./StaffHome.module.css\";\n\n/**\n * ManagerSubTab — admin creates/lists/deactivates Manager accounts.\n *\n * Managers live in their own collection (four-model split). Creation hits\n * POST /api/managers (admin JWT). Blank password → server generates\n * Cue-XXXXXX-XXXXXX, returned once as tempPassword (never stored plain).\n * Branch is required; bank is denormalized from Branch.bank server-side.\n */\nconst ManagerSubTab = () => {\n  const { auth } = useAuth();\n  const token = auth.token;\n\n  const [managers, setManagers] = useState([]);\n  const [branches, setBranches] = useState([]);\n  const [loading, setLoading] = useState(true);\n  const [error, setError] = useState(null);\n  const [form, setForm] = useState({\n    name: \"\",\n    email: \"\",\n    password: \"\",\n    branch: \"\",\n  });\n  const [formError, setFormError] = useState(null);\n  const [submitting, setSubmitting] = useState(false);\n  // One-time display of server-generated temp password after create.\n  const [tempCreated, setTempCreated] = useState(null);\n\n  const load = useCallback(async () => {\n    try {\n      const [managersRes, branchesRes] = await Promise.all([\n        fetchManagers(token),\n        fetchBranches(token),\n      ]);\n      // paginatedResponse: { data: [...], meta } → payload.data is the array.\n      setManagers(managersRes.data || []);\n      setBranches(branchesRes.data || []);\n      setError(null);\n    } catch (err) {\n      setError(err.message || \"Couldn't load managers.\");\n    } finally {\n      setLoading(false);\n    }\n  }, [token]);\n\n  useEffect(() => {\n    load();\n  }, [load]);\n\n  const handleChange = (field) => (e) =>\n    setForm((f) => ({ ...f, [field]: e.target.value }));\n\n  const handleCreate = async (e) => {\n    e.preventDefault();\n    setFormError(null);\n    setSubmitting(true);\n    try {\n      const payload = {\n        name: form.name,\n        email: form.email,\n        branch: form.branch,\n      };\n      // Blank password → server temp password (returned once).\n      if (form.password) payload.password = form.password;\n\n      const res = await createManager(payload, token);\n      const created = res.data || {};\n      if (created.tempPassword) {\n        setTempCreated({\n          name: created.name,\n          email: created.email,\n          tempPassword: created.tempPassword,\n        });\n      }\n      setForm({ name: \"\", email: \"\", password: \"\", branch: \"\" });\n      await load();\n    } catch (err) {\n      setFormError(\n        err instanceof ApiError\n          ? err.errors?.join(\", \") || err.message\n          : \"Couldn't create manager.\",\n      );\n    } finally {\n      setSubmitting(false);\n    }\n  };\n\n  const handleDeactivate = async (managerId) => {\n    if (\n      !window.confirm(\n        \"Deactivate this manager? They will lose access to the dashboard.\",\n      )\n    ) {\n      return;\n    }\n    try {\n      await deactivateManagerApi(managerId, token);\n      await load();\n    } catch (err) {\n      setError(\n        err instanceof ApiError ? err.message : \"Couldn't deactivate manager.\",\n      );\n    }\n  };\n\n  if (loading) return <p className={styles.mgmtStatus}>Loading managers…</p>;\n  if (error) return <p className={styles.mgmtStatusError}>{error}</p>;\n\n  return (\n    <motion.div\n      initial={{ opacity: 0, y: 12 }}\n      animate={{ opacity: 1, y: 0 }}\n      transition={{ duration: 0.4 }}\n    >\n      {managers.length === 0 && (\n        <p className={styles.mgmtStatus}>\n          No managers yet. Create one below — they oversee a branch but do\n          not serve tickets.\n        </p>\n      )}\n\n      {managers.map((m) => {\n        const id = m._id || m.id;\n        return (\n          <div key={id} className={styles.mgmtRow}>\n            <div>\n              <div className={styles.mgmtRowTitle}>{m.name}</div>\n              <div className={styles.mgmtRowSub}>\n                {m.email}\n                {m.branch?.name && <> · {m.branch.name}</>}\n              </div>\n            </div>\n            <div className={styles.mgmtRowActions}>\n              <button\n                className={styles.mgmtLinkBtn}\n                onClick={() => handleDeactivate(id)}\n              >\n                Deactivate\n              </button>\n            </div>\n          </div>\n        );\n      })}\n\n      <div className={styles.mgmtSubHeading}>Add manager</div>\n      <p className={styles.mgmtStatus} style={{ marginBottom: \"0.75rem\" }}>\n        Leave password blank to generate a temporary password\n        (Cue-XXXXXX-XXXXXX) shown once after creation.\n      </p>\n      <form onSubmit={handleCreate} className={styles.mgmtInlineForm}>\n        <input\n          required\n          placeholder=\"Name\"\n          value={form.name}\n          onChange={handleChange(\"name\")}\n        />\n        <input\n          required\n          type=\"email\"\n          placeholder=\"Email\"\n          value={form.email}\n          onChange={handleChange(\"email\")}\n        />\n        <input\n          type=\"password\"\n          placeholder=\"Password (optional)\"\n          value={form.password}\n          onChange={handleChange(\"password\")}\n          autoComplete=\"new-password\"\n        />\n        <select\n          required\n          value={form.branch}\n          onChange={handleChange(\"branch\")}\n          className={styles.mgmtInlineSelect}\n        >\n          <option value=\"\" disabled>\n            Assign branch…\n          </option>\n          {branches.map((b) => (\n            <option key={b._id} value={b._id}>\n              {b.name}\n            </option>\n          ))}\n        </select>\n        {formError && <p className={styles.mgmtStatusError}>{formError}</p>}\n        <button\n          type=\"submit\"\n          className={styles.mgmtSubmitBtn}\n          disabled={submitting}\n        >\n          {submitting ? \"Adding…\" : \"Add manager\"}\n        </button>\n      </form>\n\n      {/* One-time temp password — only when the server generated it. */}\n      {tempCreated && (\n        <div className={styles.keyModalBackdrop} role=\"dialog\" aria-modal=\"true\">\n          <div className={styles.keyModal}>\n            <h4>Manager created — temporary password</h4>\n            <p className={styles.mgmtRowSub}>\n              {tempCreated.name} · {tempCreated.email}\n            </p>\n            <div className={styles.rawKeyBox}>\n              <code>{tempCreated.tempPassword}</code>\n              <button\n                type=\"button\"\n                className={styles.scopeChip}\n                onClick={() =>\n                  navigator.clipboard?.writeText(tempCreated.tempPassword)\n                }\n              >\n                Copy\n              </button>\n            </div>\n            <p\n              className={styles.mgmtStatusError}\n              style={{ background: \"none\", padding: 0 }}\n            >\n              This is the only time this password will be shown. Share it once\n              — the manager must change it on first sign-in.\n            </p>\n            <button\n              type=\"button\"\n              className={styles.mgmtSubmitBtn}\n              onClick={() => setTempCreated(null)}\n            >\n              I&apos;ve saved it\n            </button>\n          </div>\n        </div>\n      )}\n    </motion.div>\n  );\n};\n\nexport default ManagerSubTab;\n",
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerSubTab.jsx"
}
```

**Output:**
```
Wrote file successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagePanel.jsx",
  "newString": "import { useState } from \"react\";\nimport { useAuth } from \"../../features/auth/AuthContext\";\nimport StaffSubTab from \"./StaffSubTab\";\nimport ManagerSubTab from \"./ManagerSubTab\";\nimport CounterSubTab from \"./CounterSubTab\";\nimport styles from \"./StaffHome.module.css\";\n\n/**\n * ManagePanel — management interface for manager/admin roles.\n *\n * Admin sees: Managers + Staff sub-tabs (managers live in their own\n * collection; POST /managers with optional temp password).\n * Manager sees: Staff + Counters sub-tabs (cannot create managers).\n */\nconst ManagePanel = () => {\n  const { auth } = useAuth();\n  const isAdmin = auth.role === \"admin\";\n\n  const subTabs = isAdmin\n    ? [\n        { id: \"managers\", label: \"Managers\" },\n        { id: \"staff\", label: \"Staff\" },\n      ]\n    : [\n        { id: \"staff\", label: \"Staff\" },\n        { id: \"counters\", label: \"Counters\" },\n      ];\n\n  const [activeTab, setActiveTab] = useState(subTabs[0].id);\n\n  return (\n    <div className={styles.mgmtPanel}>\n      <div className={styles.mgmtHeader}>\n        <p className={styles.mgmtEyebrow}>№ 012 — management</p>\n      </div>\n\n      {subTabs.length > 1 && (\n        <div className={styles.mgmtTabs} role=\"tablist\">\n          {subTabs.map((tab) => (\n            <button\n              key={tab.id}\n              role=\"tab\"\n              aria-selected={activeTab === tab.id}\n              className={\n                activeTab === tab.id ? styles.mgmtTabActive : styles.mgmtTab\n              }\n              onClick={() => setActiveTab(tab.id)}\n            >\n              {tab.label}\n            </button>\n          ))}\n        </div>\n      )}\n\n      <div className={styles.mgmtTabContent}>\n        {activeTab === \"managers\" && isAdmin && <ManagerSubTab />}\n        {activeTab === \"staff\" && <StaffSubTab />}\n        {activeTab === \"counters\" && <CounterSubTab />}\n      </div>\n    </div>\n  );\n};",
  "oldString": "import { useState } from \"react\";\nimport { useAuth } from \"../../features/auth/AuthContext\";\nimport StaffSubTab from \"./StaffSubTab\";\nimport CounterSubTab from \"./CounterSubTab\";\nimport styles from \"./StaffHome.module.css\";\n\n/**\n * ManagePanel — management interface for manager/admin roles.\n *\n * Admin sees: Staff sub-tab only (branch management is in AdminOverview)\n * Manager sees: Staff + Counters sub-tabs\n */\nconst ManagePanel = () => {\n  const { auth } = useAuth();\n  const isAdmin = auth.role === \"admin\";\n\n  const subTabs = isAdmin\n    ? [{ id: \"staff\", label: \"Staff\" }]\n    : [\n        { id: \"staff\", label: \"Staff\" },\n        { id: \"counters\", label: \"Counters\" },\n      ];\n\n  const [activeTab, setActiveTab] = useState(subTabs[0].id);\n\n  return (\n    <div className={styles.mgmtPanel}>\n      <div className={styles.mgmtHeader}>\n        <p className={styles.mgmtEyebrow}>№ 012 — management</p>\n      </div>\n\n      {subTabs.length > 1 && (\n        <div className={styles.mgmtTabs} role=\"tablist\">\n          {subTabs.map((tab) => (\n            <button\n              key={tab.id}\n              role=\"tab\"\n              aria-selected={activeTab === tab.id}\n              className={\n                activeTab === tab.id ? styles.mgmtTabActive : styles.mgmtTab\n              }\n              onClick={() => setActiveTab(tab.id)}\n            >\n              {tab.label}\n            </button>\n          ))}\n        </div>\n      )}\n\n      <div className={styles.mgmtTabContent}>\n        {activeTab === \"staff\" && <StaffSubTab />}\n        {activeTab === \"counters\" && <CounterSubTab />}\n      </div>\n    </div>\n  );\n};"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx",
  "newString": "/**\n * AdminOverview — cross-branch dashboard for bank-scoped admin role.\n * Shows all branches (this bank only), all managers with staff counts,\n * a form to create branches, and the API key request panel\n * (request new key + view status / one-time reveal).\n *\n * Manager creation lives on Manage → Managers (POST /managers).\n */",
  "oldString": "/**\n * AdminOverview — cross-branch dashboard for bank-scoped admin role.\n * Shows all branches (this bank only), all managers with staff counts,\n * a form to create branches, and the API key request panel\n * (request new key + view status / one-time reveal).\n *\n * Manager creation form is deferred to WP4 (Manager model + dedicated\n * endpoint with temp password + invite links).\n */"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx",
  "newString": "      {data.managers.length === 0 && (\n        <p className={styles.mgmtStatus}>\n          No managers yet. Create one under Manage → Managers.\n        </p>\n      )}",
  "oldString": "      {data.managers.length === 0 && (\n        <p className={styles.mgmtStatus}>\n          No managers yet. Manager accounts are created via the dedicated\n          Manager flow (coming in WP4).\n        </p>\n      )}"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx",
  "newString": " * After the four-model split this form creates Staff only — managers\n * are created under Manage → Managers (POST /managers, ManagerSubTab).\n * Admin: picks a branch via dropdown (bank-scoped by Admin.bank).\n * Manager: auto-assigns to own branch.\n *\n * All calls use JWT Bearer (WP6) — bank/branch scoping is server-side.\n * Password optional; blank → server temp password (Cue-XXXXXX-XXXXXX).\n */",
  "oldString": " * After the four-model split this form creates Staff only — managers\n * have their own collection and creation flow (WP4).\n * Admin: picks a branch via dropdown (bank-scoped by Admin.bank).\n * Manager: auto-assigns to own branch.\n *\n * All calls use JWT Bearer (WP6) — bank/branch scoping is server-side.\n * Password is optional; server may return a one-time tempPassword.\n */"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx",
  "newString": "        <input\n          type=\"password\"\n          placeholder=\"Password (optional — blank = temp)\"\n          value={form.password}\n          onChange={handleChange(\"password\")}\n          autoComplete=\"new-password\"\n        />",
  "oldString": "        <input\n          required\n          type=\"password\"\n          placeholder=\"Temporary password\"\n          value={form.password}\n          onChange={handleChange(\"password\")}\n        />"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx",
  "limit": 40,
  "offset": 81
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx</path>
<type>file</type>
<content>
81:   const handleCreate = async (e) => {
82:     e.preventDefault();
83:     setFormError(null);
84:     setSubmitting(true);
85:     try {
86:       const payload = { ...form };
87:       if (!isAdmin) {
88:         payload.branch = auth.branch;
89:       }
90:       // Password optional — blank means server generates a temp password.
91:       if (!payload.password) delete payload.password;
92:       await createStaff(payload, token);
93:       setForm({ name: "", email: "", password: "", branch: "" });
94:       await load();
95:     } catch (err) {
96:       setFormError(
97:         err instanceof ApiError
98:           ? err.errors?.join(", ") || err.message
99:           : "Couldn't create staff.",
100:       );
101:     } finally {
102:       setSubmitting(false);
103:     }
104:   };
105: 
106:   const handleDeactivate = async (staffId) => {
107:     await deactivateStaffApi(staffId, token);
108:     await load();
109:   };
110: 
111:   const handleQueueToggle = async (staffId, queueId) => {
112:     const staff = staffList.find((s) => s._id === staffId);
113:     if (!staff) return;
114:     const current = (staff.queues || []).map((q) => q._id || q);
115:     const next = current.includes(queueId)
116:       ? current.filter((id) => id !== queueId)
117:       : [...current, queueId];
118:     setAssigningQueue(staffId);
119:     try {
120:       await assignQueuesToStaff(staffId, next, token);

(Showing lines 81-120 of 242. Use offset=121 to continue.)
</content>
```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 22.8s)

_Thinking:_

I should also show temp password for staff creation if server returns it - StaffSubTab currently ignores tempPassword response. Let me improve StaffSubTab to show temp password too for consistency, and verify ManagerSubTab handles pagination correctly.

Looking at getAllManagers response:
```
return sendSuccess(res, {
  statusCode: 200,
  message: "Managers fetched successfully",
  ...paginatedResponse(items, total, page, limit),
});
```

paginatedResponse returns `{ data: docs, meta: {...} }` so sendSuccess gets `data: items, meta: {...}`. So `managersRes.data` is the array. Good.

Also need to fix StaffSubTab to show temp password when server generates one - nice UX but user asked specifically for manager. StaffSubTab still works with blank password.

Also AdminOverview has a bug: `setRevealedKey(null)` should be `setAdminRevealKey(null)` - I noticed that earlier. Not in scope but could fix.

Let me also update StaffSubTab to display temp password after create for consistency - actually the user only asked for manager. Keep focused.

Check rawKeyBox and scopeChip styles exist - yes from AdminOverview.

Run frontend tests and build. Also check if there's a bug with fetchBranches response shape - fetchBranches uses GET /branches. What does it return?

Need to check getAllBranches response shape.

Verifying branch list response shape and whether StaffSubTab should surface `tempPassword` like managers.

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/backend/src",
  "pattern": "getAllBranches|Branches fetched|sendSuccess.*branch"
}
```

**Output:**
```
Found 6 matches
/home/gamp/Desktop/cue/backend/src/routes/branch.route.js:
  Line 5:   getAllBranches,

  Line 40: branchRouter.get("/", authorize("admin"), getAllBranches);


/home/gamp/Desktop/cue/backend/src/routes/v1/branch.routes.js:
  Line 5:   getAllBranches,

  Line 26: branchRouter.get("/", requireScope("branches:read"), getAllBranches);


/home/gamp/Desktop/cue/backend/src/controllers/branch.controller.js:
  Line 30: export const getAllBranches = async (req, res, next) => {

  Line 47:       message: "Branches fetched successfully",

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/branch.controller.js",
  "limit": 80
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/branch.controller.js</path>
<type>file</type>
<content>
1: import Branch from "../models/branch.model.js";
2: import Queue from "../models/queue.model.js";
3: import Counter from "../models/counter.model.js";
4: import Ticket from "../models/ticket.model.js";
5: import { sendSuccess } from "../utils/response.js";
6: import { parsePagination, paginatedResponse } from "../utils/pagination.js";
7: 
8: export const createBranch = async (req, res, next) => {
9:   try {
10:     const { name, location, address, phone, email, coordinates, operatingHours } = req.body;
11: 
12:     // Bank scope: API-key path uses key.bankName; JWT dashboard uses Admin.bank.
13:     const bank = req.bankName || (req.role === "admin" ? req.user?.bank : null);
14:     const branchData = { name, location, address, phone, email, coordinates, operatingHours };
15:     if (bank) {
16:       branchData.bank = bank;
17:     }
18: 
19:     const branch = await Branch.create(branchData);
20:     return sendSuccess(res, {
21:       statusCode: 201,
22:       message: "Branch created successfully",
23:       data: branch,
24:     });
25:   } catch (error) {
26:     next(error);
27:   }
28: };
29: 
30: export const getAllBranches = async (req, res, next) => {
31:   try {
32:     const { page, limit, skip } = parsePagination(req.query);
33:     const filter = { isActive: true };
34: 
35:     // Bank scope: API-key (req.bankName) or JWT admin (Admin.bank).
36:     const bank = req.bankName || (req.role === "admin" ? req.user?.bank : null);
37:     if (bank) {
38:       filter.bank = bank;
39:     }
40: 
41:     const [total, branches] = await Promise.all([
42:       Branch.countDocuments(filter),
43:       Branch.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
44:     ]);
45:     return sendSuccess(res, {
46:       statusCode: 200,
47:       message: "Branches fetched successfully",
48:       ...paginatedResponse(branches, total, page, limit),
49:     });
50:   } catch (error) {
51:     next(error);
52:   }
53: };
54: 
55: export const getSingleBranch = async (req, res, next) => {
56:   try {
57:     const { id } = req.params;
58: 
59:     // Bank scope: API-key or JWT admin (Admin.bank).
60:     const bank = req.bankName || (req.role === "admin" ? req.user?.bank : null);
61:     const filter = { _id: id };
62:     if (bank) {
63:       filter.bank = bank;
64:     }
65:     if (req.bankName) {
66:       filter.bank = req.bankName;
67:     }
68: 
69:     const branch = await Branch.findOne(filter);
70: 
71:     if (!branch) {
72:       const error = new Error("Branch not found");
73:       error.statusCode = 404;
74:       return next(error);
75:     }
76: 
77:     return sendSuccess(res, {
78:       statusCode: 200,
79:       message: "Branch fetched successfully",
80:       data: branch,

(Showing lines 1-80 of 321. Use offset=81 to continue.)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css",
  "pattern": "rawKeyBox|scopeChip"
}
```

**Output:**
```
Found 13 matches
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css:
  Line 868: .scopeChips {

  Line 875: .scopeChip,

  Line 876: .scopeChipActive {

  Line 891: .scopeChipActive {

  Line 926: .rawKeyBox {

  Line 936: .rawKeyBox code {


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerSubTab.jsx:
  Line 215:             <div className={styles.rawKeyBox}>

  Line 219:                 className={styles.scopeChip}


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx:
  Line 282:         <div className={styles.scopeChips}>

  Line 289:                   ? styles.scopeChipActive

  Line 290:                   : styles.scopeChip

  Line 315:             <div className={styles.rawKeyBox}>

  Line 319:                 className={styles.scopeChip}

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx",
  "limit": 40,
  "offset": 85
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx</path>
<type>file</type>
<content>
85:     try {
86:       const payload = { ...form };
87:       if (!isAdmin) {
88:         payload.branch = auth.branch;
89:       }
90:       // Password optional — blank means server generates a temp password.
91:       if (!payload.password) delete payload.password;
92:       await createStaff(payload, token);
93:       setForm({ name: "", email: "", password: "", branch: "" });
94:       await load();
95:     } catch (err) {
96:       setFormError(
97:         err instanceof ApiError
98:           ? err.errors?.join(", ") || err.message
99:           : "Couldn't create staff.",
100:       );
101:     } finally {
102:       setSubmitting(false);
103:     }
104:   };
105: 
106:   const handleDeactivate = async (staffId) => {
107:     await deactivateStaffApi(staffId, token);
108:     await load();
109:   };
110: 
111:   const handleQueueToggle = async (staffId, queueId) => {
112:     const staff = staffList.find((s) => s._id === staffId);
113:     if (!staff) return;
114:     const current = (staff.queues || []).map((q) => q._id || q);
115:     const next = current.includes(queueId)
116:       ? current.filter((id) => id !== queueId)
117:       : [...current, queueId];
118:     setAssigningQueue(staffId);
119:     try {
120:       await assignQueuesToStaff(staffId, next, token);
121:       await load();
122:     } catch (err) {
123:       setError(
124:         err instanceof ApiError ? err.message : "Couldn't update queues.",

(Showing lines 85-124 of 242. Use offset=125 to continue.)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/frontend/src",
  "pattern": "setRevealedKey|setAdminRevealKey"
}
```

**Output:**
```
Found 3 matches
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx:
  Line 54:   const [adminRevealKey, setAdminRevealKey] = useState(null); // one-time raw key display

  Line 145:         setAdminRevealKey({ id, key: res.data.key });

  Line 331:               onClick={() => setRevealedKey(null)}

```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 64.9s)

_Thinking:_

I notice AdminOverview has a bug: `setRevealedKey(null)` should be `setAdminRevealKey(null)`. I should fix that while I'm at it since it's a clear bug.

Also StaffSubTab doesn't show tempPassword when server returns it - should add that for consistency when creating staff with blank password. User specifically asked about manager though, so main focus is manager wiring. But staff temp password display would be good UX too since password is now optional.

Let me fix AdminOverview bug and enhance StaffSubTab to show temp password.

Fixing a clear AdminOverview bug and showing the staff `tempPassword` modal for consistency.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx",
  "newString": "              onClick={() => setAdminRevealKey(null)}",
  "oldString": "              onClick={() => setRevealedKey(null)}"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx",
  "newString": "  const [formError, setFormError] = useState(null);\n  const [submitting, setSubmitting] = useState(false);\n  const [assigningQueue, setAssigningQueue] = useState(null);\n  // One-time display when the server generated a temp password.\n  const [tempCreated, setTempCreated] = useState(null);",
  "oldString": "  const [formError, setFormError] = useState(null);\n  const [submitting, setSubmitting] = useState(false);\n  const [assigningQueue, setAssigningQueue] = useState(null);"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx",
  "newString": "      // Password optional — blank means server generates a temp password.\n      if (!payload.password) delete payload.password;\n      const res = await createStaff(payload, token);\n      const created = res.data || {};\n      if (created.tempPassword) {\n        setTempCreated({\n          name: created.name,\n          email: created.email,\n          tempPassword: created.tempPassword,\n        });\n      }\n      setForm({ name: \"\", email: \"\", password: \"\", branch: \"\" });\n      await load();",
  "oldString": "      // Password optional — blank means server generates a temp password.\n      if (!payload.password) delete payload.password;\n      await createStaff(payload, token);\n      setForm({ name: \"\", email: \"\", password: \"\", branch: \"\" });\n      await load();"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx",
  "limit": 60,
  "offset": 230
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx</path>
<type>file</type>
<content>
230:               Assign branch…
231:             </option>
232:             {branches.map((b) => (
233:               <option key={b._id} value={b._id}>
234:                 {b.name}
235:               </option>
236:             ))}
237:           </select>
238:         )}
239:         {formError && <p className={styles.mgmtStatusError}>{formError}</p>}
240:         <button
241:           type="submit"
242:           className={styles.mgmtSubmitBtn}
243:           disabled={submitting}
244:         >
245:           {submitting ? "Adding…" : "Add"}
246:         </button>
247:       </form>
248:     </motion.div>
249:   );
250: };
251: 
252: export default StaffSubTab;

(End of file - total 252 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx",
  "limit": 30,
  "offset": 200
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx</path>
<type>file</type>
<content>
200:       <div className={styles.mgmtSubHeading}>Add staff</div>
201:       <form onSubmit={handleCreate} className={styles.mgmtInlineForm}>
202:         <input
203:           required
204:           placeholder="Name"
205:           value={form.name}
206:           onChange={handleChange("name")}
207:         />
208:         <input
209:           required
210:           type="email"
211:           placeholder="Email"
212:           value={form.email}
213:           onChange={handleChange("email")}
214:         />
215:         <input
216:           type="password"
217:           placeholder="Password (optional — blank = temp)"
218:           value={form.password}
219:           onChange={handleChange("password")}
220:           autoComplete="new-password"
221:         />
222:         {isAdmin && (
223:           <select
224:             required
225:             value={form.branch}
226:             onChange={handleChange("branch")}
227:             className={styles.mgmtInlineSelect}
228:           >
229:             <option value="" disabled>

(Showing lines 200-229 of 252. Use offset=230 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerSubTab.jsx",
  "limit": 30
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerSubTab.jsx</path>
<type>file</type>
<content>
1: import { useCallback, useEffect, useState } from "react";
2: import { motion } from "framer-motion";
3: import { useAuth } from "../../features/auth/AuthContext";
4: import {
5:   fetchManagers,
6:   createManager,
7:   deactivateManagerApi,
8: } from "../../features/staff/manageApi";
9: import { fetchBranches } from "../../features/staff/adminApi";
10: import { ApiError } from "../../lib/apiClient";
11: import styles from "./StaffHome.module.css";
12: 
13: /**
14:  * ManagerSubTab — admin creates/lists/deactivates Manager accounts.
15:  *
16:  * Managers live in their own collection (four-model split). Creation hits
17:  * POST /api/managers (admin JWT). Blank password → server generates
18:  * Cue-XXXXXX-XXXXXX, returned once as tempPassword (never stored plain).
19:  * Branch is required; bank is denormalized from Branch.bank server-side.
20:  */
21: const ManagerSubTab = () => {
22:   const { auth } = useAuth();
23:   const token = auth.token;
24: 
25:   const [managers, setManagers] = useState([]);
26:   const [branches, setBranches] = useState([]);
27:   const [loading, setLoading] = useState(true);
28:   const [error, setError] = useState(null);
29:   const [form, setForm] = useState({
30:     name: "",

(Showing lines 1-30 of 248. Use offset=31 to continue.)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome",
  "pattern": "setRevealedKey|tempCreated|setTempCreated"
}
```

**Output:**
```
Found 8 matches
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx:
  Line 47:   const [tempCreated, setTempCreated] = useState(null);


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerSubTab.jsx:
  Line 38:   const [tempCreated, setTempCreated] = useState(null);

  Line 80:         setTempCreated({

  Line 208:       {tempCreated && (

  Line 213:               {tempCreated.name} · {tempCreated.email}

  Line 216:               <code>{tempCreated.tempPassword}</code>

  Line 221:                   navigator.clipboard?.writeText(tempCreated.tempPassword)

  Line 237:               onClick={() => setTempCreated(null)}

```

**Tool: bash**

**Input:**
```json
{
  "command": "npm test 2>&1 && npm run build 2>&1",
  "timeout": 120000,
  "workdir": "/home/gamp/Desktop/cue/frontend"
}
```

**Output:**
```
npm notice run frontend@0.0.0 test
npm notice run vitest run

 RUN  v5.0.0 /home/gamp/Desktop/cue/frontend


 Test Files  2 passed (2)
      Tests  8 passed (8)
   Start at  12:42:35
   Duration  14.53s (environment 80%, setup 11%, transform 4%, tests 3%, import 1%, worker 1%)

npm notice run frontend@0.0.0 build
npm notice run vite build
vite v8.2.2 building client environment for production...
transforming...
✓ 551 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                 0.54 kB │ gzip:  0.33 kB
dist/assets/SplitFlapBoard-CScboK_F.css         0.04 kB │ gzip:  0.06 kB
dist/assets/MotionBackground-EDPDeuNe.css       0.44 kB │ gzip:  0.27 kB
dist/assets/FlapUnit-DSD43QmB.css               0.70 kB │ gzip:  0.38 kB
dist/assets/Contact-Cd2pagkb.css                2.39 kB │ gzip:  0.84 kB
dist/assets/LoginPage-B4Vixr4H.css              2.47 kB │ gzip:  0.92 kB
dist/assets/NearestBranch-Devvl3jF.css          2.75 kB │ gzip:  0.90 kB
dist/assets/Branch-CqJodSU_.css                 3.12 kB │ gzip:  0.96 kB
dist/assets/Kiosk-CIx0xwPK.css                  3.56 kB │ gzip:  0.98 kB
dist/assets/Boards-CI7PsP93.css                 3.78 kB │ gzip:  1.22 kB
dist/assets/TicketPage-BmnPbBSs.css             4.13 kB │ gzip:  1.23 kB
dist/assets/Appointment-Db7QMx4x.css            4.26 kB │ gzip:  1.16 kB
dist/assets/NotFound-BZmeblkS.css               4.36 kB │ gzip:  1.58 kB
dist/assets/Board-DcZVuyKg.css                  5.39 kB │ gzip:  1.58 kB
dist/assets/index-xkllxhr3.css                  6.57 kB │ gzip:  2.09 kB
dist/assets/Platform-DC6vainy.css               7.71 kB │ gzip:  1.91 kB
dist/assets/Landing-BwrVP7ac.css                8.78 kB │ gzip:  1.89 kB
dist/assets/StaffHome-DOlY-_Yf.css             15.31 kB │ gzip:  2.92 kB
dist/assets/prefersReducedMotion-H_9XR_Vq.js    0.10 kB │ gzip:  0.11 kB
dist/assets/SplitFlapBoard-fbmmXbw6.js          0.57 kB │ gzip:  0.40 kB
dist/assets/FlapUnit-d7Gks64U.js                0.77 kB │ gzip:  0.45 kB
dist/assets/MotionBackground-BYY9E_Z5.js        0.91 kB │ gzip:  0.49 kB
dist/assets/Platform.module-CSE0V78f.js         1.64 kB │ gzip:  0.61 kB
dist/assets/PlatformLogin-CpFvENdn.js           2.60 kB │ gzip:  1.16 kB
dist/assets/LoginPage-Bm2u5cPH.js               3.68 kB │ gzip:  1.58 kB
dist/assets/NearestBranch-6MfXY2vy.js           4.03 kB │ gzip:  1.55 kB
dist/assets/Branch-DTxvjQh6.js                  4.59 kB │ gzip:  1.73 kB
dist/assets/Contact-nKJ_Z-nw.js                 4.77 kB │ gzip:  1.88 kB
dist/assets/Kiosk-MbFv76gn.js                   5.26 kB │ gzip:  2.01 kB
dist/assets/Boards-kALAtoVY.js                  6.41 kB │ gzip:  2.16 kB
dist/assets/Appointment-DC_SklF2.js             8.11 kB │ gzip:  2.65 kB
dist/assets/TicketPage-_G9vNiJ7.js              8.16 kB │ gzip:  2.71 kB
dist/assets/Board-ClDYz145.js                   8.95 kB │ gzip:  2.99 kB
dist/assets/PlatformDashboard-CXQ--qxt.js      10.22 kB │ gzip:  3.03 kB
dist/assets/NotFound-C09rvO-M.js               11.01 kB │ gzip:  4.14 kB
dist/assets/StaffHome-7H7Xoa3g.js              38.48 kB │ gzip:  8.96 kB
dist/assets/esm-Ckkn2Ami.js                    41.16 kB │ gzip: 12.86 kB
dist/assets/Landing-BEBvPiba.js                63.03 kB │ gzip: 25.15 kB
dist/assets/gsap-DWxn8li7.js                   69.58 kB │ gzip: 27.28 kB
dist/assets/proxy-GcLvUCXa.js                 129.60 kB │ gzip: 42.29 kB
dist/assets/index-CIMQLMf2.js                 241.78 kB │ gzip: 77.50 kB

✓ built in 4.56s

```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 97.8s)

_Thinking:_

StaffSubTab has tempCreated state but no modal UI - I need to add the modal. Let me add it before the closing motion.div.

StaffSubTab has `tempCreated` state but no modal yet — adding it.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx",
  "newString": "        {formError && <p className={styles.mgmtStatusError}>{formError}</p>}\n        <button\n          type=\"submit\"\n          className={styles.mgmtSubmitBtn}\n          disabled={submitting}\n        >\n          {submitting ? \"Adding…\" : \"Add\"}\n        </button>\n      </form>\n\n      {/* One-time temp password — only when the server generated it. */}\n      {tempCreated && (\n        <div className={styles.keyModalBackdrop} role=\"dialog\" aria-modal=\"true\">\n          <div className={styles.keyModal}>\n            <h4>Staff created — temporary password</h4>\n            <p className={styles.mgmtRowSub}>\n              {tempCreated.name} · {tempCreated.email}\n            </p>\n            <div className={styles.rawKeyBox}>\n              <code>{tempCreated.tempPassword}</code>\n              <button\n                type=\"button\"\n                className={styles.scopeChip}\n                onClick={() =>\n                  navigator.clipboard?.writeText(tempCreated.tempPassword)\n                }\n              >\n                Copy\n              </button>\n            </div>\n            <p\n              className={styles.mgmtStatusError}\n              style={{ background: \"none\", padding: 0 }}\n            >\n              This is the only time this password will be shown. Share it once\n              — they must change it on first sign-in.\n            </p>\n            <button\n              type=\"button\"\n              className={styles.mgmtSubmitBtn}\n              onClick={() => setTempCreated(null)}\n            >\n              I&apos;ve saved it\n            </button>\n          </div>\n        </div>\n      )}\n    </motion.div>\n  );\n};",
  "oldString": "        {formError && <p className={styles.mgmtStatusError}>{formError}</p>}\n        <button\n          type=\"submit\"\n          className={styles.mgmtSubmitBtn}\n          disabled={submitting}\n        >\n          {submitting ? \"Adding…\" : \"Add\"}\n        </button>\n      </form>\n    </motion.div>\n  );\n};"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: bash**

**Input:**
```json
{
  "command": "npm test 2>&1 && npm run build 2>&1 | tail -20",
  "timeout": 120000,
  "workdir": "/home/gamp/Desktop/cue/frontend"
}
```

**Output:**
```
npm notice run frontend@0.0.0 test
npm notice run vitest run

 RUN  v5.0.0 /home/gamp/Desktop/cue/frontend


 Test Files  2 passed (2)
      Tests  8 passed (8)
   Start at  12:44:08
   Duration  18.24s (environment 79%, setup 10%, transform 5%, tests 4%, import 2%, worker 1%)

dist/assets/PlatformLogin-LLq9X1un.js           2.60 kB │ gzip:  1.16 kB
dist/assets/LoginPage-BFRnHm3d.js               3.68 kB │ gzip:  1.58 kB
dist/assets/NearestBranch-BI72GqN5.js           4.03 kB │ gzip:  1.55 kB
dist/assets/Branch-D364AqhT.js                  4.59 kB │ gzip:  1.73 kB
dist/assets/Contact-CZ-tKUZo.js                 4.77 kB │ gzip:  1.88 kB
dist/assets/Kiosk-BL-paalq.js                   5.26 kB │ gzip:  2.01 kB
dist/assets/Boards-ODwd2sjm.js                  6.41 kB │ gzip:  2.15 kB
dist/assets/Appointment-BawnRbhC.js             8.11 kB │ gzip:  2.65 kB
dist/assets/TicketPage-DNhaXJfN.js              8.16 kB │ gzip:  2.71 kB
dist/assets/Board-B27OG651.js                   8.95 kB │ gzip:  2.99 kB
dist/assets/PlatformDashboard-CHpkpuFD.js      10.22 kB │ gzip:  3.03 kB
dist/assets/NotFound-J3eI1DiD.js               11.01 kB │ gzip:  4.14 kB
dist/assets/StaffHome-CoIbVvLa.js              39.31 kB │ gzip:  9.00 kB
dist/assets/esm-Ckkn2Ami.js                    41.16 kB │ gzip: 12.86 kB
dist/assets/Landing-DgqSFmF9.js                63.03 kB │ gzip: 25.15 kB
dist/assets/gsap-DWxn8li7.js                   69.58 kB │ gzip: 27.28 kB
dist/assets/proxy-GcLvUCXa.js                 129.60 kB │ gzip: 42.29 kB
dist/assets/index-D0cs1QUc.js                 241.78 kB │ gzip: 77.50 kB

✓ built in 5.16s

```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/frontend/src",
  "pattern": "coming in WP4|setRevealedKey|createManager|ManagerSubTab"
}
```

**Output:**
```
Found 9 matches
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx:
  Line 20:  * are created under Manage → Managers (POST /managers, ManagerSubTab).


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerSubTab.jsx:
  Line 6:   createManager,

  Line 14:  * ManagerSubTab — admin creates/lists/deactivates Manager accounts.

  Line 21: const ManagerSubTab = () => {

  Line 77:       const res = await createManager(payload, token);

  Line 248: export default ManagerSubTab;


/home/gamp/Desktop/cue/frontend/src/features/staff/manageApi.js:
  Line 27: export const createManager = (data, token) =>


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagePanel.jsx:
  Line 4: import ManagerSubTab from "./ManagerSubTab";

  Line 56:         {activeTab === "managers" && isAdmin && <ManagerSubTab />}

```

**Tool: bash**

**Input:**
```json
{
  "command": "npm test 2>&1 | tail -15",
  "timeout": 120000,
  "workdir": "/home/gamp/Desktop/cue/backend"
}
```

**Output:**
```
npm notice run smart-queue-management-system@1.0.0 test
npm notice run vitest run

 RUN  v5.0.0 /home/gamp/Desktop/cue/backend


 Test Files  16 passed (16)
      Tests  123 passed (123)
   Start at  12:44:09
   Duration  22.76s (import 73%, transform 17%, tests 6%, worker 4%)

    Isolate  16 workers spawned · ~1.29s startup each (spawn + environment, per file)
             at least ~5.58s faster with isolate: false — reuses workers across files instead of one per file


```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagePanel.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagePanel.jsx</path>
<type>file</type>
<content>
1: import { useState } from "react";
2: import { useAuth } from "../../features/auth/AuthContext";
3: import StaffSubTab from "./StaffSubTab";
4: import ManagerSubTab from "./ManagerSubTab";
5: import CounterSubTab from "./CounterSubTab";
6: import styles from "./StaffHome.module.css";
7: 
8: /**
9:  * ManagePanel — management interface for manager/admin roles.
10:  *
11:  * Admin sees: Managers + Staff sub-tabs (managers live in their own
12:  * collection; POST /managers with optional temp password).
13:  * Manager sees: Staff + Counters sub-tabs (cannot create managers).
14:  */
15: const ManagePanel = () => {
16:   const { auth } = useAuth();
17:   const isAdmin = auth.role === "admin";
18: 
19:   const subTabs = isAdmin
20:     ? [
21:         { id: "managers", label: "Managers" },
22:         { id: "staff", label: "Staff" },
23:       ]
24:     : [
25:         { id: "staff", label: "Staff" },
26:         { id: "counters", label: "Counters" },
27:       ];
28: 
29:   const [activeTab, setActiveTab] = useState(subTabs[0].id);
30: 
31:   return (
32:     <div className={styles.mgmtPanel}>
33:       <div className={styles.mgmtHeader}>
34:         <p className={styles.mgmtEyebrow}>№ 012 — management</p>
35:       </div>
36: 
37:       {subTabs.length > 1 && (
38:         <div className={styles.mgmtTabs} role="tablist">
39:           {subTabs.map((tab) => (
40:             <button
41:               key={tab.id}
42:               role="tab"
43:               aria-selected={activeTab === tab.id}
44:               className={
45:                 activeTab === tab.id ? styles.mgmtTabActive : styles.mgmtTab
46:               }
47:               onClick={() => setActiveTab(tab.id)}
48:             >
49:               {tab.label}
50:             </button>
51:           ))}
52:         </div>
53:       )}
54: 
55:       <div className={styles.mgmtTabContent}>
56:         {activeTab === "managers" && isAdmin && <ManagerSubTab />}
57:         {activeTab === "staff" && <StaffSubTab />}
58:         {activeTab === "counters" && <CounterSubTab />}
59:       </div>
60:     </div>
61:   );
62: };
63: 
64: export default ManagePanel;

(End of file - total 64 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/features/staff/manageApi.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/features/staff/manageApi.js</path>
<type>file</type>
<content>
1: import { apiClient } from "../../lib/apiClient";
2: 
3: /**
4:  * Staff management API — JWT `/api/*` surface (Phase 13 WP6).
5:  *
6:  * All functions take a Bearer `token` from AuthContext.
7:  * Branch scoping (admin bank / manager branch) is enforced server-side.
8:  */
9: 
10: /** Fetch staff (admin: bank-scoped; manager: own branch) */
11: export const fetchStaffList = (token) =>
12:   apiClient.get("/staff", { token });
13: 
14: /** Create staff — password optional (server may return tempPassword) */
15: export const createStaff = (data, token) =>
16:   apiClient.post("/staff", data, { token });
17: 
18: /** Fetch managers (admin only, bank-scoped) */
19: export const fetchManagers = (token) =>
20:   apiClient.get("/managers", { token });
21: 
22: /**
23:  * Create a manager (admin only) — POST /managers.
24:  * Body: { name, email, branch, password? }. Omit password → server
25:  * generates Cue-XXXXXX-XXXXXX and returns it once as tempPassword.
26:  */
27: export const createManager = (data, token) =>
28:   apiClient.post("/managers", data, { token });
29: 
30: /** Soft-deactivate a manager (admin only) */
31: export const deactivateManagerApi = (managerId, token) =>
32:   apiClient.delete(`/managers/${managerId}`, { token });
33: 
34: /** Assign queues to a staff member */
35: export const assignQueuesToStaff = (staffId, queueIds, token) =>
36:   apiClient.patch(`/staff/${staffId}/queues`, { queues: queueIds }, { token });
37: 
38: /** Soft-deactivate a staff member */
39: export const deactivateStaffApi = (staffId, token) =>
40:   apiClient.delete(`/staff/${staffId}`, { token });
41: 
42: /** Fetch counters for a branch */
43: export const fetchBranchCounters = (branchId, token) =>
44:   apiClient.get(`/counters/${branchId}`, { token });
45: 
46: /** Create a new counter */
47: export const createCounter = (data, token) =>
48:   apiClient.post("/counters", data, { token });
49: 
50: /** Assign a staff member to a counter */
51: export const assignStaffToCounter = (counterId, staffId, token) =>
52:   apiClient.patch(`/counters/${counterId}/assign-staff`, { staffId }, { token });
53: 
54: /** Unassign staff from a counter */
55: export const unassignStaffFromCounter = (counterId, token) =>
56:   apiClient.patch(`/counters/${counterId}/unassign-staff`, {}, { token });
57: 
58: /** Fetch queues for the signed-in identity's scope */
59: export const fetchBranchQueues = (token) =>
60:   apiClient.get("/queues", { token });

(End of file - total 60 lines)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/backend/src/app.js",
  "pattern": "managers"
}
```

**Output:**
```
Found 35 matches
/home/gamp/Desktop/cue/backend/src/app.js:
  Line 78: app.use("/api/managers", managerRouter);


/home/gamp/Desktop/cue/backend/src/scripts/migrateSplitStaff.js:
  Line 18:  *   role "manager"    → managers      (Manager model, bank denormalized from branch)

  Line 48:   // Denormalize bank for admins/managers via their branch → Branch.bank.

  Line 81:   const managers = [];

  Line 90:     managers.push({ ...rest, branch: doc.branch, bank });

  Line 109:   report("managers", managers, skippedManagers);

  Line 112:     `  (superadmins/admins/managers who can't migrate stay in staffs untouched)`,

  Line 136:   await insert(Manager, managers, "managers");

  Line 152:     ...managers.map((d) => d._id),


/home/gamp/Desktop/cue/backend/src/middlewares/resolveStaffUser.js:
  Line 12:  *   1. X-Staff-Id header (always a Staff id — managers/admins don't


/home/gamp/Desktop/cue/backend/src/validators/staff.validator.js:
  Line 8:  * Managers are created via POST /api/managers; admins self-register.

  Line 31:   // Required for admins; managers always use their own branch (ignored in body).


/home/gamp/Desktop/cue/backend/src/validators/auth.validator.js:
  Line 98:   // branch required only for admins (managers use their own branch).


/home/gamp/Desktop/cue/backend/src/validators/manager.validator.js:
  Line 4:  * POST /api/managers — admin creates a manager.

  Line 34: /** PATCH /api/managers/:managerId/branch — reassign a manager's branch. */


/home/gamp/Desktop/cue/backend/src/routes/manager.routes.js:
  Line 19:  * Managers do NOT have routes here — they cannot create other managers.


/home/gamp/Desktop/cue/backend/src/routes/v1/staff.routes.js:
  Line 24:  * bankScope still isolates by key.bankName; managers are scoped to their


/home/gamp/Desktop/cue/backend/src/controllers/staff.controller.js:
  Line 21:  * Bank scoping: managers → own branch; admins → branches where


/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js:
  Line 15:  * invite issue/redeem for managers and staff, /me, and change-password.


/home/gamp/Desktop/cue/backend/src/controllers/admin.controller.js:
  Line 12:  * - All managers whose branch is in req.bankBranchIds

  Line 18:  * After the four-model split, managers live in the Manager collection

  Line 55:     const [branches, managers] = await Promise.all([

  Line 75:     const managerBranchIds = managers.map((m) => m.branch?._id).filter(Boolean);

  Line 91:     // Enrich managers with their staff count

  Line 92:     const enrichedManagers = managers.map((m) => ({

  Line 108:           totalManagers: managers.length,

  Line 117:         managers: enrichedManagers,


/home/gamp/Desktop/cue/backend/src/controllers/ticket.controller.js:
  Line 17:  * already blocks managers/admins — this catches any path that reaches


/home/gamp/Desktop/cue/backend/src/controllers/staffImport.controller.js:
  Line 64:         // Staff collection only — managers/admins are not importable via CSV.


/home/gamp/Desktop/cue/backend/src/controllers/manager.controller.js:
  Line 33:  * POST /api/managers — admin only (route already authorize("admin")).

  Line 99:  * GET /api/managers — admin only; bank-scoped to the admin's tenant.

  Line 110:     const [total, managers] = await Promise.all([

  Line 118:     const items = managers.map((m) => ({

  Line 134:  * PATCH /api/managers/:managerId/branch — admin reassigns branch.

  Line 184:  * DELETE /api/managers/:managerId — soft-deactivate (admin).

```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome",
  "pattern": "createManager|tempPassword|Add manager"
}
```

**Output:**
```
Found 13 matches
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerSubTab.jsx:
  Line 6:   createManager,

  Line 18:  * Cue-XXXXXX-XXXXXX, returned once as tempPassword (never stored plain).

  Line 77:       const res = await createManager(payload, token);

  Line 79:       if (created.tempPassword) {

  Line 83:           tempPassword: created.tempPassword,

  Line 156:       <div className={styles.mgmtSubHeading}>Add manager</div>

  Line 203:           {submitting ? "Adding…" : "Add manager"}

  Line 216:               <code>{tempCreated.tempPassword}</code>

  Line 221:                   navigator.clipboard?.writeText(tempCreated.tempPassword)


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx:
  Line 96:       if (created.tempPassword) {

  Line 100:           tempPassword: created.tempPassword,

  Line 258:               <code>{tempCreated.tempPassword}</code>

  Line 263:                   navigator.clipboard?.writeText(tempCreated.tempPassword)

```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 19.0s)

_Thinking:_

Everything looks good. Let me also update BUILD_PLAN if needed for the manager UI wiring - but WP4 already mentioned manager-create form deferred. The AdminOverview text said deferred to WP4 which I fixed. WP4 checklist says "Frontend: StaffSubTab staff-only form; AdminOverview manager-create form deferred to WP4" - maybe update WP4 checklist but user didn't ask for plan updates.

I'll give a concise summary of what was done.

Manager creation is now wired for admins.

### What changed
- **`manageApi.js`** — `fetchManagers`, `createManager`, `deactivateManagerApi` → `GET/POST/DELETE /managers`
- **`ManagerSubTab.jsx`** (new) — list, create (name/email/password optional/branch), deactivate; blank password → one-time `Cue-…` modal
- **`ManagePanel.jsx`** — admin tabs: **Managers | Staff** (Managers is default)
- **`AdminOverview.jsx`** — “coming in WP4” copy → “Create under Manage → Managers”; fixed `setRevealedKey` bug
- **`StaffSubTab.jsx`** — password optional; shows server temp password modal (same as managers)

### Flow
`Manage → Managers` → `POST /api/managers` → `createManager` → `Manager.create` (own collection, not Staff)

Tests: 8 frontend + 123 backend green; `vite build` ok.

---

## User

whenever an api key is approved by a superAdmin the key isn't current shown to the admin of the bank so there is no way they can copy it.
When an api key is revoked the status isn't currently updated for the bank admin.

How will the api key be used by the bank admin?

---

## Assistant (Plan · MiMo-V2.6-Flash Free · 63.2s)

_Thinking:_

The user is asking about two issues with API key approval/revocation flow for bank admins:

1. When an API key is approved by superadmin, the key isn't shown to the bank admin so they can't copy it
2. When an API key is revoked, the status isn't updated for the bank admin

They also ask "How will the api key be used by the bank admin?"

I'm in plan mode - READ ONLY. I need to investigate the code thoroughly and present a plan.

Let me explore:
1. The approval flow - dual reveal, encryptedRawKey staging, bank admin one-time reveal
2. The revoke flow - does it update ApiKeyRequest status?
3. How bank admin uses the key (X-API-Key header for v1)

From prior context I know:
- Platform approve stages encrypted key on ApiKeyRequest for bank admin reveal
- AdminOverview has reveal button when canRevealKey
- Need to verify why reveal might not work
- Revoke is on ApiKey - does it affect ApiKeyRequest status?

Let me investigate the full flow.

Investigating the approval reveal path, revoke status updates, and how the bank admin is meant to use the key.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js</path>
<type>file</type>
<content>
1: import ApiKey from "../../models/apiKey.model.js";
2: import { sendSuccess, sendError } from "../../utils/response.js";
3: import { parsePagination, paginatedResponse } from "../../utils/pagination.js";
4: import { validationResult } from "express-validator";
5: 
6: /**
7:  * Platform API key controller — superadmin-only key lifecycle.
8:  *
9:  * Replaces the old /api/v1/api-keys routes (authorize("admin")) which
10:  * let ANY bank admin see ALL banks' keys — a multi-tenancy hole.
11:  *
12:  * The raw API key is only returned ONCE — at creation or rotation.
13:  * Bank admins never call these endpoints; they submit ApiKeyRequests on
14:  * JWT /api/admin/api-key-requests instead.
15:  */
16: 
17: const handleValidation = (req, res) => {
18:   const errors = validationResult(req);
19:   if (!errors.isEmpty()) {
20:     sendError(res, {
21:       statusCode: 400,
22:       message: "Validation failed",
23:       errors: errors.array().map((e) => e.msg),
24:     });
25:     return false;
26:   }
27:   return true;
28: };
29: 
30: /**
31:  * POST /api/platform/api-keys
32:  * Create a key for a bank. Returns raw key ONCE.
33:  */
34: export const createApiKey = async (req, res, next) => {
35:   try {
36:     if (!handleValidation(req, res)) return;
37: 
38:     const { bankName, label, scopes, rateLimit, expiresAt } = req.body;
39:     const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();
40: 
41:     const apiKey = await ApiKey.create({
42:       bankName,
43:       label: label || "",
44:       keyHash,
45:       keyPrefix,
46:       scopes: scopes || ["branches:read", "tickets:read"],
47:       rateLimit: rateLimit || 100,
48:       expiresAt: expiresAt || null,
49:     });
50: 
51:     return sendSuccess(res, {
52:       statusCode: 201,
53:       message: "API key created. Copy it now — it won't be shown again.",
54:       data: {
55:         id: apiKey._id,
56:         bankName: apiKey.bankName,
57:         label: apiKey.label,
58:         key: rawKey,
59:         keyPrefix: apiKey.keyPrefix,
60:         scopes: apiKey.scopes,
61:         rateLimit: apiKey.rateLimit,
62:         isActive: apiKey.isActive,
63:         requestCount: apiKey.requestCount || 0,
64:         expiresAt: apiKey.expiresAt,
65:         createdAt: apiKey.createdAt,
66:       },
67:     });
68:   } catch (error) {
69:     next(error);
70:   }
71: };
72: 
73: /**
74:  * GET /api/platform/api-keys
75:  * List all keys across banks (metadata only, no hash/raw key).
76:  */
77: export const listApiKeys = async (req, res, next) => {
78:   try {
79:     const { page, limit, skip } = parsePagination(req.query);
80: 
81:     const filter = {};
82:     if (req.query.bankName) {
83:       filter.bankName = { $regex: req.query.bankName, $options: "i" };
84:     }
85:     if (req.query.isActive !== undefined) {
86:       filter.isActive = req.query.isActive === "true";
87:     }
88: 
89:     const [keys, total] = await Promise.all([
90:       ApiKey.find(filter)
91:         .select("-keyHash")
92:         .sort("-createdAt")
93:         .skip(skip)
94:         .limit(limit),
95:       ApiKey.countDocuments(filter),
96:     ]);
97: 
98:     return sendSuccess(res, {
99:       statusCode: 200,
100:       message: "API keys fetched",
101:       data: paginatedResponse(keys, total, page, limit),
102:     });
103:   } catch (error) {
104:     next(error);
105:   }
106: };
107: 
108: /**
109:  * DELETE /api/platform/api-keys/:id
110:  * Permanently revoke (delete) a key.
111:  */
112: export const deleteApiKey = async (req, res, next) => {
113:   try {
114:     if (!handleValidation(req, res)) return;
115: 
116:     const key = await ApiKey.findByIdAndDelete(req.params.id);
117:     if (!key) {
118:       return sendError(res, { statusCode: 404, message: "API key not found" });
119:     }
120: 
121:     return sendSuccess(res, {
122:       statusCode: 200,
123:       message: `API key for "${key.bankName}" has been permanently revoked`,
124:     });
125:   } catch (error) {
126:     next(error);
127:   }
128: };
129: 
130: /**
131:  * POST /api/platform/api-keys/:id/rotate
132:  * Rotate a key: new key generated, old key valid for 24h grace period.
133:  * Raw key returned ONCE to superadmin only (bank admin does NOT get a
134:  * rotation reveal — approval-time reveal only).
135:  */
136: export const rotateApiKey = async (req, res, next) => {
137:   try {
138:     if (!handleValidation(req, res)) return;
139: 
140:     const oldKey = await ApiKey.findById(req.params.id);
141:     if (!oldKey) {
142:       return sendError(res, { statusCode: 404, message: "API key not found" });
143:     }
144: 
145:     const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();
146: 
147:     oldKey.keyHash = keyHash;
148:     oldKey.keyPrefix = keyPrefix;
149:     oldKey.gracePeriodEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
150:     await oldKey.save();
151: 
152:     return sendSuccess(res, {
153:       statusCode: 200,
154:       message:
155:         "API key rotated. New key shown below. Old key valid for 24 hours.",
156:       data: {
157:         id: oldKey._id,
158:         bankName: oldKey.bankName,
159:         label: oldKey.label,
160:         key: rawKey,
161:         keyPrefix: oldKey.keyPrefix,
162:         oldKeyValidUntil: oldKey.gracePeriodEndsAt,
163:         scopes: oldKey.scopes,
164:         rateLimit: oldKey.rateLimit,
165:       },
166:     });
167:   } catch (error) {
168:     next(error);
169:   }
170: };
171: 
172: /**
173:  * PATCH /api/platform/api-keys/:id/toggle
174:  * Suspend (disable) or re-enable a key without deleting it.
175:  */
176: export const toggleApiKey = async (req, res, next) => {
177:   try {
178:     if (!handleValidation(req, res)) return;
179: 
180:     const key = await ApiKey.findByIdAndUpdate(
181:       req.params.id,
182:       [{ $set: { isActive: { $not: "$isActive" } } }],
183:       { returnDocument: "after" },
184:     ).select("-keyHash");
185: 
186:     if (!key) {
187:       return sendError(res, { statusCode: 404, message: "API key not found" });
188:     }
189: 
190:     return sendSuccess(res, {
191:       statusCode: 200,
192:       message: `API key ${key.isActive ? "enabled" : "suspended"}`,
193:       data: key,
194:     });
195:   } catch (error) {
196:     next(error);
197:   }
198: };

(End of file - total 198 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js</path>
<type>file</type>
<content>
1: import { Router } from "express";
2: import { body, param, validationResult } from "express-validator";
3: import ApiKeyRequest from "../models/apiKeyRequest.model.js";
4: import { sendSuccess, sendError } from "../utils/response.js";
5: import { parsePagination, paginatedResponse } from "../utils/pagination.js";
6: import { decryptKey } from "../utils/keyWrap.js";
7: import { protect, authorize } from "../middlewares/auth.middleware.js";
8: 
9: /**
10:  * Bank-admin API key request routes — JWT-authenticated (Phase 13 WP4).
11:  *
12:  * Same behavior as the v1 API-key version, but identity comes from the
13:  * admin's JWT (`req.user`) instead of the API key header. This is the
14:  * path the dashboard will use once WP6 moves it off v1.
15:  *
16:  * bankName is ALWAYS forced from Admin.bank (never from the body).
17:  *
18:  * One-time reveal:
19:  *   GET /api/admin/api-key-requests/:id
20:  *   If status=approved and bankKeyRevealedAt is null, returns the raw key
21:  *   (decrypted from the staged ciphertext), wipes ciphertext, and sets
22:  *   bankKeyRevealedAt. Subsequent GETs return metadata only (no raw key).
23:  */
24: const router = Router();
25: 
26: const BANK_REQUESTABLE_SCOPES = [
27:   "branches:read",
28:   "tickets:read",
29:   "tickets:write",
30:   "staff:read",
31:   "analytics:read",
32:   "webhooks:manage",
33:   // "admin" is reserved for superadmin-created keys only.
34: ];
35: 
36: // Only bank admins may request keys for their bank.
37: router.use(protect, authorize("admin"));
38: 
39: /**
40:  * POST /api/admin/api-key-requests
41:  * Body: { label?, scopes?, rateLimit? }
42:  */
43: router.post(
44:   "/",
45:   body("label")
46:     .optional()
47:     .trim()
48:     .isLength({ max: 200 })
49:     .withMessage("Label must be under 200 characters"),
50:   body("scopes")
51:     .optional()
52:     .isArray({ min: 1 })
53:     .withMessage("Scopes must be a non-empty array")
54:     .custom((scopes) => {
55:       const invalid = scopes.filter((s) => !BANK_REQUESTABLE_SCOPES.includes(s));
56:       if (invalid.length > 0) {
57:         throw new Error(
58:           `Scope(s) not requestable by bank admin: ${invalid.join(", ")}`,
59:         );
60:       }
61:       return true;
62:     }),
63:   body("rateLimit")
64:     .optional()
65:     .isInt({ min: 1, max: 10000 })
66:     .withMessage("Rate limit must be between 1 and 10,000"),
67:   async (req, res, next) => {
68:     try {
69:       const errors = validationResult(req);
70:       if (!errors.isEmpty()) {
71:         return sendError(res, {
72:           statusCode: 400,
73:           message: "Validation failed",
74:           errors: errors.array().map((e) => e.msg),
75:         });
76:       }
77: 
78:       // Bank scope always comes from the JWT identity (Admin.bank).
79:       const bankName = req.user.bank;
80:       if (!bankName) {
81:         return sendError(res, {
82:           statusCode: 400,
83:           message: "Admin has no bank — cannot request API keys",
84:         });
85:       }
86: 
87:       // Prevent duplicate pending requests for the same bank.
88:       const existingPending = await ApiKeyRequest.findOne({
89:         bankName,
90:         status: "pending",
91:       });
92:       if (existingPending) {
93:         return sendError(res, {
94:           statusCode: 409,
95:           message: "You already have a pending API key request",
96:         });
97:       }
98: 
99:       const { label, scopes, rateLimit } = req.body;
100: 
101:       const request = await ApiKeyRequest.create({
102:         bankName,
103:         // Admin collection ref (WP1 changed requestedBy → Admin).
104:         requestedBy: req.user._id,
105:         label: label || "",
106:         scopes: scopes?.length
107:           ? scopes
108:           : ["branches:read", "tickets:read", "tickets:write"],
109:         rateLimit: rateLimit || 100,
110:         status: "pending",
111:       });
112: 
113:       return sendSuccess(res, {
114:         statusCode: 201,
115:         message: "API key request submitted for superadmin review",
116:         data: {
117:           id: request._id,
118:           bankName: request.bankName,
119:           label: request.label,
120:           scopes: request.scopes,
121:           rateLimit: request.rateLimit,
122:           status: request.status,
123:           createdAt: request.createdAt,
124:         },
125:       });
126:     } catch (error) {
127:       next(error);
128:     }
129:   },
130: );
131: 
132: /**
133:  * GET /api/admin/api-key-requests
134:  * List this admin's bank requests (metadata only; ciphertext never included).
135:  */
136: router.get("/", async (req, res, next) => {
137:   try {
138:     const bankName = req.user.bank;
139:     if (!bankName) {
140:       return sendError(res, {
141:         statusCode: 400,
142:         message: "Admin has no bank — cannot list API key requests",
143:       });
144:     }
145: 
146:     const { page, limit, skip } = parsePagination(req.query);
147:     const filter = { bankName };
148: 
149:     const [requests, total] = await Promise.all([
150:       ApiKeyRequest.find(filter)
151:         .select("-encryptedRawKey")
152:         .sort("-createdAt")
153:         .skip(skip)
154:         .limit(limit),
155:       ApiKeyRequest.countDocuments(filter),
156:     ]);
157: 
158:     // Surface whether a reveal is still available (approved but not yet shown).
159:     const data = requests.map((r) => ({
160:       id: r._id,
161:       bankName: r.bankName,
162:       label: r.label,
163:       scopes: r.scopes,
164:       rateLimit: r.rateLimit,
165:       status: r.status,
166:       reviewNote: r.reviewNote,
167:       apiKey: r.apiKey,
168:       canRevealKey:
169:         r.status === "approved" &&
170:         !!r.encryptedRawKey &&
171:         !r.bankKeyRevealedAt,
172:       revealedAt: r.bankKeyRevealedAt,
173:       createdAt: r.createdAt,
174:     }));
175: 
176:     return sendSuccess(res, {
177:       statusCode: 200,
178:       message: "API key requests fetched",
179:       data: paginatedResponse(data, total, page, limit),
180:     });
181:   } catch (error) {
182:     next(error);
183:   }
184: });
185: 
186: /**
187:  * GET /api/admin/api-key-requests/:id
188:  * One-time raw-key reveal for an approved request (bank-scoped by JWT).
189:  */
190: router.get(
191:   "/:id",
192:   param("id").isMongoId().withMessage("Invalid request ID"),
193:   async (req, res, next) => {
194:     try {
195:       const errors = validationResult(req);
196:       if (!errors.isEmpty()) {
197:         return sendError(res, {
198:           statusCode: 400,
199:           message: "Validation failed",
200:           errors: errors.array().map((e) => e.msg),
201:         });
202:       }
203: 
204:       const bankName = req.user.bank;
205:       if (!bankName) {
206:         return sendError(res, {
207:           statusCode: 400,
208:           message: "Admin has no bank — cannot fetch API key requests",
209:         });
210:       }
211: 
212:       // Always scope the lookup to this bank — never leak another bank's request.
213:       const request = await ApiKeyRequest.findOne({
214:         _id: req.params.id,
215:         bankName,
216:       }).select("-encryptedRawKey");
217: 
218:       if (!request) {
219:         return sendError(res, { statusCode: 404, message: "Request not found" });
220:       }
221: 
222:       let rawKey = null;
223:       let justRevealed = false;
224: 
225:       if (request.status === "approved" && !request.bankKeyRevealedAt) {
226:         const full = await ApiKeyRequest.findById(request._id).select(
227:           "encryptedRawKey",
228:         );
229:         if (full?.encryptedRawKey) {
230:           try {
231:             rawKey = decryptKey(full.encryptedRawKey);
232:             // Wipe ciphertext permanently after successful decrypt.
233:             await ApiKeyRequest.updateOne(
234:               { _id: request._id },
235:               {
236:                 $set: { bankKeyRevealedAt: new Date() },
237:                 $unset: { encryptedRawKey: 1 },
238:               },
239:             );
240:             justRevealed = true;
241:           } catch {
242:             // Decryption failed (wrong secret / corruption) — don't leak internals.
243:             rawKey = null;
244:           }
245:         }
246:       }
247: 
248:       return sendSuccess(res, {
249:         statusCode: 200,
250:         message: justRevealed
251:           ? "API key revealed — copy it now, it won't be shown again"
252:           : "API key request fetched",
253:         data: {
254:           id: request._id,
255:           bankName: request.bankName,
256:           label: request.label,
257:           scopes: request.scopes,
258:           rateLimit: request.rateLimit,
259:           status: request.status,
260:           reviewNote: request.reviewNote,
261:           apiKey: request.apiKey,
262:           revealedAt: request.bankKeyRevealedAt,
263:           // Raw key only on the one-time reveal; null afterwards.
264:           key: rawKey,
265:         },
266:       });
267:     } catch (error) {
268:       next(error);
269:     }
270:   },
271: );
272: 
273: export default router;

(End of file - total 273 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx</path>
<type>file</type>
<content>
1: import { useCallback, useEffect, useState } from "react";
2: import { motion } from "framer-motion";
3: import { useAuth } from "../../features/auth/AuthContext";
4: import {
5:   fetchAdminOverview,
6:   createBranch,
7: } from "../../features/staff/adminApi";
8: import {
9:   requestApiKey,
10:   fetchApiKeyRequests,
11:   revealApiKeyRequest,
12: } from "../../features/staff/apiKeyRequestApi";
13: import { ApiError } from "../../lib/apiClient";
14: import styles from "./StaffHome.module.css";
15: 
16: // Scopes a bank admin may request (admin scope is superadmin-only).
17: const REQUESTABLE_SCOPES = [
18:   "branches:read",
19:   "tickets:read",
20:   "tickets:write",
21:   "staff:read",
22:   "analytics:read",
23:   "webhooks:manage",
24: ];
25: 
26: /**
27:  * AdminOverview — cross-branch dashboard for bank-scoped admin role.
28:  * Shows all branches (this bank only), all managers with staff counts,
29:  * a form to create branches, and the API key request panel
30:  * (request new key + view status / one-time reveal).
31:  *
32:  * Manager creation lives on Manage → Managers (POST /managers).
33:  */
34: const AdminOverview = () => {
35:   const { auth } = useAuth();
36:   const [data, setData] = useState(null);
37:   const [loading, setLoading] = useState(true);
38:   const [error, setError] = useState(null);
39: 
40:   // Branch creation form
41:   const [branchForm, setBranchForm] = useState({ name: "", location: "" });
42:   const [branchFormError, setBranchFormError] = useState(null);
43:   const [branchSubmitting, setBranchSubmitting] = useState(false);
44: 
45:   // API key request state
46:   const [keyRequests, setKeyRequests] = useState([]);
47:   const [keyForm, setKeyForm] = useState({
48:     label: "",
49:     rateLimit: 100,
50:     scopes: ["branches:read", "tickets:read", "tickets:write"],
51:   });
52:   const [keyFormError, setKeyFormError] = useState(null);
53:   const [keySubmitting, setKeySubmitting] = useState(false);
54:   const [adminRevealKey, setAdminRevealKey] = useState(null); // one-time raw key display
55: 
56:   const load = useCallback(async () => {
57:     try {
58:       // JWT admin overview — bank scope from Admin.bank server-side (WP6).
59:       const res = await fetchAdminOverview(auth.token);
60:       setData(res.data);
61:       setError(null);
62:     } catch (err) {
63:       setError(err.message || "Couldn't load admin overview.");
64:     } finally {
65:       setLoading(false);
66:     }
67:   }, [auth.token]);
68: 
69:   const loadKeyRequests = useCallback(async () => {
70:     try {
71:       const res = await fetchApiKeyRequests(auth.token);
72:       // paginatedResponse nests under data: { data: [...], meta }
73:       setKeyRequests(res.data?.data || res.data?.items || []);
74:     } catch {
75:       // Non-fatal — request panel just stays empty.
76:       setKeyRequests([]);
77:     }
78:   }, [auth.token]);
79: 
80:   useEffect(() => {
81:     load();
82:     loadKeyRequests();
83:   }, [load, loadKeyRequests]);
84: 
85:   const handleBranchChange = (field) => (e) =>
86:     setBranchForm((f) => ({ ...f, [field]: e.target.value }));
87: 
88:   const handleCreateBranch = async (e) => {
89:     e.preventDefault();
90:     setBranchFormError(null);
91:     setBranchSubmitting(true);
92:     try {
93:       await createBranch(branchForm, auth.token);
94:       setBranchForm({ name: "", location: "" });
95:       await load();
96:     } catch (err) {
97:       setBranchFormError(
98:         err instanceof ApiError ? err.message : "Couldn't create branch.",
99:       );
100:     } finally {
101:       setBranchSubmitting(false);
102:     }
103:   };
104: 
105:   // ── API key request handlers ──────────────────────────────
106:   const toggleScope = (scope) =>
107:     setKeyForm((f) => ({
108:       ...f,
109:       scopes: f.scopes.includes(scope)
110:         ? f.scopes.filter((s) => s !== scope)
111:         : [...f.scopes, scope],
112:     }));
113: 
114:   const handleRequestKey = async (e) => {
115:     e.preventDefault();
116:     setKeyFormError(null);
117:     if (keyForm.scopes.length === 0) {
118:       setKeyFormError("Select at least one scope.");
119:       return;
120:     }
121:     setKeySubmitting(true);
122:     try {
123:       await requestApiKey(keyForm, auth.token);
124:       setKeyForm({
125:         label: "",
126:         rateLimit: 100,
127:         scopes: ["branches:read", "tickets:read", "tickets:write"],
128:       });
129:       await loadKeyRequests();
130:     } catch (err) {
131:       setKeyFormError(
132:         err instanceof ApiError
133:           ? err.errors?.join(", ") || err.message
134:           : "Couldn't submit request.",
135:       );
136:     } finally {
137:       setKeySubmitting(false);
138:     }
139:   };
140: 
141:   const handleRevealKey = async (id) => {
142:     try {
143:       const res = await revealApiKeyRequest(id, auth.token);
144:       if (res.data?.key) {
145:         setAdminRevealKey({ id, key: res.data.key });
146:       } else {
147:         setKeyFormError("Key already revealed previously.");
148:       }
149:       await loadKeyRequests();
150:     } catch (err) {
151:       setKeyFormError(err.message || "Couldn't reveal key.");
152:     }
153:   };
154: 
155:   if (loading) return <p className={styles.mgmtStatus}>Loading overview…</p>;
156:   if (error) return <p className={styles.mgmtStatusError}>{error}</p>;
157:   if (!data) return null;
158: 
159:   return (
160:     <motion.div
161:       initial={{ opacity: 0, y: 12 }}
162:       animate={{ opacity: 1, y: 0 }}
163:       transition={{ duration: 0.4 }}
164:     >
165:       {/* ── Summary Cards ─────────────────────────── */}
166:       <div className={styles.ovStatRow}>
167:         <div className={styles.ovStatCard}>
168:           <span className={styles.ovStatValue}>{data.summary.totalBranches}</span>
169:           <span className={styles.ovStatLabel}>branches</span>
170:         </div>
171:         <div className={styles.ovStatCard}>
172:           <span className={styles.ovStatValue}>{data.summary.totalManagers}</span>
173:           <span className={styles.ovStatLabel}>managers</span>
174:         </div>
175:         <div className={styles.ovStatCard}>
176:           <span className={styles.ovStatValue}>{data.summary.totalStaff}</span>
177:           <span className={styles.ovStatLabel}>total staff</span>
178:         </div>
179:       </div>
180: 
181:       {/* ── Branches List ─────────────────────────── */}
182:       <div className={styles.mgmtSubHeading}>Branches</div>
183:       {data.branches.length === 0 && (
184:         <p className={styles.mgmtStatus}>No branches yet.</p>
185:       )}
186:       {data.branches.map((b) => (
187:         <div key={b.id} className={styles.mgmtRow}>
188:           <div>
189:             <div className={styles.mgmtRowTitle}>{b.name}</div>
190:             <div className={styles.mgmtRowSub}>{b.location || "No location"}</div>
191:           </div>
192:           <div className={styles.mgmtRowActions}>
193:             <span
194:               className={b.dayOpen ? styles.mgmtBadgeOpen : styles.mgmtBadgeClosed}
195:             >
196:               {b.dayOpen ? "Open" : "Closed"}
197:             </span>
198:           </div>
199:         </div>
200:       ))}
201: 
202:       {/* ── Create Branch Form ─────────────────────── */}
203:       <div className={styles.mgmtSubHeading}>Add branch</div>
204:       <form onSubmit={handleCreateBranch} className={styles.mgmtInlineForm}>
205:         <input
206:           required
207:           placeholder="Branch name"
208:           value={branchForm.name}
209:           onChange={handleBranchChange("name")}
210:         />
211:         <input
212:           placeholder="Location"
213:           value={branchForm.location}
214:           onChange={handleBranchChange("location")}
215:         />
216:         {branchFormError && (
217:           <p className={styles.mgmtStatusError}>{branchFormError}</p>
218:         )}
219:         <button
220:           type="submit"
221:           className={styles.mgmtSubmitBtn}
222:           disabled={branchSubmitting}
223:         >
224:           {branchSubmitting ? "Adding…" : "Add branch"}
225:         </button>
226:       </form>
227: 
228:       {/* ── Managers List ──────────────────────────── */}
229:       <div className={styles.mgmtSubHeading}>Managers</div>
230:       {data.managers.length === 0 && (
231:         <p className={styles.mgmtStatus}>
232:           No managers yet. Create one under Manage → Managers.
233:         </p>
234:       )}
235:       {data.managers.map((m) => (
236:         <div key={m.id} className={styles.mgmtRow}>
237:           <div>
238:             <div className={styles.mgmtRowTitle}>{m.name}</div>
239:             <div className={styles.mgmtRowSub}>
240:               {m.email}
241:               {m.branch && <> · {m.branch.name}</>}
242:             </div>
243:           </div>
244:           <div className={styles.mgmtRowActions}>
245:             <span className={styles.ovStaffCount}>
246:               {m.staffCount} staff
247:             </span>
248:           </div>
249:         </div>
250:       ))}
251: 
252:       {/* ── API Key Request Panel ─────────────────────── */}
253:       <div className={styles.mgmtSubHeading}>API key access</div>
254:       <p className={styles.mgmtStatus}>
255:         Request an API key for your bank. The superadmin reviews it on the
256:         platform console — once approved you can reveal the key once here.
257:       </p>
258: 
259:       <form onSubmit={handleRequestKey} className={styles.mgmtInlineForm}>
260:         <input
261:           placeholder="Label (e.g. Core banking backend)"
262:           value={keyForm.label}
263:           onChange={(e) =>
264:             setKeyForm((f) => ({ ...f, label: e.target.value }))
265:           }
266:         />
267:         <input
268:           type="number"
269:           min={1}
270:           max={10000}
271:           title="Rate limit (requests/min)"
272:           placeholder="Rate limit"
273:           value={keyForm.rateLimit}
274:           onChange={(e) =>
275:             setKeyForm((f) => ({
276:               ...f,
277:               rateLimit: parseInt(e.target.value, 10) || 100,
278:             }))
279:           }
280:           style={{ maxWidth: 140 }}
281:         />
282:         <div className={styles.scopeChips}>
283:           {REQUESTABLE_SCOPES.map((scope) => (
284:             <button
285:               type="button"
286:               key={scope}
287:               className={
288:                 keyForm.scopes.includes(scope)
289:                   ? styles.scopeChipActive
290:                   : styles.scopeChip
291:               }
292:               onClick={() => toggleScope(scope)}
293:             >
294:               {scope}
295:             </button>
296:           ))}
297:         </div>
298:         {keyFormError && (
299:           <p className={styles.mgmtStatusError}>{keyFormError}</p>
300:         )}
301:         <button
302:           type="submit"
303:           className={styles.mgmtSubmitBtn}
304:           disabled={keySubmitting}
305:         >
306:           {keySubmitting ? "Submitting…" : "Request API key"}
307:         </button>
308:       </form>
309: 
310:       {/* One-time raw key reveal modal */}
311:       {adminRevealKey && (
312:         <div className={styles.keyModalBackdrop}>
313:           <div className={styles.keyModal}>
314:             <h4>Your API key</h4>
315:             <div className={styles.rawKeyBox}>
316:               <code>{adminRevealKey.key}</code>
317:               <button
318:                 type="button"
319:                 className={styles.scopeChip}
320:                 onClick={() => navigator.clipboard?.writeText(adminRevealKey.key)}
321:               >
322:                 Copy
323:               </button>
324:             </div>
325:             <p className={styles.mgmtStatusError} style={{ background: "none", padding: 0 }}>
326:               This is the only time this key will be shown. Store it securely.
327:             </p>
328:             <button
329:               type="button"
330:               className={styles.mgmtSubmitBtn}
331:               onClick={() => setAdminRevealKey(null)}
332:             >
333:               I've saved it
334:             </button>
335:           </div>
336:         </div>
337:       )}
338: 
339:       <div className={styles.mgmtSubHeading}>Request status</div>
340:       {keyRequests.length === 0 && (
341:         <p className={styles.mgmtStatus}>No API key requests yet.</p>
342:       )}
343:       {keyRequests.map((r) => (
344:         <div key={r.id} className={styles.mgmtRow}>
345:           <div>
346:             <div className={styles.mgmtRowTitle}>
347:               {r.label || "API key request"}
348:             </div>
349:             <div className={styles.mgmtRowSub}>
350:               scopes: {r.scopes?.join(", ")} · {r.rateLimit}/min ·{" "}
351:               {new Date(r.createdAt).toLocaleString()}
352:               {r.reviewNote ? ` · note: ${r.reviewNote}` : ""}
353:             </div>
354:           </div>
355:           <div className={styles.mgmtRowActions}>
356:             <span
357:               className={
358:                 r.status === "approved"
359:                   ? styles.mgmtBadgeOpen
360:                   : r.status === "rejected"
361:                     ? styles.mgmtBadgeClosed
362:                     : styles.mgmtBadgePending
363:               }
364:             >
365:               {r.status}
366:             </span>
367:             {r.canRevealKey && (
368:               <button
369:                 type="button"
370:                 className={styles.mgmtSubmitBtn}
371:                 onClick={() => handleRevealKey(r.id)}
372:               >
373:                 Reveal key
374:               </button>
375:             )}
376:           </div>
377:         </div>
378:       ))}
379:     </motion.div>
380:   );
381: };
382: 
383: export default AdminOverview;

(End of file - total 383 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/features/staff/apiKeyRequestApi.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/features/staff/apiKeyRequestApi.js</path>
<type>file</type>
<content>
1: import { apiClient } from "../../lib/apiClient";
2: 
3: /**
4:  * Bank admin API key request API — JWT `/api/admin/api-key-requests` (WP6).
5:  *
6:  * bankName is always taken from Admin.bank server-side (never from body).
7:  * One-time reveal: GET /:id returns { key } on the first call after
8:  * approval, then key is null forever after.
9:  */
10: 
11: /** POST — submit a pending request for this admin's bank */
12: export const requestApiKey = (data, token) =>
13:   apiClient.post("/admin/api-key-requests", data, { token });
14: 
15: /** GET — list this bank's requests (status view) */
16: export const fetchApiKeyRequests = (token) =>
17:   apiClient.get("/admin/api-key-requests", { token });
18: 
19: /**
20:  * GET /:id — one-time raw-key reveal for an approved request.
21:  * Returns { ...meta, key: "cue_..." } first time; key: null afterwards.
22:  */
23: export const revealApiKeyRequest = (id, token) =>
24:   apiClient.get(`/admin/api-key-requests/${id}`, { token });

(End of file - total 24 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/models/apiKeyRequest.model.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/models/apiKeyRequest.model.js</path>
<type>file</type>
<content>
1: import mongoose from "mongoose";
2: 
3: /**
4:  * ApiKeyRequest — bank admin's request for an API key for their bank.
5:  *
6:  * Flow:
7:  * 1. Bank admin (Admin JWT) POSTs a request with label, scopes, rateLimit.
8:  *    bankName is forced from Admin.bank (JWT /api/admin/api-key-requests).
9:  * 2. Superadmin reviews it on /platform and approves or rejects.
10:  * 3. On approve: an ApiKey is created, the raw key is returned once to
11:  *    the superadmin, AND the raw key is AES-256-GCM-encrypted onto this
12:  *    document so the bank admin can reveal it once from request status.
13:  * 4. Bank admin's first GET of the approved request returns the raw key,
14:  *    then ciphertext is wiped permanently (bankKeyRevealedAt set).
15:  *
16:  * Rotation reveals are NOT staged here (approval only).
17:  */
18: const apiKeyRequestSchema = new mongoose.Schema(
19:   {
20:     bankName: {
21:       type: String,
22:       required: true,
23:       trim: true,
24:       index: true,
25:     },
26:     // The bank admin (Admin collection) who submitted the request.
27:     requestedBy: {
28:       type: mongoose.Schema.Types.ObjectId,
29:       ref: "Admin",
30:       required: true,
31:     },
32:     label: {
33:       type: String,
34:       trim: true,
35:       default: "",
36:       maxlength: 200,
37:     },
38:     scopes: {
39:       type: [String],
40:       default: ["branches:read", "tickets:read"],
41:     },
42:     rateLimit: {
43:       type: Number,
44:       default: 100,
45:       min: 1,
46:       max: 10000,
47:     },
48:     status: {
49:       type: String,
50:       enum: ["pending", "approved", "rejected"],
51:       default: "pending",
52:       index: true,
53:     },
54:     // The platform superadmin who approved or rejected the request.
55:     reviewedBy: {
56:       type: mongoose.Schema.Types.ObjectId,
57:       ref: "Superadmin",
58:       default: null,
59:     },
60:     reviewNote: {
61:       type: String,
62:       default: "",
63:       maxlength: 500,
64:     },
65:     // Set when approved — links to the created ApiKey document.
66:     apiKey: {
67:       type: mongoose.Schema.Types.ObjectId,
68:       ref: "ApiKey",
69:       default: null,
70:     },
71:     // AES-256-GCM ciphertext of the raw key, staged for bank admin's
72:     // one-time reveal. Wiped after bankKeyRevealedAt is set.
73:     encryptedRawKey: {
74:       type: String,
75:       default: null,
76:     },
77:     rawKeyStagedAt: {
78:       type: Date,
79:       default: null,
80:     },
81:     bankKeyRevealedAt: {
82:       type: Date,
83:       default: null,
84:     },
85:   },
86:   { timestamps: true },
87: );
88: 
89: // Fast lookup of a bank's outstanding requests.
90: apiKeyRequestSchema.index({ bankName: 1, status: 1, createdAt: -1 });
91: 
92: const ApiKeyRequest = mongoose.model("ApiKeyRequest", apiKeyRequestSchema);
93: export default ApiKeyRequest;

(End of file - total 93 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/models/apiKey.model.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/models/apiKey.model.js</path>
<type>file</type>
<content>
1: import mongoose from "mongoose";
2: import crypto from "crypto";
3: import bcrypt from "bcryptjs";
4: 
5: /**
6:  * ApiKey Model
7:  *
8:  * Represents an API key issued to a bank/partner for integrating with Cue.
9:  * Each key is tied to a bank (tenant) and carries scoped permissions.
10:  *
11:  * The raw key is only shown once at creation time (or rotation).
12:  * What's stored in the DB is a bcrypt hash of the key, similar to
13:  * how passwords are stored — so even a DB leak doesn't expose raw keys.
14:  *
15:  * Key format: `cue_<48 random hex chars>` (96 chars total)
16:  * Example:    `cue_a1b2c3d4e5f6...`
17:  */
18: 
19: // Allowed permission scopes for API keys.
20: // A key can have multiple scopes depending on what the bank needs.
21: const VALID_SCOPES = [
22:   "branches:read", // Read branch info, queues, counters, board data
23:   "tickets:write", // Create/cancel tickets (kiosk, appointment, customer)
24:   "tickets:read", // Read ticket status, position, ETA
25:   "staff:read", // Read staff list
26:   "analytics:read", // Read analytics, reports
27:   "webhooks:manage", // Create/delete/toggle webhooks
28:   "admin", // Full access (system management)
29: ];
30: 
31: const apiKeySchema = new mongoose.Schema(
32:   {
33:     // The bank/partner this key belongs to. Used for multi-tenant data isolation.
34:     bankName: {
35:       type: String,
36:       required: [true, "Bank name is required"],
37:       trim: true,
38:       index: true,
39:     },
40: 
41:     // Human-readable label to identify what this key is for.
42:     // e.g., "Production Backend", "Kiosk Tablet #3", "Lobby Display"
43:     label: {
44:       type: String,
45:       trim: true,
46:       default: "",
47:     },
48: 
49:     // Bcrypt hash of the raw API key. The raw key is only shown once.
50:     keyHash: {
51:       type: String,
52:       required: true,
53:       unique: true,
54:     },
55: 
56:     // The last 8 characters of the raw key, stored in plaintext.
57:     // Used to help admins identify which key is which (e.g., "key ends in ...a1b2c3d4").
58:     keyPrefix: {
59:       type: String,
60:       required: true,
61:     },
62: 
63:     // Permission scopes this key grants. Checked by requireScope middleware.
64:     scopes: {
65:       type: [String],
66:       enum: VALID_SCOPES,
67:       default: ["branches:read", "tickets:read"],
68:       validate: {
69:         validator: (scopes) => scopes.every((s) => VALID_SCOPES.includes(s)),
70:         message: "Invalid scope(s) provided",
71:       },
72:     },
73: 
74:     // Rate limit: max requests per minute for this key.
75:     // Banks can request higher limits for high-traffic integrations.
76:     rateLimit: {
77:       type: Number,
78:       default: 100, // 100 requests per minute by default
79:       min: [1, "Rate limit must be at least 1"],
80:       max: [10000, "Rate limit cannot exceed 10,000 per minute"],
81:     },
82: 
83:     // Whether this key is currently active. Disabled keys are rejected immediately.
84:     isActive: {
85:       type: Boolean,
86:       default: true,
87:     },
88: 
89:     defaultStaffId: {
90:       type: mongoose.Schema.Types.ObjectId,
91:       ref: "Staff",
92:       default: null,
93:     },
94: 
95:     // Timestamp of the last time this key was used to make a request.
96:     // Updated by the authenticateApiKey middleware.
97:     lastUsedAt: {
98:       type: Date,
99:       default: null,
100:     },
101: 
102:     // Lifetime request counter, $inc'd fire-and-forget by authenticateApiKey.
103:     // Daily buckets live in ApiKeyUsage; this is the cheap total for dashboards.
104:     requestCount: {
105:       type: Number,
106:       default: 0,
107:       min: 0,
108:     },
109: 
110:     // Optional expiration date. If set, the key is rejected after this date.
111:     // null means the key never expires.
112:     expiresAt: {
113:       type: Date,
114:       default: null,
115:     },
116: 
117:     // For key rotation: when a key is rotated, the old key stays valid
118:     // until `gracePeriodEndsAt` passes. This lets banks migrate without downtime.
119:     gracePeriodEndsAt: {
120:       type: Date,
121:       default: null,
122:     },
123:   },
124:   {
125:     timestamps: true, // adds createdAt and updatedAt
126:   },
127: );
128: 
129: // Index for fast lookup by key hash during authentication.
130: // Also a compound index on bankName for tenant-scoped queries.
131: apiKeySchema.index({ bankName: 1, isActive: 1 });
132: 
133: /**
134:  * Generate a new raw API key and its hash.
135:  * Returns { rawKey, keyHash, keyPrefix }.
136:  *
137:  * The raw key is what gets sent to the admin once.
138:  * The hash is what gets stored in the DB.
139:  * The prefix (last 8 chars) helps admins identify keys.
140:  */
141: apiKeySchema.statics.generateKey = async function () {
142:   // Generate a random 48-byte hex string (96 chars)
143:   const rawKey = `cue_${crypto.randomBytes(48).toString("hex")}`;
144:   const keyHash = await bcrypt.hash(rawKey, 12); // 12 salt rounds for API keys
145:   const keyPrefix = rawKey.slice(-8); // last 8 chars for display
146: 
147:   return { rawKey, keyHash, keyPrefix };
148: };
149: 
150: /**
151:  * Verify a raw API key against a stored hash.
152:  * Returns the matching ApiKey document or null.
153:  *
154:  * This is called by the authenticateApiKey middleware.
155:  * We use a linear scan because:
156:  * 1. The number of active API keys per deployment is small (tens, not millions)
157:  * 2. bcrypt.compare is the bottleneck, not the query
158:  * 3. We need to check grace period keys too
159:  */
160: apiKeySchema.statics.verifyKey = async function (rawKey) {
161:   // Find all potentially valid keys (active, or in grace period)
162:   const candidates = await this.find({
163:     $or: [{ isActive: true }, { gracePeriodEndsAt: { $gt: new Date() } }],
164:   }).select("+keyHash");
165: 
166:   // Check each candidate until we find a match
167:   for (const candidate of candidates) {
168:     const isMatch = await bcrypt.compare(rawKey, candidate.keyHash);
169:     if (isMatch) {
170:       return candidate;
171:     }
172:   }
173: 
174:   return null;
175: };
176: 
177: const ApiKey = mongoose.model("ApiKey", apiKeySchema);
178: export default ApiKey;

(End of file - total 178 lines)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue",
  "pattern": "canRevealKey|encryptedRawKey|bankKeyRevealedAt|revok|isActive"
}
```

**Output:**
```
Found 100 matches (more matches available)
/home/gamp/Desktop/cue/BUILD_PLAN.md:
  Line 66: - Manager fields: name, email, password, branch, bank, isActive, mustChangePassword — no queues/counter, cannot serve tickets

  Line 75: - [x] `staff.model.js` slimmed: name, email, password, branch, counter, queues, isEmailVerified, isActive, mustChangePassword — **no `role`**

  Line 76: - [x] New `admin.model.js`: name, email, password, **bank** (required, indexed), isActive, mustChangePassword

  Line 77: - [x] New `manager.model.js`: name, email, password, branch, bank (denormalized), isActive, mustChangePassword — no counter/queues

  Line 78: - [x] New `superadmin.model.js`: name, email, password, isActive, mustChangePassword — not bank-scoped

  Line 84: - [x] `protect`: `modelForToken(decoded)` picks Staff/Admin/Manager/Superadmin by `kind` (falls back to `role` for pre-split tokens); rejects unknown kind; **checks `isActive`** (was missing)

  Line 167: - [x] `ApiKey` model: `key` (hashed), `bankName`, `label`, `scopes[]`, `rateLimit`, `isActive`, `lastUsedAt`, `expiresAt`, `createdAt`

  Line 489: | Key ownership | Superadmin only creates/revokes/suspends/rotates; bank admin only **requests** |

  Line 554: - [x] New `apiKeyRequest.model.js`: `bankName`, `requestedBy` (Staff ref), `label`, `scopes[]`, `rateLimit`, `status: pending/approved/rejected`, `reviewedBy`, `reviewNote`, `apiKey` ref, **`encryptedRawKey`** (iv+tag+payload), **`rawKeyStagedAt`**, `bankKeyRevealedAt`, timestamps

  Line 557:   - `GET /` (own bank's requests; exposes `canRevealKey`)

  Line 558:   - `GET /:id` one-time reveal: if approved + not yet revealed → decrypt, return raw key, wipe ciphertext, set `bankKeyRevealedAt`

  Line 574: - [x] Dashboard tabs: **Overview** (keys, active keys, requests today/7d bars, pending count, top keys), **API Keys** (table + create/suspend/revoke/rotate, raw key modal once), **Key Requests** (pending, approve→show raw key once, reject with note)


/home/gamp/Desktop/cue/deferred/frontend/src/components/AdvancedAnalytics/WebhookSettings.jsx:
  Line 128:                   className={wh.isActive ? styles.badgeActive : styles.badgeInactive}

  Line 131:                   {wh.isActive ? "Active" : "Paused"}


/home/gamp/Desktop/cue/backend/src/models/apiKey.model.js:
  Line 84:     isActive: {

  Line 131: apiKeySchema.index({ bankName: 1, isActive: 1 });

  Line 163:     $or: [{ isActive: true }, { gracePeriodEndsAt: { $gt: new Date() } }],


/home/gamp/Desktop/cue/backend/src/models/branch.model.js:
  Line 67:     isActive: {

  Line 98: branchSchema.index({ name: 1, bank: 1, isActive: 1 }, { unique: true });


/home/gamp/Desktop/cue/backend/src/models/webhook.model.js:
  Line 25:     isActive: {

  Line 41: webhookSchema.index({ branch: 1, isActive: 1 });


/home/gamp/Desktop/cue/backend/src/models/manager.model.js:
  Line 15:  *   name, email, password, branch, bank, isActive, mustChangePassword

  Line 57:     isActive: {


/home/gamp/Desktop/cue/backend/src/models/queue.model.js:
  Line 27:   isActive: {


/home/gamp/Desktop/cue/backend/src/models/admin.model.js:
  Line 46:     isActive: {


/home/gamp/Desktop/cue/backend/src/models/superadmin.model.js:
  Line 37:     isActive: {


/home/gamp/Desktop/cue/backend/src/models/staff.model.js:
  Line 59:     isActive: {


/home/gamp/Desktop/cue/backend/src/models/apiKeyRequest.model.js:
  Line 14:  *    then ciphertext is wiped permanently (bankKeyRevealedAt set).

  Line 72:     // one-time reveal. Wiped after bankKeyRevealedAt is set.

  Line 73:     encryptedRawKey: {

  Line 81:     bankKeyRevealedAt: {


/home/gamp/Desktop/cue/backend/src/scripts/seedApiKey.js:
  Line 48:     isActive: true,


/home/gamp/Desktop/cue/deferred/frontend/src/pages/StaffHome/admin/AdminPanel.jsx:
  Line 148:           <span className={styles.tileValue}>{branches.filter((b) => b.isActive !== false).length}</span>


/home/gamp/Desktop/cue/frontend/src/lib/apiClient.js:
  Line 56:     // good, expired, revoked, account gone. A login/register call never


/home/gamp/Desktop/cue/frontend/src/pages/TicketPage/TicketStatus.jsx:
  Line 47:   const isActive = isWaiting || isCalled;

  Line 117:       {isActive && (

  Line 123:       {!isActive && (


/home/gamp/Desktop/cue/backend/src/docs/openapi.yaml:
  Line 1212:         isActive:


/home/gamp/Desktop/cue/backend/tests/platform/superadmin.platform.test.js:
  Line 42:       isActive: true,

  Line 75:       isActive: true,

  Line 157:     expect(request.encryptedRawKey).toBeTruthy();


/home/gamp/Desktop/cue/deferred/backend/src/controllers/agent.controller.js:
  Line 104:     const branches = await Branch.find({ isActive: true }).select(

  Line 326:     const branches = await Branch.find({}).select("name location isActive dayOpen");

  Line 337:           active: b.isActive,


/home/gamp/Desktop/cue/deferred/backend/src/services/push.service.js:
  Line 50:     const staff = await Staff.find({ branch: branchId, isActive: true }).select("_id");

  Line 70:       isActive: true,


/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js:
  Line 20:  *   If status=approved and bankKeyRevealedAt is null, returns the raw key

  Line 22:  *   bankKeyRevealedAt. Subsequent GETs return metadata only (no raw key).

  Line 151:         .select("-encryptedRawKey")

  Line 168:       canRevealKey:

  Line 170:         !!r.encryptedRawKey &&

  Line 171:         !r.bankKeyRevealedAt,

  Line 172:       revealedAt: r.bankKeyRevealedAt,

  Line 216:       }).select("-encryptedRawKey");

  Line 225:       if (request.status === "approved" && !request.bankKeyRevealedAt) {

  Line 227:           "encryptedRawKey",

  Line 229:         if (full?.encryptedRawKey) {

  Line 231:             rawKey = decryptKey(full.encryptedRawKey);

  Line 236:                 $set: { bankKeyRevealedAt: new Date() },

  Line 237:                 $unset: { encryptedRawKey: 1 },

  Line 262:           revealedAt: request.bankKeyRevealedAt,


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx:
  Line 367:             {r.canRevealKey && (


/home/gamp/Desktop/cue/backend/README.md:
  Line 180: | DELETE | `/:id`   | Admin          | Soft delete (sets isActive) |


/home/gamp/Desktop/cue/backend/src/middlewares/apiKey.middleware.js:
  Line 40:         message: "Invalid or revoked API key",

  Line 53:     if (!keyDoc.isActive) {


/home/gamp/Desktop/cue/backend/src/middlewares/resolveStaffUser.js:
  Line 37:     if (!account || account.isActive === false) {


/home/gamp/Desktop/cue/frontend/src/pages/Platform/PlatformDashboard.jsx:
  Line 12:   revokePlatformApiKey,

  Line 27:  * - API Keys: table of all keys across banks + create / suspend / revoke / rotate

  Line 130:     if (!window.confirm("Permanently revoke this key? This cannot be undone."))

  Line 133:       await revokePlatformApiKey(id, token);

  Line 387:                       k.isActive ? styles.badgeActive : styles.badgeSuspended

  Line 390:                     {k.isActive ? "Active" : "Suspended"}

  Line 396:                     {k.isActive ? "Suspend" : "Enable"}


/home/gamp/Desktop/cue/backend/src/middlewares/auth.middleware.js:
  Line 57:     // this check was missing before the split (only login checked isActive).

  Line 58:     if (!account || account.isActive === false) {


/home/gamp/Desktop/cue/backend/src/middlewares/bankScope.middleware.js:
  Line 22:  *   const filter = { ...req.bankFilter, isActive: true };

  Line 42:       isActive: true,

  Line 87:       isActive: true,


/home/gamp/Desktop/cue/backend/src/controllers/staff.controller.js:
  Line 47:   if (!branch || branch.isActive === false) {

  Line 156:     if (!staff || !staff.isActive) {

  Line 209:     filter.isActive = true;

  Line 297:     if (!branch || branch.isActive === false) {

  Line 360:     target.isActive = false;


/home/gamp/Desktop/cue/backend/src/controllers/webhook.controller.js:
  Line 82:       [{ $set: { isActive: { $not: "$isActive" } } }],

  Line 92:       message: `Webhook ${webhook.isActive ? "enabled" : "disabled"}`,


/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js:
  Line 80:     if (!doc || doc.isActive === false) {

  Line 231:       if (!branch || branch.isActive === false) {


/home/gamp/Desktop/cue/backend/src/controllers/platform/platformKeyRequest.controller.js:
  Line 37:         .select("-encryptedRawKey") // never leak ciphertext in list view

  Line 140:     request.encryptedRawKey = encryptKey(rawKey);


/home/gamp/Desktop/cue/backend/src/controllers/platform/platformAuth.controller.js:
  Line 34:     if (!superadmin || !superadmin.isActive) {


/home/gamp/Desktop/cue/frontend/src/features/platform/platformApi.js:
  Line 36: /** DELETE /platform/api-keys/:id — revoke */

  Line 37: export const revokePlatformApiKey = (id, token) =>


/home/gamp/Desktop/cue/backend/src/controllers/queue.controller.js:
  Line 21:     const filter = { isActive: true };


/home/gamp/Desktop/cue/backend/src/controllers/board.controller.js:
  Line 12:     const branchFilter = { isActive: true };


/home/gamp/Desktop/cue/backend/src/services/webhook.service.js:
  Line 17:     const query = { isActive: true, events: event };


/home/gamp/Desktop/cue/backend/src/controllers/manager.controller.js:
  Line 23:   if (!branch || branch.isActive === false) {

  Line 104:     const filter = { isActive: true };

  Line 201:     target.isActive = false;


/home/gamp/Desktop/cue/backend/src/controllers/admin.controller.js:
  Line 36:     const branchFilter = { isActive: true };

  Line 41:     let managerFilter = { isActive: true };


(Results truncated. Consider using a more specific path or pattern.)
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue",
  "pattern": "X-API-Key|x-api-key"
}
```

**Output:**
```
Found 9 matches
/home/gamp/Desktop/cue/backend/src/scripts/seedApiKey.js:
  Line 63:   console.log("  Use this key in the X-API-Key header:");

  Line 64:   console.log(`  X-API-Key: ${rawKey}`);


/home/gamp/Desktop/cue/backend/src/middlewares/apiKey.middleware.js:
  Line 9:  * Authenticates requests using the X-API-Key header.

  Line 24:     const apiKey = req.headers["x-api-key"];

  Line 29:         message: "API key required. Pass it via the X-API-Key header.",


/home/gamp/Desktop/cue/backend/src/middlewares/tenantMatch.js:
  Line 14:  *   - JWT only (dashboard, no X-API-Key)  → scoped by admin.bank


/home/gamp/Desktop/cue/frontend/src/lib/apiClient.js:
  Line 38:         ? { "X-API-Key": apiKey }


/home/gamp/Desktop/cue/backend/src/app.js:
  Line 100: // They use API key authentication via the X-API-Key header.


/home/gamp/Desktop/cue/BUILD_PLAN.md:
  Line 173: - [x] `authenticateApiKey` middleware: reads `X-API-Key` header, validates key, attaches `req.bank` and `req.apiKey` to request

```

---

## Assistant (Plan · MiMo-V2.6-Flash Free · 92.4s)

_Thinking:_

Let me dig deeper into why canRevealKey might be false after approval. Looking at the list endpoint:

```javascript
const data = requests.map((r) => ({
  ...
  canRevealKey:
    r.status === "approved" &&
    !!r.encryptedRawKey &&
    !r.bankKeyRevealedAt,
```

But the query is:
```javascript
ApiKeyRequest.find(filter)
  .select("-encryptedRawKey")
```

**BUG**: They select `-encryptedRawKey` which excludes the field from the document! So `r.encryptedRawKey` is always undefined in the list response, so `canRevealKey` is ALWAYS false!

That's the bug for issue 1 - the Reveal button never shows because canRevealKey is always false due to selecting out encryptedRawKey.

Wait, let me re-read - they need encryptedRawKey existence for canRevealKey but they exclude it from select. Classic bug.

Fix options:
1. Don't exclude encryptedRawKey from select, but don't return it in response (just check existence)
2. Use a computed field via aggregation3. Select encryptedRawKey but strip it when mapping to response - they already strip it by only picking specific fields in the map. So they can remove `.select("-encryptedRawKey")` from list and just not include encryptedRawKey in the response object.

For issue 2 - revoke status:
- `deleteApiKey` does `findByIdAndDelete` - deletes the ApiKey document
- ApiKeyRequest still has `status: "approved"` and `apiKey` pointing to deleted key
- Bank admin never sees revoked status because:
  - Request status stays "approved" forever
  - No key status is shown on bank admin's request list (only request status)
  - There's no endpoint for bank admin to list their keys / see isActive

Also toggle (suspend) only changes ApiKey.isActive - request status stays approved.

The bank admin needs:
1. Reveal button to work (canRevealKey bug)
2. See key status (active/suspended/revoked) linked to their approved requests

How is the API key used by the bank admin?
- They copy the raw key once
- Their external systems (core banking backend, kiosk integrations, etc.) send `X-API-Key: cue_...` header to `/api/v1/*` endpoints
- The dashboard itself uses JWT, not the API key
- Scopes determine what the key can access

For status sync options:
A. When revoking/toggling ApiKey, update related ApiKeyRequest (add keyStatus field or set status)
B. Bank admin list joins ApiKey via apiKey ref to show isActive/keyPrefix
C. Both

Best approach:
1. Fix canRevealKey - don't strip encryptedRawKey before computing, strip from response payload
2. On list, populate/join apiKey status (keyPrefix, isActive) so bank admin sees Active/Suspended/Revoked
3. When deleteApiKey, optionally mark request or null out - better to show key status from ApiKey (null apiKey after delete = revoked)

Actually after delete, apiKey ref is dangling. Populate would fail/return null - can show as "revoked" when request is approved but apiKey is null OR key missing.

Better: add a denormalized status on ApiKeyRequest OR join ApiKey metadata on list.

Also when toggle suspends - populate isActive.

Let me also check if there's a KEY_WRAP_SECRET issue and if canRevealKey is the only issue.

Also check openapi/docs for how key is used.

I'll also verify sendSuccess structure for list - paginatedResponse returns { data, meta } spread into sendSuccess so payload is { status, message, data: [...], meta }. Frontend does res.data?.data - wait:

sendSuccess:
```
payload = { status, message }
if data !== null: payload.data = data
if meta !== null: payload.meta = meta
```

paginatedResponse returns `{ data: docs, meta: {...} }`
spread into sendSuccess: `sendSuccess(res, { statusCode, message, ...paginatedResponse(...) })`
which is sendSuccess(res, { statusCode, message, data: docs, meta: {...} })

So response is `{ status, message, data: [...], meta }`
Frontend: `res.data?.data || res.data?.items` - res.data is the array, so res.data?.data is undefined!

**ANOTHER BUG**: Frontend does `res.data?.data || res.data?.items` but API returns `res.data` as array directly!

Wait: `setKeyRequests(res.data?.data || res.data?.items || [])`
If res.data is array, res.data.data is undefined, res.data.items is undefined, so keyRequests = []

That would mean NO requests show at all! User said status doesn't update on revoke - implying they see approved status. So maybe requests do show...

If res.data is array, Array doesn't have .data or .items, so empty array always. User would see "No API key requests yet" always - but they said "status isn't currently updated for the bank admin" which implies they see status.

Unless... let me re-check. Maybe frontend should be `res.data || []` when data is array.

Looking at StaffSubTab: `setStaffList(results[0].data)` - uses res.data as array. Correct for paginatedResponse.

AdminOverview: `setKeyRequests(res.data?.data || res.data?.items || [])` - WRONG if data is array. Would always be empty.

Hmm unless older API returned nested. Current API:
```
return sendSuccess(res, {
  statusCode: 200,
  message: "API key requests fetched",
  data: paginatedResponse(data, total, page, limit),
});
```

Wait! It says `data: paginatedResponse(...)` NOT spread `...paginatedResponse(...)`!

Look at line 176-179:
```
return sendSuccess(res, {
  statusCode: 200,
  message: "API key requests fetched",
  data: paginatedResponse(data, total, page, limit),
});
```

So data = { data: [...], meta: {...} }
Response payload: { status, message, data: { data: [...], meta } }

Frontend: res.data?.data works! Good.

But getAllStaff uses spread:
```
...paginatedResponse(items, total, page, limit),
```
So data is array. Inconsistent but both work with frontend patterns.

For canRevealKey - still the select bug.

```javascript
ApiKeyRequest.find(filter)
  .select("-encryptedRawKey")  // field not loaded
...
canRevealKey: r.status === "approved" && !!r.encryptedRawKey && !r.bankKeyRevealedAt
```
r.encryptedRawKey is always undefined → canRevealKey always false → Reveal button never appears.

That's the smoking gun for issue 1.

For reveal endpoint itself - if they called GET /:id directly it would work. UI just never shows button.

Issue 2 revoke:
- deleteApiKey removes ApiKey only
- ApiKeyRequest stays approved, no isActive shown on bank side
- Bank admin list only shows request.status (pending/approved/rejected) not key health

Plan:
1. Fix canRevealKey (don't exclude encryptedRawKey before computing; exclude from response payload)
2. Enrich list with key status: populate apiKey keyPrefix/isActive or fetch separately; when approved but apiKey null → revoked; show badge Active/Suspended/Revoked
3. When deleteApiKey: find related ApiKeyRequests and... either leave dangling and detect null, or set a keyStatus field. Cleanest: on list, load ApiKey by ref; if missing → revoked; if isActive false → suspended; else active
4. Optionally update ApiKeyRequest when key is deleted/toggled for denormalized status - but join is enough for list freshness

Also when superadmin creates key directly (not via request), bank admin has no request - out of scope unless they need a "keys" view.

Answer "How will the api key be used by the bank admin?":
- Copy once from reveal modal
- Configure in their backend/kiosk as X-API-Key header on https://.../api/v1/*
- Dashboard continues using JWT login - key is for external system integration only
- Scopes limit which v1 routes work
- After revoke, X-API-Key requests get 401/403

Should I ask user anything? They asked for plan. I should present findings and plan.

Also check: does reveal button issue - when canRevealKey false but approved, should we still show "Reveal" if not yet revealed? We could show Reveal whenever status===approved && !revealedAt without needing encryptedRawKey - bankKeyRevealedAt alone is enough! If revealed, bankKeyRevealedAt set. If not revealed, button shows. encryptedRawKey check is only for whether ciphertext exists.

Even without loading encryptedRawKey: canRevealKey = status===approved && !bankKeyRevealedAt is almost correct - unless ciphertext missing (decrypt fail edge). Simplest fix: use !bankKeyRevealedAt only, OR load encryptedRawKey presence via select('encryptedRawKey') and strip before send.

I'll recommend: select encryptedRawKey for computation, don't include in JSON response; canRevealKey as before.

For revoke status - enrich response with key: { keyPrefix, isActive, revoked: !apiKeyDoc }.

Also PlatformDashboard revoke - delete permanently.

Should we add bank admin endpoint GET /api/admin/api-keys or keep on requests? User wants status on request list - enrich request list.

Optional: mark ApiKeyRequest.status or add field when key revoked - join is simpler.

Let me also verify the list select issue one more time and the exact response shape for frontend fix if needed.

Also check if loadKeyRequests only runs once on mount - user might need to refresh after superadmin approves. They'd reload overview when navigating. Manual refresh button could help but not the core issue.

I'll write the plan.

Checking the list response shape and whether revoke links back to requests.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js",
  "limit": 40,
  "offset": 145
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js</path>
<type>file</type>
<content>
145: 
146:     const { page, limit, skip } = parsePagination(req.query);
147:     const filter = { bankName };
148: 
149:     const [requests, total] = await Promise.all([
150:       ApiKeyRequest.find(filter)
151:         .select("-encryptedRawKey")
152:         .sort("-createdAt")
153:         .skip(skip)
154:         .limit(limit),
155:       ApiKeyRequest.countDocuments(filter),
156:     ]);
157: 
158:     // Surface whether a reveal is still available (approved but not yet shown).
159:     const data = requests.map((r) => ({
160:       id: r._id,
161:       bankName: r.bankName,
162:       label: r.label,
163:       scopes: r.scopes,
164:       rateLimit: r.rateLimit,
165:       status: r.status,
166:       reviewNote: r.reviewNote,
167:       apiKey: r.apiKey,
168:       canRevealKey:
169:         r.status === "approved" &&
170:         !!r.encryptedRawKey &&
171:         !r.bankKeyRevealedAt,
172:       revealedAt: r.bankKeyRevealedAt,
173:       createdAt: r.createdAt,
174:     }));
175: 
176:     return sendSuccess(res, {
177:       statusCode: 200,
178:       message: "API key requests fetched",
179:       data: paginatedResponse(data, total, page, limit),
180:     });
181:   } catch (error) {
182:     next(error);
183:   }
184: });

(Showing lines 145-184 of 273. Use offset=185 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/platform/platformKeyRequest.controller.js",
  "limit": 50,
  "offset": 115
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/platform/platformKeyRequest.controller.js</path>
<type>file</type>
<content>
115: 
116:     // Approve: create the actual ApiKey.
117:     const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();
118:     const finalScopes = scopes?.length ? scopes : request.scopes;
119:     const finalRateLimit = rateLimit || request.rateLimit;
120:     const finalLabel = label || request.label;
121: 
122:     const apiKey = await ApiKey.create({
123:       bankName: request.bankName,
124:       label: finalLabel,
125:       keyHash,
126:       keyPrefix,
127:       scopes: finalScopes,
128:       rateLimit: finalRateLimit,
129:       expiresAt: null,
130:     });
131: 
132:     // Stage encrypted raw key for the bank admin's one-time reveal.
133:     request.status = "approved";
134:     request.reviewedBy = req.user._id;
135:     request.reviewNote = reviewNote || "";
136:     request.apiKey = apiKey._id;
137:     request.scopes = finalScopes;
138:     request.rateLimit = finalRateLimit;
139:     request.label = finalLabel;
140:     request.encryptedRawKey = encryptKey(rawKey);
141:     request.rawKeyStagedAt = new Date();
142:     await request.save();
143: 
144:     return sendSuccess(res, {
145:       statusCode: 200,
146:       message:
147:         "Key request approved. Copy the raw key now — it won't be shown again to you.",
148:       data: {
149:         id: request._id,
150:         status: request.status,
151:         bankName: request.bankName,
152:         apiKey: {
153:           id: apiKey._id,
154:           keyPrefix: apiKey.keyPrefix,
155:           scopes: apiKey.scopes,
156:           rateLimit: apiKey.rateLimit,
157:         },
158:         // Raw key ONCE to superadmin.
159:         key: rawKey,
160:       },
161:     });
162:   } catch (error) {
163:     next(error);
164:   }

(Showing lines 115-164 of 165. Use offset=165 to continue.)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/BUILD_PLAN.md",
  "pattern": "canRevealKey|revok|key status|How the key"
}
```

**Output:**
```
Found 15 matches
/home/gamp/Desktop/cue/BUILD_PLAN.md:
  Line 489: | Key ownership | Superadmin only creates/revokes/suspends/rotates; bank admin only **requests** |

  Line 557:   - `GET /` (own bank's requests; exposes `canRevealKey`)

  Line 574: - [x] Dashboard tabs: **Overview** (keys, active keys, requests today/7d bars, pending count, top keys), **API Keys** (table + create/suspend/revoke/rotate, raw key modal once), **Key Requests** (pending, approve→show raw key once, reject with note)


/home/gamp/Desktop/cue/frontend/src/lib/apiClient.js:
  Line 56:     // good, expired, revoked, account gone. A login/register call never


/home/gamp/Desktop/cue/frontend/src/features/platform/platformApi.js:
  Line 36: /** DELETE /platform/api-keys/:id — revoke */

  Line 37: export const revokePlatformApiKey = (id, token) =>


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx:
  Line 367:             {r.canRevealKey && (


/home/gamp/Desktop/cue/frontend/src/pages/Platform/PlatformDashboard.jsx:
  Line 12:   revokePlatformApiKey,

  Line 27:  * - API Keys: table of all keys across banks + create / suspend / revoke / rotate

  Line 130:     if (!window.confirm("Permanently revoke this key? This cannot be undone."))

  Line 133:       await revokePlatformApiKey(id, token);


/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js:
  Line 168:       canRevealKey:


/home/gamp/Desktop/cue/backend/src/middlewares/apiKey.middleware.js:
  Line 40:         message: "Invalid or revoked API key",


/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js:
  Line 110:  * Permanently revoke (delete) a key.

  Line 123:       message: `API key for "${key.bankName}" has been permanently revoked`,

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/middlewares/apiKey.middleware.js",
  "limit": 80
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/middlewares/apiKey.middleware.js</path>
<type>file</type>
<content>
1: import ApiKey from "../models/apiKey.model.js";
2: import ApiKeyUsage from "../models/apiKeyUsage.model.js";
3: import { sendError } from "../utils/response.js";
4: import { usageDateKey } from "../utils/keyWrap.js";
5: 
6: /**
7:  * API Key Authentication Middleware
8:  *
9:  * Authenticates requests using the X-API-Key header.
10:  * On success, attaches `req.apiKey` (the ApiKey document) and `req.bankName`
11:  * to the request for downstream controllers to use.
12:  *
13:  * Usage:
14:  *   router.get("/endpoint", authenticateApiKey, requireScope("tickets:read"), handler)
15:  *
16:  * The key is looked up by hashing it with bcrypt and comparing against stored hashes.
17:  * This is intentionally slow (bcrypt) to prevent timing attacks.
18:  *
19:  * After authentication, we update `lastUsedAt` fire-and-forget (don't await).
20:  */
21: 
22: export const authenticateApiKey = async (req, res, next) => {
23:   try {
24:     const apiKey = req.headers["x-api-key"];
25: 
26:     if (!apiKey) {
27:       return sendError(res, {
28:         statusCode: 401,
29:         message: "API key required. Pass it via the X-API-Key header.",
30:       });
31:     }
32: 
33:     // Verify the key against all stored hashes.
34:     // Returns the matching ApiKey document or null.
35:     const keyDoc = await ApiKey.verifyKey(apiKey);
36: 
37:     if (!keyDoc) {
38:       return sendError(res, {
39:         statusCode: 401,
40:         message: "Invalid or revoked API key",
41:       });
42:     }
43: 
44:     // Check if the key has expired
45:     if (keyDoc.expiresAt && keyDoc.expiresAt < new Date()) {
46:       return sendError(res, {
47:         statusCode: 401,
48:         message: "API key has expired",
49:       });
50:     }
51: 
52:     // Check if the key is active (not disabled)
53:     if (!keyDoc.isActive) {
54:       return sendError(res, {
55:         statusCode: 403,
56:         message: "API key has been disabled. Contact support.",
57:       });
58:     }
59: 
60:     // Check if we're in the grace period (key was rotated, old key still valid temporarily)
61:     if (keyDoc.gracePeriodEndsAt && keyDoc.gracePeriodEndsAt < new Date()) {
62:       return sendError(res, {
63:         statusCode: 401,
64:         message: "API key has expired due to rotation. Use the new key.",
65:       });
66:     }
67: 
68:     // Attach key info to request for downstream use
69:     req.apiKey = keyDoc;
70:     req.bankName = keyDoc.bankName;
71: 
72:     // Update lastUsedAt + usage counters fire-and-forget (non-blocking).
73:     // We use updateOne instead of save to avoid triggering middleware.
74:     // Usage tracking:
75:     //   - ApiKey.requestCount  → lifetime total (cheap $inc)
76:     //   - ApiKeyUsage          → daily bucket {apiKey, date:"YYYY-MM-DD"} for charts
77:     const today = usageDateKey();
78:     ApiKey.updateOne(
79:       { _id: keyDoc._id },
80:       {

(Showing lines 1-80 of 216. Use offset=81 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/utils/keyWrap.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/utils/keyWrap.js</path>
<type>file</type>
<content>
1: import crypto from "crypto";
2: 
3: /**
4:  * Key wrap helper — AES-256-GCM encryption for staged raw API keys.
5:  *
6:  * When a superadmin approves a bank admin's key request, the raw key is
7:  * shown once to the superadmin AND staged encrypted on the ApiKeyRequest
8:  * document so the bank admin can reveal it once from their request status.
9:  * After the bank admin reveals it, the ciphertext is wiped permanently.
10:  *
11:  * The encryption key is derived from KEY_WRAP_SECRET (falls back to JWT_SECRET)
12:  * via SHA-256, so no extra key material is required in the environment for
13:  * basic setups.
14:  *
15:  * Ciphertext format (base64): iv || authTag || encryptedPayload
16:  */
17: 
18: const ALGO = "aes-256-gcm";
19: const IV_LENGTH = 12; // standard GCM nonce length
20: const TAG_LENGTH = 16;
21: 
22: function getSecret() {
23:   const secret = process.env.KEY_WRAP_SECRET || process.env.JWT_SECRET;
24:   if (!secret) {
25:     throw new Error(
26:       "KEY_WRAP_SECRET or JWT_SECRET must be set to encrypt staged API keys",
27:     );
28:   }
29:   return crypto.createHash("sha256").update(secret).digest();
30: }
31: 
32: /**
33:  * Encrypt a plaintext string (the raw API key).
34:  * Returns a single base64 string safe to store on the request document.
35:  */
36: export function encryptKey(plaintext) {
37:   const key = getSecret();
38:   const iv = crypto.randomBytes(IV_LENGTH);
39:   const cipher = crypto.createCipheriv(ALGO, key, iv);
40:   const encrypted = Buffer.concat([
41:     cipher.update(plaintext, "utf8"),
42:     cipher.final(),
43:   ]);
44:   const tag = cipher.getAuthTag();
45:   return Buffer.concat([iv, tag, encrypted]).toString("base64");
46: }
47: 
48: /**
49:  * Decrypt a ciphertext produced by encryptKey.
50:  * Throws if the payload was tampered with (GCM auth fails).
51:  */
52: export function decryptKey(ciphertextB64) {
53:   const key = getSecret();
54:   const raw = Buffer.from(ciphertextB64, "base64");
55:   if (raw.length <= IV_LENGTH + TAG_LENGTH) {
56:     throw new Error("Invalid ciphertext: too short");
57:   }
58:   const iv = raw.subarray(0, IV_LENGTH);
59:   const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
60:   const encrypted = raw.subarray(IV_LENGTH + TAG_LENGTH);
61:   const decipher = crypto.createDecipheriv(ALGO, key, iv);
62:   decipher.setAuthTag(tag);
63:   return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
64:     "utf8",
65:   );
66: }
67: 
68: /** Today's date as YYYY-MM-DD (UTC) — used for UsageLog daily buckets. */
69: export function usageDateKey(date = new Date()) {
70:   return date.toISOString().slice(0, 10);
71: }

(End of file - total 71 lines)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/backend/src/docs",
  "pattern": "X-API-Key|Authorization"
}
```

**Output:**
```
Found 1 matches
/home/gamp/Desktop/cue/backend/src/docs/openapi.yaml:
  Line 10:     `Authorization` header. Public endpoints (board, branch info, kiosk,

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/app.js",
  "limit": 50,
  "offset": 95
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/app.js</path>
<type>file</type>
<content>
95: app.use("/api/advanced-analytics", advancedAnalyticsRouter);
96: app.use("/api/brand", brandRouter);
97: 
98: // ── V1 API Routes (API-key authenticated) ──────────────────────
99: // These routes are the primary integration surface for banks.
100: // They use API key authentication via the X-API-Key header.
101: // The v1Router applies: authenticateApiKey → apiKeyRateLimit → bankScope
102: import { bankScope } from "./middlewares/bankScope.middleware.js";
103: import { resolveStaffUser } from "./middlewares/resolveStaffUser.js";
104: 
105: // ── Platform routes (superadmin JWT auth) ───────────────────────
106: // Superadmin-only console: API key lifecycle, usage monitoring,
107: // key-request approval. NOT under /api/v1 and NOT bank-scoped —
108: // the superadmin is a platform operator, not a bank tenant.
109: // Mounted BEFORE the v1 API-key pipeline so JWT auth is independent.
110: app.use("/api/platform", platformRouter);
111: 
112: // Demo helper routes removed (Phase 13 WP7) — dashboard is JWT-only.
113: 
114: // V1 public routes — guest ticket flow (no auth required)
115: import publicV1Router from "./routes/v1/public.routes.js";
116: app.use("/api/v1", publicV1Router);
117: 
118: // V1 authenticated routes — all require API key auth + rate limiting
119: // The bankScope middleware inside v1Router handles tenant isolation.
120: // tenantMatch: if a bank admin JWT and an API key are both present,
121: // admin.bank must equal key.bankName (403 otherwise).
122: app.use(
123:   "/api/v1",
124:   authenticateApiKey,
125:   resolveStaffUser,
126:   tenantMatch,
127:   apiKeyRateLimit,
128:   v1Router,
129: );
130: 
131: // Swagger API docs
132: app.get("/api/docs/openapi.json", (req, res) => {
133:   res.setHeader("Content-Type", "application/json");
134:   res.send(JSON.stringify(openapiSpec, null, 2));
135: });
136: app.use(
137:   "/api/docs",
138:   swaggerUi.serve,
139:   swaggerUi.setup(openapiSpec, {
140:     customCss: ".swagger-ui .topbar { display: none }",
141:     customSiteTitle: "Queue Management API Documentation",
142:   }),
143: );
144: 

(Showing lines 95-144 of 149. Use offset=145 to continue.)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/backend/src",
  "pattern": "deleteApiKey|toggleApiKey|ApiKey\\.delete|findByIdAndDelete"
}
```

**Output:**
```
Found 8 matches
/home/gamp/Desktop/cue/backend/src/routes/platform/apiKey.routes.js:
  Line 5:   deleteApiKey,

  Line 7:   toggleApiKey,

  Line 28: router.delete("/:id", validateDeleteApiKey, deleteApiKey);

  Line 30: router.patch("/:id/toggle", validateDeleteApiKey, toggleApiKey);


/home/gamp/Desktop/cue/backend/src/controllers/webhook.controller.js:
  Line 68:     const webhook = await Webhook.findByIdAndDelete(req.params.id);


/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js:
  Line 112: export const deleteApiKey = async (req, res, next) => {

  Line 116:     const key = await ApiKey.findByIdAndDelete(req.params.id);

  Line 176: export const toggleApiKey = async (req, res, next) => {

```

---

## Assistant (Plan · MiMo-V2.6-Flash Free · 49.5s)

_Thinking:_

I have a clear picture of both bugs. Let me write a comprehensive plan.

## Bug 1: Reveal button never shows

In `adminApiKeyRequest.routes.js` list endpoint:
```javascript
ApiKeyRequest.find(filter)
  .select("-encryptedRawKey")  // EXCLUDES the field
...
canRevealKey:
  r.status === "approved" &&
  !!r.encryptedRawKey &&  // ALWAYS falsy - field not selected!
  !r.bankKeyRevealedAt,
```

So `canRevealKey` is always `false` → AdminOverview never renders "Reveal key" button → bank admin never sees the key.

Fix: Don't exclude encryptedRawKey before computing canRevealKey. Either:
- Remove `.select("-encryptedRawKey")` and don't include ciphertext in the mapped response (already doesn't)
- Or compute canRevealKey without needing the full ciphertext - e.g. select encryptedRawKey only for existence check- Or use `$exists` via aggregation / project canRevealKey server-side

Simplest: drop the select exclusion (ciphertext is never put in the JSON response anyway - only canRevealKey boolean), OR use a projection that includes a flag.

Actually if we remove select("-encryptedRawKey"), the field is loaded into memory but not returned in the mapped object. That's fine - ciphertext never leaks to client.

Alternatively: `canRevealKey = status === "approved" && !bankKeyRevealedAt` without checking encryptedRawKey - but then if ciphertext was somehow missing, reveal would fail with "already revealed". Better keep the encryptedRawKey check but load it.

Also note: if superadmin already revealed to themselves, bank reveal still works because encryptedRawKey is staged separately.

## Bug 2: Revoke status not reflected for bank admin

When superadmin revokes:
1. `deleteApiKey` does `ApiKey.findByIdAndDelete` - key is GONE from DB
2. ApiKeyRequest still has `status: "approved"` and `apiKey: <deleted id>`
3. Bank admin list only shows request.status (pending/approved/rejected) - never shows key health
4. No join to ApiKey.isActive, no "revoked" state

Also suspend (toggle) only sets ApiKey.isActive=false - request still shows "approved" with no key status.

Fix options:
A. Bank admin list joins ApiKey via populate and returns keyStatus: active | suspended | revoked (key missing) | neverB. On revoke/suspend, denormalize status onto ApiKeyRequest
C. Both - populate is fresher for suspend; for delete, populate returns null → "revoked"

Best approach for bank admin UX:
- Enrich GET list with `keyStatus` from linked ApiKey:
  - no apiKey / apiKey missing from DB → "revoked"
  - isActive false → "suspended"  
  - isActive true → "active"
  - not approved yet → null- Frontend shows badge next to approved requests
- canRevealKey fix is independent

For revoke: also could null out or leave apiKey ref - populate of missing doc gives null.

When deleteApiKey: could find ApiKeyRequest with that apiKey and clear encryptedRawKey / leave status approved with revoked key - or set a field. Simplest: leave request as approved, bank admin sees "approved · key revoked".

Also: should bank admin see keyPrefix? Yes for identification - populate keyPrefix.

## How is the API key used?

By the bank's **external systems** (core banking backend, kiosk software, etc.), NOT by the Cue dashboard UI:

1. Admin requests key → superadmin approves → admin reveals once → copies `cue_...`
2. Configure in their system as header: `X-API-Key: cue_...`
3. Call bank-scoped integration API: `https://host/api/v1/...`
   - e.g. create tickets, read boards, analytics4. Dashboard still uses JWT login - key never used there
5. Scopes limit which v1 endpoints work (requireScope)
6. Rate limit per key
7. When revoked/deleted: authenticateApiKey returns 401 "Invalid or revoked API key"

## Plan structure

1. Explain root causes
2. Fix canRevealKey (backend list)
3. Enrich request status with key health (backend + frontend badge)
4. Optional: on revoke, clear staged ciphertext
5. Tests
6. Answer usage question

I'll present this as a plan for approval since plan mode is active.

## Root causes

### 1. Reveal never appears (bank admin can’t copy the key)

Intended flow already exists: superadmin approve → AES-staged ciphertext on `ApiKeyRequest` → bank admin **Reveal key** → one-time decrypt.

**Bug:** list endpoint excludes `encryptedRawKey` **before** computing `canRevealKey`:

```150:171:backend/src/routes/adminApiKeyRequest.routes.js
      ApiKeyRequest.find(filter)
        .select("-encryptedRawKey")   // field never loaded
        ...
      canRevealKey:
        r.status === "approved" &&
        !!r.encryptedRawKey &&        // always false
        !r.bankKeyRevealedAt,
```

UI only shows the button when `r.canRevealKey` (`AdminOverview.jsx:367`) → always hidden.

Reveal **GET /:id** itself is fine if called; the list flag is wrong.

### 2. Revoke/suspend never surfaces to the bank admin

- Superadmin **Revoke** = `ApiKey.findByIdAndDelete` (`platformApiKey.controller.js:116`) — key gone; `ApiKeyRequest` stays `status: "approved"`.
- **Suspend** only flips `ApiKey.isActive`.
- Bank admin list only returns request `pending|approved|rejected` — no join to the live key.

So the dashboard never shows active / suspended / revoked.

---

## Plan

**Backend — fix reveal flag**
- In `GET /api/admin/api-key-requests`, either drop `.select("-encryptedRawKey")` (ciphertext already omitted from JSON) or compute `canRevealKey` with a projection that includes existence only.
- Keep `canRevealKey = approved && encryptedRawKey present && !bankKeyRevealedAt`.

**Backend — key health on the list**
- For approved requests, resolve linked `ApiKey` (populate or `find`):
  - missing / deleted → `keyStatus: "revoked"`
  - `isActive: false` → `"suspended"`
  - else → `"active"`
  - not approved → `null`
- Include `keyPrefix` for identification.
- On revoke (`deleteApiKey`), clear staged `encryptedRawKey` so a missed reveal can’t return a dead key.
- Same `keyStatus` on single GET if useful.

**Frontend — `AdminOverview`**
- Show Reveal button once `canRevealKey` is correct (no UI change beyond that).
- Badge next to approved: **Active / Suspended / Revoked** (+ `ends in …`).
- Short note: key is for external systems via `X-API-Key`, not the dashboard.

**Tests**
- List: approved + ciphertext → `canRevealKey: true`; after reveal → false.
- List: key deleted → `keyStatus: "revoked"`; suspended → `"suspended"`.

---

## How the bank admin uses the key

The **Cue dashboard always uses JWT** (email/password). The key is only for the bank’s **own systems**:

1. Copy `cue_…` once from the reveal modal.
2. Send it on every integration call:  
   `X-API-Key: cue_…` → `https://…/api/v1/…`  
   (create tickets, boards, analytics, webhooks — gated by scopes + rate limit).
3. Revoke → middleware returns **401** `Invalid or revoked API key`; suspend → **403** disabled.

---

**Want me to implement this plan?** (reveal fix + `keyStatus` badges + revoke cleanup + tests)

---

## User

implement the fixes.

---

## Assistant (Build · MiMo-V2.6-Flash Free · 63.5s)

_Thinking:_

The user wants me to implement the fixes for:
1. canRevealKey bug in the list endpoint
2. keyStatus on the bank admin list (and maybe single GET)
3. Clear encryptedRawKey on revoke
4. Frontend badges for Active/Suspended/Revoked
5. Tests

Let me implement these.

Implementing reveal-flag fix, key-status on the bank-admin list, revoke cleanup, UI badges, and tests.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js</path>
<type>file</type>
<content>
1: import { Router } from "express";
2: import { body, param, validationResult } from "express-validator";
3: import ApiKeyRequest from "../models/apiKeyRequest.model.js";
4: import { sendSuccess, sendError } from "../utils/response.js";
5: import { parsePagination, paginatedResponse } from "../utils/pagination.js";
6: import { decryptKey } from "../utils/keyWrap.js";
7: import { protect, authorize } from "../middlewares/auth.middleware.js";
8: 
9: /**
10:  * Bank-admin API key request routes — JWT-authenticated (Phase 13 WP4).
11:  *
12:  * Same behavior as the v1 API-key version, but identity comes from the
13:  * admin's JWT (`req.user`) instead of the API key header. This is the
14:  * path the dashboard will use once WP6 moves it off v1.
15:  *
16:  * bankName is ALWAYS forced from Admin.bank (never from the body).
17:  *
18:  * One-time reveal:
19:  *   GET /api/admin/api-key-requests/:id
20:  *   If status=approved and bankKeyRevealedAt is null, returns the raw key
21:  *   (decrypted from the staged ciphertext), wipes ciphertext, and sets
22:  *   bankKeyRevealedAt. Subsequent GETs return metadata only (no raw key).
23:  */
24: const router = Router();
25: 
26: const BANK_REQUESTABLE_SCOPES = [
27:   "branches:read",
28:   "tickets:read",
29:   "tickets:write",
30:   "staff:read",
31:   "analytics:read",
32:   "webhooks:manage",
33:   // "admin" is reserved for superadmin-created keys only.
34: ];
35: 
36: // Only bank admins may request keys for their bank.
37: router.use(protect, authorize("admin"));
38: 
39: /**
40:  * POST /api/admin/api-key-requests
41:  * Body: { label?, scopes?, rateLimit? }
42:  */
43: router.post(
44:   "/",
45:   body("label")
46:     .optional()
47:     .trim()
48:     .isLength({ max: 200 })
49:     .withMessage("Label must be under 200 characters"),
50:   body("scopes")
51:     .optional()
52:     .isArray({ min: 1 })
53:     .withMessage("Scopes must be a non-empty array")
54:     .custom((scopes) => {
55:       const invalid = scopes.filter((s) => !BANK_REQUESTABLE_SCOPES.includes(s));
56:       if (invalid.length > 0) {
57:         throw new Error(
58:           `Scope(s) not requestable by bank admin: ${invalid.join(", ")}`,
59:         );
60:       }
61:       return true;
62:     }),
63:   body("rateLimit")
64:     .optional()
65:     .isInt({ min: 1, max: 10000 })
66:     .withMessage("Rate limit must be between 1 and 10,000"),
67:   async (req, res, next) => {
68:     try {
69:       const errors = validationResult(req);
70:       if (!errors.isEmpty()) {
71:         return sendError(res, {
72:           statusCode: 400,
73:           message: "Validation failed",
74:           errors: errors.array().map((e) => e.msg),
75:         });
76:       }
77: 
78:       // Bank scope always comes from the JWT identity (Admin.bank).
79:       const bankName = req.user.bank;
80:       if (!bankName) {
81:         return sendError(res, {
82:           statusCode: 400,
83:           message: "Admin has no bank — cannot request API keys",
84:         });
85:       }
86: 
87:       // Prevent duplicate pending requests for the same bank.
88:       const existingPending = await ApiKeyRequest.findOne({
89:         bankName,
90:         status: "pending",
91:       });
92:       if (existingPending) {
93:         return sendError(res, {
94:           statusCode: 409,
95:           message: "You already have a pending API key request",
96:         });
97:       }
98: 
99:       const { label, scopes, rateLimit } = req.body;
100: 
101:       const request = await ApiKeyRequest.create({
102:         bankName,
103:         // Admin collection ref (WP1 changed requestedBy → Admin).
104:         requestedBy: req.user._id,
105:         label: label || "",
106:         scopes: scopes?.length
107:           ? scopes
108:           : ["branches:read", "tickets:read", "tickets:write"],
109:         rateLimit: rateLimit || 100,
110:         status: "pending",
111:       });
112: 
113:       return sendSuccess(res, {
114:         statusCode: 201,
115:         message: "API key request submitted for superadmin review",
116:         data: {
117:           id: request._id,
118:           bankName: request.bankName,
119:           label: request.label,
120:           scopes: request.scopes,
121:           rateLimit: request.rateLimit,
122:           status: request.status,
123:           createdAt: request.createdAt,
124:         },
125:       });
126:     } catch (error) {
127:       next(error);
128:     }
129:   },
130: );
131: 
132: /**
133:  * GET /api/admin/api-key-requests
134:  * List this admin's bank requests (metadata only; ciphertext never included).
135:  */
136: router.get("/", async (req, res, next) => {
137:   try {
138:     const bankName = req.user.bank;
139:     if (!bankName) {
140:       return sendError(res, {
141:         statusCode: 400,
142:         message: "Admin has no bank — cannot list API key requests",
143:       });
144:     }
145: 
146:     const { page, limit, skip } = parsePagination(req.query);
147:     const filter = { bankName };
148: 
149:     const [requests, total] = await Promise.all([
150:       ApiKeyRequest.find(filter)
151:         .select("-encryptedRawKey")
152:         .sort("-createdAt")
153:         .skip(skip)
154:         .limit(limit),
155:       ApiKeyRequest.countDocuments(filter),
156:     ]);
157: 
158:     // Surface whether a reveal is still available (approved but not yet shown).
159:     const data = requests.map((r) => ({
160:       id: r._id,
161:       bankName: r.bankName,
162:       label: r.label,
163:       scopes: r.scopes,
164:       rateLimit: r.rateLimit,
165:       status: r.status,
166:       reviewNote: r.reviewNote,
167:       apiKey: r.apiKey,
168:       canRevealKey:
169:         r.status === "approved" &&
170:         !!r.encryptedRawKey &&
171:         !r.bankKeyRevealedAt,
172:       revealedAt: r.bankKeyRevealedAt,
173:       createdAt: r.createdAt,
174:     }));
175: 
176:     return sendSuccess(res, {
177:       statusCode: 200,
178:       message: "API key requests fetched",
179:       data: paginatedResponse(data, total, page, limit),
180:     });
181:   } catch (error) {
182:     next(error);
183:   }
184: });
185: 
186: /**
187:  * GET /api/admin/api-key-requests/:id
188:  * One-time raw-key reveal for an approved request (bank-scoped by JWT).
189:  */
190: router.get(
191:   "/:id",
192:   param("id").isMongoId().withMessage("Invalid request ID"),
193:   async (req, res, next) => {
194:     try {
195:       const errors = validationResult(req);
196:       if (!errors.isEmpty()) {
197:         return sendError(res, {
198:           statusCode: 400,
199:           message: "Validation failed",
200:           errors: errors.array().map((e) => e.msg),
201:         });
202:       }
203: 
204:       const bankName = req.user.bank;
205:       if (!bankName) {
206:         return sendError(res, {
207:           statusCode: 400,
208:           message: "Admin has no bank — cannot fetch API key requests",
209:         });
210:       }
211: 
212:       // Always scope the lookup to this bank — never leak another bank's request.
213:       const request = await ApiKeyRequest.findOne({
214:         _id: req.params.id,
215:         bankName,
216:       }).select("-encryptedRawKey");
217: 
218:       if (!request) {
219:         return sendError(res, { statusCode: 404, message: "Request not found" });
220:       }
221: 
222:       let rawKey = null;
223:       let justRevealed = false;
224: 
225:       if (request.status === "approved" && !request.bankKeyRevealedAt) {
226:         const full = await ApiKeyRequest.findById(request._id).select(
227:           "encryptedRawKey",
228:         );
229:         if (full?.encryptedRawKey) {
230:           try {
231:             rawKey = decryptKey(full.encryptedRawKey);
232:             // Wipe ciphertext permanently after successful decrypt.
233:             await ApiKeyRequest.updateOne(
234:               { _id: request._id },
235:               {
236:                 $set: { bankKeyRevealedAt: new Date() },
237:                 $unset: { encryptedRawKey: 1 },
238:               },
239:             );
240:             justRevealed = true;
241:           } catch {
242:             // Decryption failed (wrong secret / corruption) — don't leak internals.
243:             rawKey = null;
244:           }
245:         }
246:       }
247: 
248:       return sendSuccess(res, {
249:         statusCode: 200,
250:         message: justRevealed
251:           ? "API key revealed — copy it now, it won't be shown again"
252:           : "API key request fetched",
253:         data: {
254:           id: request._id,
255:           bankName: request.bankName,
256:           label: request.label,
257:           scopes: request.scopes,
258:           rateLimit: request.rateLimit,
259:           status: request.status,
260:           reviewNote: request.reviewNote,
261:           apiKey: request.apiKey,
262:           revealedAt: request.bankKeyRevealedAt,
263:           // Raw key only on the one-time reveal; null afterwards.
264:           key: rawKey,
265:         },
266:       });
267:     } catch (error) {
268:       next(error);
269:     }
270:   },
271: );
272: 
273: export default router;

(End of file - total 273 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js</path>
<type>file</type>
<content>
1: import ApiKey from "../../models/apiKey.model.js";
2: import { sendSuccess, sendError } from "../../utils/response.js";
3: import { parsePagination, paginatedResponse } from "../../utils/pagination.js";
4: import { validationResult } from "express-validator";
5: 
6: /**
7:  * Platform API key controller — superadmin-only key lifecycle.
8:  *
9:  * Replaces the old /api/v1/api-keys routes (authorize("admin")) which
10:  * let ANY bank admin see ALL banks' keys — a multi-tenancy hole.
11:  *
12:  * The raw API key is only returned ONCE — at creation or rotation.
13:  * Bank admins never call these endpoints; they submit ApiKeyRequests on
14:  * JWT /api/admin/api-key-requests instead.
15:  */
16: 
17: const handleValidation = (req, res) => {
18:   const errors = validationResult(req);
19:   if (!errors.isEmpty()) {
20:     sendError(res, {
21:       statusCode: 400,
22:       message: "Validation failed",
23:       errors: errors.array().map((e) => e.msg),
24:     });
25:     return false;
26:   }
27:   return true;
28: };
29: 
30: /**
31:  * POST /api/platform/api-keys
32:  * Create a key for a bank. Returns raw key ONCE.
33:  */
34: export const createApiKey = async (req, res, next) => {
35:   try {
36:     if (!handleValidation(req, res)) return;
37: 
38:     const { bankName, label, scopes, rateLimit, expiresAt } = req.body;
39:     const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();
40: 
41:     const apiKey = await ApiKey.create({
42:       bankName,
43:       label: label || "",
44:       keyHash,
45:       keyPrefix,
46:       scopes: scopes || ["branches:read", "tickets:read"],
47:       rateLimit: rateLimit || 100,
48:       expiresAt: expiresAt || null,
49:     });
50: 
51:     return sendSuccess(res, {
52:       statusCode: 201,
53:       message: "API key created. Copy it now — it won't be shown again.",
54:       data: {
55:         id: apiKey._id,
56:         bankName: apiKey.bankName,
57:         label: apiKey.label,
58:         key: rawKey,
59:         keyPrefix: apiKey.keyPrefix,
60:         scopes: apiKey.scopes,
61:         rateLimit: apiKey.rateLimit,
62:         isActive: apiKey.isActive,
63:         requestCount: apiKey.requestCount || 0,
64:         expiresAt: apiKey.expiresAt,
65:         createdAt: apiKey.createdAt,
66:       },
67:     });
68:   } catch (error) {
69:     next(error);
70:   }
71: };
72: 
73: /**
74:  * GET /api/platform/api-keys
75:  * List all keys across banks (metadata only, no hash/raw key).
76:  */
77: export const listApiKeys = async (req, res, next) => {
78:   try {
79:     const { page, limit, skip } = parsePagination(req.query);
80: 
81:     const filter = {};
82:     if (req.query.bankName) {
83:       filter.bankName = { $regex: req.query.bankName, $options: "i" };
84:     }
85:     if (req.query.isActive !== undefined) {
86:       filter.isActive = req.query.isActive === "true";
87:     }
88: 
89:     const [keys, total] = await Promise.all([
90:       ApiKey.find(filter)
91:         .select("-keyHash")
92:         .sort("-createdAt")
93:         .skip(skip)
94:         .limit(limit),
95:       ApiKey.countDocuments(filter),
96:     ]);
97: 
98:     return sendSuccess(res, {
99:       statusCode: 200,
100:       message: "API keys fetched",
101:       data: paginatedResponse(keys, total, page, limit),
102:     });
103:   } catch (error) {
104:     next(error);
105:   }
106: };
107: 
108: /**
109:  * DELETE /api/platform/api-keys/:id
110:  * Permanently revoke (delete) a key.
111:  */
112: export const deleteApiKey = async (req, res, next) => {
113:   try {
114:     if (!handleValidation(req, res)) return;
115: 
116:     const key = await ApiKey.findByIdAndDelete(req.params.id);
117:     if (!key) {
118:       return sendError(res, { statusCode: 404, message: "API key not found" });
119:     }
120: 
121:     return sendSuccess(res, {
122:       statusCode: 200,
123:       message: `API key for "${key.bankName}" has been permanently revoked`,
124:     });
125:   } catch (error) {
126:     next(error);
127:   }
128: };
129: 
130: /**
131:  * POST /api/platform/api-keys/:id/rotate
132:  * Rotate a key: new key generated, old key valid for 24h grace period.
133:  * Raw key returned ONCE to superadmin only (bank admin does NOT get a
134:  * rotation reveal — approval-time reveal only).
135:  */
136: export const rotateApiKey = async (req, res, next) => {
137:   try {
138:     if (!handleValidation(req, res)) return;
139: 
140:     const oldKey = await ApiKey.findById(req.params.id);
141:     if (!oldKey) {
142:       return sendError(res, { statusCode: 404, message: "API key not found" });
143:     }
144: 
145:     const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();
146: 
147:     oldKey.keyHash = keyHash;
148:     oldKey.keyPrefix = keyPrefix;
149:     oldKey.gracePeriodEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
150:     await oldKey.save();
151: 
152:     return sendSuccess(res, {
153:       statusCode: 200,
154:       message:
155:         "API key rotated. New key shown below. Old key valid for 24 hours.",
156:       data: {
157:         id: oldKey._id,
158:         bankName: oldKey.bankName,
159:         label: oldKey.label,
160:         key: rawKey,
161:         keyPrefix: oldKey.keyPrefix,
162:         oldKeyValidUntil: oldKey.gracePeriodEndsAt,
163:         scopes: oldKey.scopes,
164:         rateLimit: oldKey.rateLimit,
165:       },
166:     });
167:   } catch (error) {
168:     next(error);
169:   }
170: };
171: 
172: /**
173:  * PATCH /api/platform/api-keys/:id/toggle
174:  * Suspend (disable) or re-enable a key without deleting it.
175:  */
176: export const toggleApiKey = async (req, res, next) => {
177:   try {
178:     if (!handleValidation(req, res)) return;
179: 
180:     const key = await ApiKey.findByIdAndUpdate(
181:       req.params.id,
182:       [{ $set: { isActive: { $not: "$isActive" } } }],
183:       { returnDocument: "after" },
184:     ).select("-keyHash");
185: 
186:     if (!key) {
187:       return sendError(res, { statusCode: 404, message: "API key not found" });
188:     }
189: 
190:     return sendSuccess(res, {
191:       statusCode: 200,
192:       message: `API key ${key.isActive ? "enabled" : "suspended"}`,
193:       data: key,
194:     });
195:   } catch (error) {
196:     next(error);
197:   }
198: };

(End of file - total 198 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx</path>
<type>file</type>
<content>
1: import { useCallback, useEffect, useState } from "react";
2: import { motion } from "framer-motion";
3: import { useAuth } from "../../features/auth/AuthContext";
4: import {
5:   fetchAdminOverview,
6:   createBranch,
7: } from "../../features/staff/adminApi";
8: import {
9:   requestApiKey,
10:   fetchApiKeyRequests,
11:   revealApiKeyRequest,
12: } from "../../features/staff/apiKeyRequestApi";
13: import { ApiError } from "../../lib/apiClient";
14: import styles from "./StaffHome.module.css";
15: 
16: // Scopes a bank admin may request (admin scope is superadmin-only).
17: const REQUESTABLE_SCOPES = [
18:   "branches:read",
19:   "tickets:read",
20:   "tickets:write",
21:   "staff:read",
22:   "analytics:read",
23:   "webhooks:manage",
24: ];
25: 
26: /**
27:  * AdminOverview — cross-branch dashboard for bank-scoped admin role.
28:  * Shows all branches (this bank only), all managers with staff counts,
29:  * a form to create branches, and the API key request panel
30:  * (request new key + view status / one-time reveal).
31:  *
32:  * Manager creation lives on Manage → Managers (POST /managers).
33:  */
34: const AdminOverview = () => {
35:   const { auth } = useAuth();
36:   const [data, setData] = useState(null);
37:   const [loading, setLoading] = useState(true);
38:   const [error, setError] = useState(null);
39: 
40:   // Branch creation form
41:   const [branchForm, setBranchForm] = useState({ name: "", location: "" });
42:   const [branchFormError, setBranchFormError] = useState(null);
43:   const [branchSubmitting, setBranchSubmitting] = useState(false);
44: 
45:   // API key request state
46:   const [keyRequests, setKeyRequests] = useState([]);
47:   const [keyForm, setKeyForm] = useState({
48:     label: "",
49:     rateLimit: 100,
50:     scopes: ["branches:read", "tickets:read", "tickets:write"],
51:   });
52:   const [keyFormError, setKeyFormError] = useState(null);
53:   const [keySubmitting, setKeySubmitting] = useState(false);
54:   const [adminRevealKey, setAdminRevealKey] = useState(null); // one-time raw key display
55: 
56:   const load = useCallback(async () => {
57:     try {
58:       // JWT admin overview — bank scope from Admin.bank server-side (WP6).
59:       const res = await fetchAdminOverview(auth.token);
60:       setData(res.data);
61:       setError(null);
62:     } catch (err) {
63:       setError(err.message || "Couldn't load admin overview.");
64:     } finally {
65:       setLoading(false);
66:     }
67:   }, [auth.token]);
68: 
69:   const loadKeyRequests = useCallback(async () => {
70:     try {
71:       const res = await fetchApiKeyRequests(auth.token);
72:       // paginatedResponse nests under data: { data: [...], meta }
73:       setKeyRequests(res.data?.data || res.data?.items || []);
74:     } catch {
75:       // Non-fatal — request panel just stays empty.
76:       setKeyRequests([]);
77:     }
78:   }, [auth.token]);
79: 
80:   useEffect(() => {
81:     load();
82:     loadKeyRequests();
83:   }, [load, loadKeyRequests]);
84: 
85:   const handleBranchChange = (field) => (e) =>
86:     setBranchForm((f) => ({ ...f, [field]: e.target.value }));
87: 
88:   const handleCreateBranch = async (e) => {
89:     e.preventDefault();
90:     setBranchFormError(null);
91:     setBranchSubmitting(true);
92:     try {
93:       await createBranch(branchForm, auth.token);
94:       setBranchForm({ name: "", location: "" });
95:       await load();
96:     } catch (err) {
97:       setBranchFormError(
98:         err instanceof ApiError ? err.message : "Couldn't create branch.",
99:       );
100:     } finally {
101:       setBranchSubmitting(false);
102:     }
103:   };
104: 
105:   // ── API key request handlers ──────────────────────────────
106:   const toggleScope = (scope) =>
107:     setKeyForm((f) => ({
108:       ...f,
109:       scopes: f.scopes.includes(scope)
110:         ? f.scopes.filter((s) => s !== scope)
111:         : [...f.scopes, scope],
112:     }));
113: 
114:   const handleRequestKey = async (e) => {
115:     e.preventDefault();
116:     setKeyFormError(null);
117:     if (keyForm.scopes.length === 0) {
118:       setKeyFormError("Select at least one scope.");
119:       return;
120:     }
121:     setKeySubmitting(true);
122:     try {
123:       await requestApiKey(keyForm, auth.token);
124:       setKeyForm({
125:         label: "",
126:         rateLimit: 100,
127:         scopes: ["branches:read", "tickets:read", "tickets:write"],
128:       });
129:       await loadKeyRequests();
130:     } catch (err) {
131:       setKeyFormError(
132:         err instanceof ApiError
133:           ? err.errors?.join(", ") || err.message
134:           : "Couldn't submit request.",
135:       );
136:     } finally {
137:       setKeySubmitting(false);
138:     }
139:   };
140: 
141:   const handleRevealKey = async (id) => {
142:     try {
143:       const res = await revealApiKeyRequest(id, auth.token);
144:       if (res.data?.key) {
145:         setAdminRevealKey({ id, key: res.data.key });
146:       } else {
147:         setKeyFormError("Key already revealed previously.");
148:       }
149:       await loadKeyRequests();
150:     } catch (err) {
151:       setKeyFormError(err.message || "Couldn't reveal key.");
152:     }
153:   };
154: 
155:   if (loading) return <p className={styles.mgmtStatus}>Loading overview…</p>;
156:   if (error) return <p className={styles.mgmtStatusError}>{error}</p>;
157:   if (!data) return null;
158: 
159:   return (
160:     <motion.div
161:       initial={{ opacity: 0, y: 12 }}
162:       animate={{ opacity: 1, y: 0 }}
163:       transition={{ duration: 0.4 }}
164:     >
165:       {/* ── Summary Cards ─────────────────────────── */}
166:       <div className={styles.ovStatRow}>
167:         <div className={styles.ovStatCard}>
168:           <span className={styles.ovStatValue}>{data.summary.totalBranches}</span>
169:           <span className={styles.ovStatLabel}>branches</span>
170:         </div>
171:         <div className={styles.ovStatCard}>
172:           <span className={styles.ovStatValue}>{data.summary.totalManagers}</span>
173:           <span className={styles.ovStatLabel}>managers</span>
174:         </div>
175:         <div className={styles.ovStatCard}>
176:           <span className={styles.ovStatValue}>{data.summary.totalStaff}</span>
177:           <span className={styles.ovStatLabel}>total staff</span>
178:         </div>
179:       </div>
180: 
181:       {/* ── Branches List ─────────────────────────── */}
182:       <div className={styles.mgmtSubHeading}>Branches</div>
183:       {data.branches.length === 0 && (
184:         <p className={styles.mgmtStatus}>No branches yet.</p>
185:       )}
186:       {data.branches.map((b) => (
187:         <div key={b.id} className={styles.mgmtRow}>
188:           <div>
189:             <div className={styles.mgmtRowTitle}>{b.name}</div>
190:             <div className={styles.mgmtRowSub}>{b.location || "No location"}</div>
191:           </div>
192:           <div className={styles.mgmtRowActions}>
193:             <span
194:               className={b.dayOpen ? styles.mgmtBadgeOpen : styles.mgmtBadgeClosed}
195:             >
196:               {b.dayOpen ? "Open" : "Closed"}
197:             </span>
198:           </div>
199:         </div>
200:       ))}
201: 
202:       {/* ── Create Branch Form ─────────────────────── */}
203:       <div className={styles.mgmtSubHeading}>Add branch</div>
204:       <form onSubmit={handleCreateBranch} className={styles.mgmtInlineForm}>
205:         <input
206:           required
207:           placeholder="Branch name"
208:           value={branchForm.name}
209:           onChange={handleBranchChange("name")}
210:         />
211:         <input
212:           placeholder="Location"
213:           value={branchForm.location}
214:           onChange={handleBranchChange("location")}
215:         />
216:         {branchFormError && (
217:           <p className={styles.mgmtStatusError}>{branchFormError}</p>
218:         )}
219:         <button
220:           type="submit"
221:           className={styles.mgmtSubmitBtn}
222:           disabled={branchSubmitting}
223:         >
224:           {branchSubmitting ? "Adding…" : "Add branch"}
225:         </button>
226:       </form>
227: 
228:       {/* ── Managers List ──────────────────────────── */}
229:       <div className={styles.mgmtSubHeading}>Managers</div>
230:       {data.managers.length === 0 && (
231:         <p className={styles.mgmtStatus}>
232:           No managers yet. Create one under Manage → Managers.
233:         </p>
234:       )}
235:       {data.managers.map((m) => (
236:         <div key={m.id} className={styles.mgmtRow}>
237:           <div>
238:             <div className={styles.mgmtRowTitle}>{m.name}</div>
239:             <div className={styles.mgmtRowSub}>
240:               {m.email}
241:               {m.branch && <> · {m.branch.name}</>}
242:             </div>
243:           </div>
244:           <div className={styles.mgmtRowActions}>
245:             <span className={styles.ovStaffCount}>
246:               {m.staffCount} staff
247:             </span>
248:           </div>
249:         </div>
250:       ))}
251: 
252:       {/* ── API Key Request Panel ─────────────────────── */}
253:       <div className={styles.mgmtSubHeading}>API key access</div>
254:       <p className={styles.mgmtStatus}>
255:         Request an API key for your bank. The superadmin reviews it on the
256:         platform console — once approved you can reveal the key once here.
257:       </p>
258: 
259:       <form onSubmit={handleRequestKey} className={styles.mgmtInlineForm}>
260:         <input
261:           placeholder="Label (e.g. Core banking backend)"
262:           value={keyForm.label}
263:           onChange={(e) =>
264:             setKeyForm((f) => ({ ...f, label: e.target.value }))
265:           }
266:         />
267:         <input
268:           type="number"
269:           min={1}
270:           max={10000}
271:           title="Rate limit (requests/min)"
272:           placeholder="Rate limit"
273:           value={keyForm.rateLimit}
274:           onChange={(e) =>
275:             setKeyForm((f) => ({
276:               ...f,
277:               rateLimit: parseInt(e.target.value, 10) || 100,
278:             }))
279:           }
280:           style={{ maxWidth: 140 }}
281:         />
282:         <div className={styles.scopeChips}>
283:           {REQUESTABLE_SCOPES.map((scope) => (
284:             <button
285:               type="button"
286:               key={scope}
287:               className={
288:                 keyForm.scopes.includes(scope)
289:                   ? styles.scopeChipActive
290:                   : styles.scopeChip
291:               }
292:               onClick={() => toggleScope(scope)}
293:             >
294:               {scope}
295:             </button>
296:           ))}
297:         </div>
298:         {keyFormError && (
299:           <p className={styles.mgmtStatusError}>{keyFormError}</p>
300:         )}
301:         <button
302:           type="submit"
303:           className={styles.mgmtSubmitBtn}
304:           disabled={keySubmitting}
305:         >
306:           {keySubmitting ? "Submitting…" : "Request API key"}
307:         </button>
308:       </form>
309: 
310:       {/* One-time raw key reveal modal */}
311:       {adminRevealKey && (
312:         <div className={styles.keyModalBackdrop}>
313:           <div className={styles.keyModal}>
314:             <h4>Your API key</h4>
315:             <div className={styles.rawKeyBox}>
316:               <code>{adminRevealKey.key}</code>
317:               <button
318:                 type="button"
319:                 className={styles.scopeChip}
320:                 onClick={() => navigator.clipboard?.writeText(adminRevealKey.key)}
321:               >
322:                 Copy
323:               </button>
324:             </div>
325:             <p className={styles.mgmtStatusError} style={{ background: "none", padding: 0 }}>
326:               This is the only time this key will be shown. Store it securely.
327:             </p>
328:             <button
329:               type="button"
330:               className={styles.mgmtSubmitBtn}
331:               onClick={() => setAdminRevealKey(null)}
332:             >
333:               I've saved it
334:             </button>
335:           </div>
336:         </div>
337:       )}
338: 
339:       <div className={styles.mgmtSubHeading}>Request status</div>
340:       {keyRequests.length === 0 && (
341:         <p className={styles.mgmtStatus}>No API key requests yet.</p>
342:       )}
343:       {keyRequests.map((r) => (
344:         <div key={r.id} className={styles.mgmtRow}>
345:           <div>
346:             <div className={styles.mgmtRowTitle}>
347:               {r.label || "API key request"}
348:             </div>
349:             <div className={styles.mgmtRowSub}>
350:               scopes: {r.scopes?.join(", ")} · {r.rateLimit}/min ·{" "}
351:               {new Date(r.createdAt).toLocaleString()}
352:               {r.reviewNote ? ` · note: ${r.reviewNote}` : ""}
353:             </div>
354:           </div>
355:           <div className={styles.mgmtRowActions}>
356:             <span
357:               className={
358:                 r.status === "approved"
359:                   ? styles.mgmtBadgeOpen
360:                   : r.status === "rejected"
361:                     ? styles.mgmtBadgeClosed
362:                     : styles.mgmtBadgePending
363:               }
364:             >
365:               {r.status}
366:             </span>
367:             {r.canRevealKey && (
368:               <button
369:                 type="button"
370:                 className={styles.mgmtSubmitBtn}
371:                 onClick={() => handleRevealKey(r.id)}
372:               >
373:                 Reveal key
374:               </button>
375:             )}
376:           </div>
377:         </div>
378:       ))}
379:     </motion.div>
380:   );
381: };
382: 
383: export default AdminOverview;

(End of file - total 383 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/tests/platform/superadmin.platform.test.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/tests/platform/superadmin.platform.test.js</path>
<type>file</type>
<content>
1: import { describe, it, expect, vi, beforeEach } from "vitest";
2: import jwt from "jsonwebtoken";
3: import {
4:   loginSuperadmin,
5:   getPlatformMe,
6: } from "../../src/controllers/platform/platformAuth.controller.js";
7: import { reviewKeyRequest } from "../../src/controllers/platform/platformKeyRequest.controller.js";
8: import Superadmin from "../../src/models/superadmin.model.js";
9: import ApiKeyRequest from "../../src/models/apiKeyRequest.model.js";
10: import ApiKey from "../../src/models/apiKey.model.js";
11: import v1Router from "../../src/routes/v1/index.js";
12: 
13: process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
14: 
15: const mockRes = () => {
16:   const res = {};
17:   res.status = vi.fn().mockReturnValue(res);
18:   res.json = vi.fn().mockReturnValue(res);
19:   return res;
20: };
21: 
22: /**
23:  * Platform surface — Superadmin model everywhere (Phase 13 WP8).
24:  *
25:  * - login issues { id, kind: "superadmin", role: "superadmin" } JWT
26:  * - response wraps identity under `user` (same key as bank logins)
27:  * - getPlatformMe returns superadmin profile from protect's req.user
28:  * - reviewKeyRequest stamps reviewedBy with the Superadmin id
29:  * - legacy v1 /api-key-requests router is gone (authorize("admin")
30:  *   could never pass under resolveStaffUser's role "staff")
31:  */
32: describe("platformAuth — Superadmin model", () => {
33:   beforeEach(() => {
34:     vi.clearAllMocks();
35:   });
36: 
37:   it("loginSuperadmin returns user identity + superadmin JWT", async () => {
38:     const fake = {
39:       _id: "64b000000000000000000001",
40:       name: "Platform Ops",
41:       email: "superadmin@cue.dev",
42:       isActive: true,
43:       mustChangePassword: false,
44:       comparePassword: vi.fn().mockResolvedValue(true),
45:     };
46:     vi.spyOn(Superadmin, "findOne").mockReturnValue({
47:       select: vi.fn().mockResolvedValue(fake),
48:     });
49: 
50:     const req = { body: { email: "superadmin@cue.dev", password: "secret" } };
51:     const res = mockRes();
52:     const next = vi.fn();
53: 
54:     await loginSuperadmin(req, res, next);
55: 
56:     expect(next).not.toHaveBeenCalled();
57:     const payload = res.json.mock.calls[0][0];
58:     expect(payload.data.user).toMatchObject({
59:       email: "superadmin@cue.dev",
60:       role: "superadmin",
61:       kind: "superadmin",
62:     });
63:     expect(payload.data.staff).toBeUndefined();
64: 
65:     const claims = jwt.verify(payload.data.token, process.env.JWT_SECRET);
66:     expect(claims.kind).toBe("superadmin");
67:     expect(claims.role).toBe("superadmin");
68:     expect(claims.id).toBe(fake._id);
69:   });
70: 
71:   it("loginSuperadmin rejects bad password with generic 401", async () => {
72:     const fake = {
73:       _id: "64b000000000000000000001",
74:       email: "superadmin@cue.dev",
75:       isActive: true,
76:       comparePassword: vi.fn().mockResolvedValue(false),
77:     };
78:     vi.spyOn(Superadmin, "findOne").mockReturnValue({
79:       select: vi.fn().mockResolvedValue(fake),
80:     });
81: 
82:     const res = mockRes();
83:     await loginSuperadmin(
84:       { body: { email: "superadmin@cue.dev", password: "wrong" } },
85:       res,
86:       vi.fn(),
87:     );
88:     expect(res.status).toHaveBeenCalledWith(401);
89:   });
90: 
91:   it("getPlatformMe returns the protect-loaded Superadmin profile", async () => {
92:     const res = mockRes();
93:     await getPlatformMe(
94:       {
95:         user: {
96:           _id: "64b000000000000000000001",
97:           name: "Platform Ops",
98:           email: "superadmin@cue.dev",
99:         },
100:         role: "superadmin",
101:       },
102:       res,
103:       vi.fn(),
104:     );
105:     const payload = res.json.mock.calls[0][0];
106:     expect(payload.data).toMatchObject({
107:       email: "superadmin@cue.dev",
108:       role: "superadmin",
109:     });
110:   });
111: });
112: 
113: describe("platformKeyRequest — reviewedBy is Superadmin", () => {
114:   beforeEach(() => {
115:     vi.clearAllMocks();
116:   });
117: 
118:   it("approve stamps reviewedBy with the superadmin user id", async () => {
119:     const superadminId = "64b000000000000000000001";
120:     const request = {
121:       _id: "64b0000000000000000000aa",
122:       bankName: "acme",
123:       status: "pending",
124:       scopes: ["tickets:read"],
125:       rateLimit: 100,
126:       label: "prod",
127:       save: vi.fn().mockResolvedValue(true),
128:     };
129:     vi.spyOn(ApiKeyRequest, "findById").mockResolvedValue(request);
130:     vi.spyOn(ApiKey, "generateKey").mockResolvedValue({
131:       rawKey: "cue_raw",
132:       keyHash: "hash",
133:       keyPrefix: "cue_abcd",
134:     });
135:     vi.spyOn(ApiKey, "create").mockResolvedValue({
136:       _id: "64b0000000000000000000bb",
137:       keyPrefix: "cue_abcd",
138:       scopes: ["tickets:read"],
139:       rateLimit: 100,
140:     });
141: 
142:     const res = mockRes();
143:     const next = vi.fn();
144:     await reviewKeyRequest(
145:       {
146:         params: { id: "64b0000000000000000000aa" },
147:         body: { action: "approve", reviewNote: "ok" },
148:         user: { _id: superadminId, role: "superadmin" },
149:       },
150:       res,
151:       next,
152:     );
153: 
154:     expect(next).not.toHaveBeenCalled();
155:     expect(request.reviewedBy).toBe(superadminId);
156:     expect(request.status).toBe("approved");
157:     expect(request.encryptedRawKey).toBeTruthy();
158:     expect(request.save).toHaveBeenCalled();
159:     const payload = res.json.mock.calls[0][0];
160:     expect(payload.data.key).toBe("cue_raw");
161:   });
162: 
163:   it("reject stamps reviewedBy and does not create a key", async () => {
164:     const request = {
165:       _id: "64b0000000000000000000aa",
166:       bankName: "acme",
167:       status: "pending",
168:       save: vi.fn().mockResolvedValue(true),
169:     };
170:     vi.spyOn(ApiKeyRequest, "findById").mockResolvedValue(request);
171:     const createSpy = vi.spyOn(ApiKey, "create");
172: 
173:     const res = mockRes();
174:     await reviewKeyRequest(
175:       {
176:         params: { id: "64b0000000000000000000aa" },
177:         body: { action: "reject", reviewNote: "no" },
178:         user: { _id: "64b000000000000000000001", role: "superadmin" },
179:       },
180:       res,
181:       vi.fn(),
182:     );
183: 
184:     expect(request.status).toBe("rejected");
185:     expect(request.reviewedBy).toBe("64b000000000000000000001");
186:     expect(createSpy).not.toHaveBeenCalled();
187:   });
188: });
189: 
190: describe("v1 router — api-key-requests removed (WP8)", () => {
191:   it("does not mount /api-key-requests", () => {
192:     const stack = (v1Router.stack || []).map((layer) => ({
193:       name: layer.name,
194:       path: layer.route?.path,
195:       regexp: String(layer.regexp || ""),
196:     }));
197:     const mounts = stack.filter(
198:       (l) => l.path && String(l.path).includes("api-key-request"),
199:     );
200:     const regexpHits = stack.filter((l) =>
201:       l.regexp.includes("api-key-request"),
202:     );
203:     expect(mounts).toHaveLength(0);
204:     expect(regexpHits).toHaveLength(0);
205:   });
206: });

(End of file - total 206 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css",
  "limit": 80,
  "offset": 610
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css</path>
<type>file</type>
<content>
610: .mgmtLinkBtn:hover {
611:   text-decoration: underline;
612: }
613: 
614: .mgmtBadgeOpen,
615: .mgmtBadgeClosed,
616: .mgmtBadgePending {
617:   font-family: var(--font-mono);
618:   font-size: 0.7rem;
619:   letter-spacing: 0.05em;
620:   text-transform: uppercase;
621:   padding: 0.2rem 0.55rem;
622:   border-radius: 100px;
623: }
624: .mgmtBadgeOpen {
625:   background: var(--brand-primary);
626:   color: var(--ink);
627: }
628: .mgmtBadgeClosed {
629:   background: var(--paper);
630:   color: var(--paper-soft);
631: }
632: .mgmtBadgePending {
633:   background: rgba(201, 162, 39, 0.2);
634:   color: var(--brand-accent);
635: }
636: 
637: .mgmtInlineForm {
638:   display: flex;
639:   flex-wrap: wrap;
640:   gap: 0.75rem;
641:   align-items: center;
642: }
643: .mgmtInlineForm input {
644:   font-family: var(--font-body);
645:   font-size: 0.9rem;
646:   padding: 0.65rem 0.9rem;
647:   border-radius: 8px;
648:   border: 1px solid var(--paper-soft);
649:   background: var(--paper);
650:   flex: 1;
651:   min-width: 160px;
652: }
653: .mgmtInlineForm input:focus {
654:   outline: 2px solid var(--brand-primary);
655:   outline-offset: 1px;
656: }
657: 
658: .mgmtInlineSelect {
659:   font-family: var(--font-body);
660:   font-size: 0.85rem;
661:   padding: 0.4rem 0.6rem;
662:   border-radius: 6px;
663:   border: 1px solid var(--paper-soft);
664:   background: var(--paper);
665: }
666: 
667: .mgmtSubmitBtn {
668:   padding: 0.7rem 1.25rem;
669:   background: var(--brand-primary);
670:   color: var(--ink);
671:   border-radius: 100px;
672:   font-weight: 700;
673:   font-size: 0.9rem;
674:   transition:
675:     transform 0.2s ease,
676:     opacity 0.2s ease;
677: }
678: .mgmtSubmitBtn:hover {
679:   transform: translateY(-2px);
680: }
681: .mgmtSubmitBtn:disabled {
682:   opacity: 0.6;
683:   transform: none;
684:   cursor: not-allowed;
685: }
686: 
687: .mgmtQueueChips {
688:   display: flex;
689:   flex-wrap: wrap;

(Showing lines 610-689 of 942. Use offset=690 to continue.)
</content>
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "backend/tests/**/*apiKey*"
}
```

**Output:**
```
/home/gamp/Desktop/cue/backend/tests/middlewares/apiKey.middleware.test.js
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/middlewares/apiKey.middleware.js",
  "limit": 70
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/middlewares/apiKey.middleware.js</path>
<type>file</type>
<content>
1: import ApiKey from "../models/apiKey.model.js";
2: import ApiKeyUsage from "../models/apiKeyUsage.model.js";
3: import { sendError } from "../utils/response.js";
4: import { usageDateKey } from "../utils/keyWrap.js";
5: 
6: /**
7:  * API Key Authentication Middleware
8:  *
9:  * Authenticates requests using the X-API-Key header.
10:  * On success, attaches `req.apiKey` (the ApiKey document) and `req.bankName`
11:  * to the request for downstream controllers to use.
12:  *
13:  * Usage:
14:  *   router.get("/endpoint", authenticateApiKey, requireScope("tickets:read"), handler)
15:  *
16:  * The key is looked up by hashing it with bcrypt and comparing against stored hashes.
17:  * This is intentionally slow (bcrypt) to prevent timing attacks.
18:  *
19:  * After authentication, we update `lastUsedAt` fire-and-forget (don't await).
20:  */
21: 
22: export const authenticateApiKey = async (req, res, next) => {
23:   try {
24:     const apiKey = req.headers["x-api-key"];
25: 
26:     if (!apiKey) {
27:       return sendError(res, {
28:         statusCode: 401,
29:         message: "API key required. Pass it via the X-API-Key header.",
30:       });
31:     }
32: 
33:     // Verify the key against all stored hashes.
34:     // Returns the matching ApiKey document or null.
35:     const keyDoc = await ApiKey.verifyKey(apiKey);
36: 
37:     if (!keyDoc) {
38:       return sendError(res, {
39:         statusCode: 401,
40:         message: "Invalid or revoked API key",
41:       });
42:     }
43: 
44:     // Check if the key has expired
45:     if (keyDoc.expiresAt && keyDoc.expiresAt < new Date()) {
46:       return sendError(res, {
47:         statusCode: 401,
48:         message: "API key has expired",
49:       });
50:     }
51: 
52:     // Check if the key is active (not disabled)
53:     if (!keyDoc.isActive) {
54:       return sendError(res, {
55:         statusCode: 403,
56:         message: "API key has been disabled. Contact support.",
57:       });
58:     }
59: 
60:     // Check if we're in the grace period (key was rotated, old key still valid temporarily)
61:     if (keyDoc.gracePeriodEndsAt && keyDoc.gracePeriodEndsAt < new Date()) {
62:       return sendError(res, {
63:         statusCode: 401,
64:         message: "API key has expired due to rotation. Use the new key.",
65:       });
66:     }
67: 
68:     // Attach key info to request for downstream use
69:     req.apiKey = keyDoc;
70:     req.bankName = keyDoc.bankName;

(Showing lines 1-70 of 216. Use offset=71 to continue.)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue/backend/tests",
  "pattern": "canRevealKey|adminApiKey|keyStatus|encryptedRawKey"
}
```

**Output:**
```
Found 1 matches
/home/gamp/Desktop/cue/backend/tests/platform/superadmin.platform.test.js:
  Line 157:     expect(request.encryptedRawKey).toBeTruthy();

```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 62.5s)

_Thinking:_

I'll implement:

1. Fix canRevealKey - need encryptedRawKey loaded for the flag but not returned in JSON
2. Add keyStatus by joining ApiKey
3. Clear encryptedRawKey on revoke
4. Frontend badges
5. Tests

For the list endpoint:
- Don't select `-encryptedRawKey` when loading (or select it for canRevealKey computation but exclude from response)
- Load ApiKey docs for approved requests to compute keyStatus

```javascript
const [requests, total] = await Promise.all([
  ApiKeyRequest.find(filter)
    .sort("-createdAt")
    .skip(skip)
    .limit(limit),
  ApiKeyRequest.countDocuments(filter),
]);

// Batch-load linked keys for status
const keyIds = requests.map(r => r.apiKey).filter(Boolean);
const keys = keyIds.length
  ? await ApiKey.find({ _id: { $in: keyIds } }).select("keyPrefix isActive bankName")
  : [];
const keyById = new Map(keys.map(k => [String(k._id), k]));

const data = requests.map((r) => {
  const key = r.apiKey ? keyById.get(String(r.apiKey)) : undefined;
  let keyStatus = null;
  if (r.status === "approved") {
    if (!r.apiKey || !key) keyStatus = "revoked";
    else keyStatus = key.isActive ? "active" : "suspended";
  }
  return {
    ...
    canRevealKey: r.status === "approved" && !!r.encryptedRawKey && !r.bankKeyRevealedAt,
    keyStatus,
    keyPrefix: key?.keyPrefix || null,
    // never include encryptedRawKey
  };
});
```

For deleteApiKey - clear staged ciphertext:
```javascript
await ApiKeyRequest.updateMany(
  { apiKey: key._id },
  { $unset: { encryptedRawKey: 1 } }
);
```

For single GET reveal response - also include keyStatus for consistency.

Frontend badges:
```jsx
{r.status === "approved" && r.keyStatus && (
  <span className={keyStatusClass(r.keyStatus)}>{r.keyStatus}</span>
)}
```

CSS for keyStatus badges - can reuse mgmtBadgeOpen/Closed/Pending or add specific ones.

active → mgmtBadgeOpen
suspended → mgmtBadgePending  
revoked → mgmtBadgeClosed

Also update help text about X-API-Key.

For tests - I'll test the list handler logic. The routes are Express handlers - I can either extract mapRequest logic or invoke the router handler with mocked models. Simpler to extract a pure function `mapApiKeyRequestListItem` or test via calling the route stack... Actually easiest is to export helper functions for canRevealKey and keyStatus computation, or mock ApiKeyRequest.find chain.

Looking at how other tests work - they mock models. I can test the list route by finding the GET / handler.

Actually the list is anonymous in the router. Better approach: extract `buildBankKeyRequestListItem(r, key)` to a small util or export from the route file. Or just put logic in a shared util.

I'll create a small helper in the route file and export it for tests:

```javascript
export const mapBankKeyRequest = (r, keyDoc) => ({...});
```

And for revoke, test deleteApiKey clears encryptedRawKey.

Also extract key status helper:
```javascript
export const resolveKeyStatus = (request, keyDoc) => {
  if (request.status !== "approved") return null;
  if (!request.apiKey || !keyDoc) return "revoked";
  return keyDoc.isActive ? "active" : "suspended";
};
```

Let me also update single GET to include keyStatus and keyPrefix.

For tests file - add to superadmin.platform.test.js or new file adminApiKeyRequest.test.js.

I'll implement now.

Implementing backend list fix, revoke cleanup, key status, frontend badges, and tests.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js",
  "newString": "import { Router } from \"express\";\nimport { body, param, validationResult } from \"express-validator\";\nimport ApiKeyRequest from \"../models/apiKeyRequest.model.js\";\nimport ApiKey from \"../models/apiKey.model.js\";\nimport { sendSuccess, sendError } from \"../utils/response.js\";\nimport { parsePagination, paginatedResponse } from \"../utils/pagination.js\";\nimport { decryptKey } from \"../utils/keyWrap.js\";\nimport { protect, authorize } from \"../middlewares/auth.middleware.js\";",
  "oldString": "import { Router } from \"express\";\nimport { body, param, validationResult } from \"express-validator\";\nimport ApiKeyRequest from \"../models/apiKeyRequest.model.js\";\nimport { sendSuccess, sendError } from \"../utils/response.js\";\nimport { parsePagination, paginatedResponse } from \"../utils/pagination.js\";\nimport { decryptKey } from \"../utils/keyWrap.js\";\nimport { protect, authorize } from \"../middlewares/auth.middleware.js\";"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js",
  "newString": "const BANK_REQUESTABLE_SCOPES = [\n  \"branches:read\",\n  \"tickets:read\",\n  \"tickets:write\",\n  \"staff:read\",\n  \"analytics:read\",\n  \"webhooks:manage\",\n  // \"admin\" is reserved for superadmin-created keys only.\n];\n\n/**\n * Live health of the linked ApiKey for the bank admin's status list.\n * - not approved yet → null\n * - approved but ApiKey missing/deleted → \"revoked\" (superadmin revoke)\n * - ApiKey.isActive false → \"suspended\"\n * - else → \"active\"\n */\nexport const resolveKeyStatus = (request, keyDoc) => {\n  if (request.status !== \"approved\") return null;\n  if (!request.apiKey || !keyDoc) return \"revoked\";\n  return keyDoc.isActive ? \"active\" : \"suspended\";\n};\n\n/**\n * Safe list/detail item — ciphertext is never included in JSON.\n * canRevealKey needs encryptedRawKey present on the in-memory doc\n * (do NOT select it out before this call).\n */\nexport const mapBankKeyRequest = (r, keyDoc = null) => ({\n  id: r._id,\n  bankName: r.bankName,\n  label: r.label,\n  scopes: r.scopes,\n  rateLimit: r.rateLimit,\n  status: r.status,\n  reviewNote: r.reviewNote,\n  apiKey: r.apiKey,\n  canRevealKey:\n    r.status === \"approved\" &&\n    !!r.encryptedRawKey &&\n    !r.bankKeyRevealedAt,\n  revealedAt: r.bankKeyRevealedAt,\n  keyStatus: resolveKeyStatus(r, keyDoc),\n  keyPrefix: keyDoc?.keyPrefix || null,\n  createdAt: r.createdAt,\n});\n\n// Only bank admins may request keys for their bank.\nrouter.use(protect, authorize(\"admin\"));",
  "oldString": "const BANK_REQUESTABLE_SCOPES = [\n  \"branches:read\",\n  \"tickets:read\",\n  \"tickets:write\",\n  \"staff:read\",\n  \"analytics:read\",\n  \"webhooks:manage\",\n  // \"admin\" is reserved for superadmin-created keys only.\n];\n\n// Only bank admins may request keys for their bank.\nrouter.use(protect, authorize(\"admin\"));"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js",
  "newString": "/**\n * GET /api/admin/api-key-requests\n * List this admin's bank requests (metadata only; ciphertext never included).\n *\n * Loads encryptedRawKey only so canRevealKey can be computed, then strips\n * it from the JSON payload. Also joins ApiKey for keyStatus (active /\n * suspended / revoked) so revoke/suspend shows up for the bank admin.\n */\nrouter.get(\"/\", async (req, res, next) => {\n  try {\n    const bankName = req.user.bank;\n    if (!bankName) {\n      return sendError(res, {\n        statusCode: 400,\n        message: \"Admin has no bank — cannot list API key requests\",\n      });\n    }\n\n    const { page, limit, skip } = parsePagination(req.query);\n    const filter = { bankName };\n\n    const [requests, total] = await Promise.all([\n      ApiKeyRequest.find(filter)\n        .sort(\"-createdAt\")\n        .skip(skip)\n        .limit(limit),\n      ApiKeyRequest.countDocuments(filter),\n    ]);\n\n    // Batch-load linked keys (missing doc → revoked after superadmin delete).\n    const keyIds = requests.map((r) => r.apiKey).filter(Boolean);\n    const keys = keyIds.length\n      ? await ApiKey.find({ _id: { $in: keyIds } })\n          .select(\"keyPrefix isActive\")\n          .lean()\n      : [];\n    const keyById = new Map(keys.map((k) => [String(k._id), k]));\n\n    const data = requests.map((r) =>\n      mapBankKeyRequest(r, r.apiKey ? keyById.get(String(r.apiKey)) : null),\n    );\n\n    return sendSuccess(res, {\n      statusCode: 200,\n      message: \"API key requests fetched\",\n      data: paginatedResponse(data, total, page, limit),\n    });\n  } catch (error) {\n    next(error);\n  }\n});",
  "oldString": "/**\n * GET /api/admin/api-key-requests\n * List this admin's bank requests (metadata only; ciphertext never included).\n */\nrouter.get(\"/\", async (req, res, next) => {\n  try {\n    const bankName = req.user.bank;\n    if (!bankName) {\n      return sendError(res, {\n        statusCode: 400,\n        message: \"Admin has no bank — cannot list API key requests\",\n      });\n    }\n\n    const { page, limit, skip } = parsePagination(req.query);\n    const filter = { bankName };\n\n    const [requests, total] = await Promise.all([\n      ApiKeyRequest.find(filter)\n        .select(\"-encryptedRawKey\")\n        .sort(\"-createdAt\")\n        .skip(skip)\n        .limit(limit),\n      ApiKeyRequest.countDocuments(filter),\n    ]);\n\n    // Surface whether a reveal is still available (approved but not yet shown).\n    const data = requests.map((r) => ({\n      id: r._id,\n      bankName: r.bankName,\n      label: r.label,\n      scopes: r.scopes,\n      rateLimit: r.rateLimit,\n      status: r.status,\n      reviewNote: r.reviewNote,\n      apiKey: r.apiKey,\n      canRevealKey:\n        r.status === \"approved\" &&\n        !!r.encryptedRawKey &&\n        !r.bankKeyRevealedAt,\n      revealedAt: r.bankKeyRevealedAt,\n      createdAt: r.createdAt,\n    }));\n\n    return sendSuccess(res, {\n      statusCode: 200,\n      message: \"API key requests fetched\",\n      data: paginatedResponse(data, total, page, limit),\n    });\n  } catch (error) {\n    next(error);\n  }\n});"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js",
  "newString": "      // Always scope the lookup to this bank — never leak another bank's request.\n      // Keep encryptedRawKey on the doc only long enough to attempt reveal;\n      // it is stripped from the response payload via mapBankKeyRequest.\n      const request = await ApiKeyRequest.findOne({\n        _id: req.params.id,\n        bankName,\n      });\n\n      if (!request) {\n        return sendError(res, { statusCode: 404, message: \"Request not found\" });\n      }\n\n      let rawKey = null;\n      let justRevealed = false;\n\n      if (request.status === \"approved\" && !request.bankKeyRevealedAt) {\n        if (request.encryptedRawKey) {\n          try {\n            rawKey = decryptKey(request.encryptedRawKey);\n            // Wipe ciphertext permanently after successful decrypt.\n            await ApiKeyRequest.updateOne(\n              { _id: request._id },\n              {\n                $set: { bankKeyRevealedAt: new Date() },\n                $unset: { encryptedRawKey: 1 },\n              },\n            );\n            justRevealed = true;\n            // In-memory wipe so the response mapper can't leak ciphertext.\n            request.encryptedRawKey = null;\n            request.bankKeyRevealedAt = new Date();\n          } catch {\n            // Decryption failed (wrong secret / corruption) — don't leak internals.\n            rawKey = null;\n          }\n        }\n      }\n\n      let keyDoc = null;\n      if (request.apiKey) {\n        keyDoc = await ApiKey.findById(request.apiKey)\n          .select(\"keyPrefix isActive\")\n          .lean();\n      }\n\n      const mapped = mapBankKeyRequest(request, keyDoc);\n\n      return sendSuccess(res, {\n        statusCode: 200,\n        message: justRevealed\n          ? \"API key revealed — copy it now, it won't be shown again\"\n          : \"API key request fetched\",\n        data: {\n          ...mapped,\n          // Raw key only on the one-time reveal; null afterwards.\n          key: rawKey,\n        },\n      });",
  "oldString": "      // Always scope the lookup to this bank — never leak another bank's request.\n      const request = await ApiKeyRequest.findOne({\n        _id: req.params.id,\n        bankName,\n      }).select(\"-encryptedRawKey\");\n\n      if (!request) {\n        return sendError(res, { statusCode: 404, message: \"Request not found\" });\n      }\n\n      let rawKey = null;\n      let justRevealed = false;\n\n      if (request.status === \"approved\" && !request.bankKeyRevealedAt) {\n        const full = await ApiKeyRequest.findById(request._id).select(\n          \"encryptedRawKey\",\n        );\n        if (full?.encryptedRawKey) {\n          try {\n            rawKey = decryptKey(full.encryptedRawKey);\n            // Wipe ciphertext permanently after successful decrypt.\n            await ApiKeyRequest.updateOne(\n              { _id: request._id },\n              {\n                $set: { bankKeyRevealedAt: new Date() },\n                $unset: { encryptedRawKey: 1 },\n              },\n            );\n            justRevealed = true;\n          } catch {\n            // Decryption failed (wrong secret / corruption) — don't leak internals.\n            rawKey = null;\n          }\n        }\n      }\n\n      return sendSuccess(res, {\n        statusCode: 200,\n        message: justRevealed\n          ? \"API key revealed — copy it now, it won't be shown again\"\n          : \"API key request fetched\",\n        data: {\n          id: request._id,\n          bankName: request.bankName,\n          label: request.label,\n          scopes: request.scopes,\n          rateLimit: request.rateLimit,\n          status: request.status,\n          reviewNote: request.reviewNote,\n          apiKey: request.apiKey,\n          revealedAt: request.bankKeyRevealedAt,\n          // Raw key only on the one-time reveal; null afterwards.\n          key: rawKey,\n        },\n      });"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js",
  "newString": "import ApiKey from \"../../models/apiKey.model.js\";\nimport ApiKeyRequest from \"../../models/apiKeyRequest.model.js\";\nimport { sendSuccess, sendError } from \"../../utils/response.js\";\nimport { parsePagination, paginatedResponse } from \"../../utils/pagination.js\";\nimport { validationResult } from \"express-validator\";",
  "oldString": "import ApiKey from \"../../models/apiKey.model.js\";\nimport { sendSuccess, sendError } from \"../../utils/response.js\";\nimport { parsePagination, paginatedResponse } from \"../../utils/pagination.js\";\nimport { validationResult } from \"express-validator\";"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js",
  "newString": "/**\n * DELETE /api/platform/api-keys/:id\n * Permanently revoke (delete) a key.\n * Also wipes any staged reveal ciphertext on linked ApiKeyRequests so a\n * bank admin can't reveal a key that no longer exists; the list endpoint\n * then reports keyStatus: \"revoked\" (ApiKey doc is gone).\n */\nexport const deleteApiKey = async (req, res, next) => {\n  try {\n    if (!handleValidation(req, res)) return;\n\n    const key = await ApiKey.findByIdAndDelete(req.params.id);\n    if (!key) {\n      return sendError(res, { statusCode: 404, message: \"API key not found\" });\n    }\n\n    // Clear dual-reveal ciphertext staged at approval time.\n    await ApiKeyRequest.updateMany(\n      { apiKey: key._id },\n      { $unset: { encryptedRawKey: 1, rawKeyStagedAt: 1 } },\n    );\n\n    return sendSuccess(res, {\n      statusCode: 200,\n      message: `API key for \"${key.bankName}\" has been permanently revoked`,\n    });\n  } catch (error) {\n    next(error);\n  }\n};",
  "oldString": "/**\n * DELETE /api/platform/api-keys/:id\n * Permanently revoke (delete) a key.\n */\nexport const deleteApiKey = async (req, res, next) => {\n  try {\n    if (!handleValidation(req, res)) return;\n\n    const key = await ApiKey.findByIdAndDelete(req.params.id);\n    if (!key) {\n      return sendError(res, { statusCode: 404, message: \"API key not found\" });\n    }\n\n    return sendSuccess(res, {\n      statusCode: 200,\n      message: `API key for \"${key.bankName}\" has been permanently revoked`,\n    });\n  } catch (error) {\n    next(error);\n  }\n};"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx",
  "newString": "      <div className={styles.mgmtSubHeading}>API key access</div>\n      <p className={styles.mgmtStatus}>\n        Request an API key for your bank. After superadmin approval, reveal\n        it once here and send it on your systems as{\" \"}\n        <code>X-API-Key: cue_…</code> to <code>/api/v1/*</code>. The Cue\n        dashboard itself uses your JWT login — not this key.\n      </p>",
  "oldString": "      <div className={styles.mgmtSubHeading}>API key access</div>\n      <p className={styles.mgmtStatus}>\n        Request an API key for your bank. The superadmin reviews it on the\n        platform console — once approved you can reveal the key once here.\n      </p>"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx",
  "newString": "      <div className={styles.mgmtSubHeading}>Request status</div>\n      {keyRequests.length === 0 && (\n        <p className={styles.mgmtStatus}>No API key requests yet.</p>\n      )}\n      {keyRequests.map((r) => (\n        <div key={r.id} className={styles.mgmtRow}>\n          <div>\n            <div className={styles.mgmtRowTitle}>\n              {r.label || \"API key request\"}\n            </div>\n            <div className={styles.mgmtRowSub}>\n              scopes: {r.scopes?.join(\", \")} · {r.rateLimit}/min ·{\" \"}\n              {new Date(r.createdAt).toLocaleString()}\n              {r.keyPrefix ? ` · ends in ${r.keyPrefix}` : \"\"}\n              {r.reviewNote ? ` · note: ${r.reviewNote}` : \"\"}\n            </div>\n          </div>\n          <div className={styles.mgmtRowActions}>\n            <span\n              className={\n                r.status === \"approved\"\n                  ? styles.mgmtBadgeOpen\n                  : r.status === \"rejected\"\n                    ? styles.mgmtBadgeClosed\n                    : styles.mgmtBadgePending\n              }\n            >\n              {r.status}\n            </span>\n            {r.status === \"approved\" && r.keyStatus && (\n              <span\n                className={\n                  r.keyStatus === \"active\"\n                    ? styles.mgmtBadgeOpen\n                    : r.keyStatus === \"suspended\"\n                      ? styles.mgmtBadgePending\n                      : styles.mgmtBadgeClosed\n                }\n                title={\n                  r.keyStatus === \"revoked\"\n                    ? \"Key revoked by platform — integration calls will be rejected\"\n                    : r.keyStatus === \"suspended\"\n                      ? \"Key temporarily disabled by platform\"\n                      : \"Key is active for X-API-Key integration calls\"\n                }\n              >\n                {r.keyStatus}\n              </span>\n            )}\n            {r.canRevealKey && (\n              <button\n                type=\"button\"\n                className={styles.mgmtSubmitBtn}\n                onClick={() => handleRevealKey(r.id)}\n              >\n                Reveal key\n              </button>\n            )}\n          </div>\n        </div>\n      ))}\n    </motion.div>\n  );\n};",
  "oldString": "      <div className={styles.mgmtSubHeading}>Request status</div>\n      {keyRequests.length === 0 && (\n        <p className={styles.mgmtStatus}>No API key requests yet.</p>\n      )}\n      {keyRequests.map((r) => (\n        <div key={r.id} className={styles.mgmtRow}>\n          <div>\n            <div className={styles.mgmtRowTitle}>\n              {r.label || \"API key request\"}\n            </div>\n            <div className={styles.mgmtRowSub}>\n              scopes: {r.scopes?.join(\", \")} · {r.rateLimit}/min ·{\" \"}\n              {new Date(r.createdAt).toLocaleString()}\n              {r.reviewNote ? ` · note: ${r.reviewNote}` : \"\"}\n            </div>\n          </div>\n          <div className={styles.mgmtRowActions}>\n            <span\n              className={\n                r.status === \"approved\"\n                  ? styles.mgmtBadgeOpen\n                  : r.status === \"rejected\"\n                    ? styles.mgmtBadgeClosed\n                    : styles.mgmtBadgePending\n              }\n            >\n              {r.status}\n            </span>\n            {r.canRevealKey && (\n              <button\n                type=\"button\"\n                className={styles.mgmtSubmitBtn}\n                onClick={() => handleRevealKey(r.id)}\n              >\n                Reveal key\n              </button>\n            )}\n          </div>\n        </div>\n      ))}\n    </motion.div>\n  );\n};"
}
```

**Output:**
```
Edit applied successfully.
```

---

## User

---

## Assistant (Compaction · MiMo-V2.6-Flash Free · 43.2s)

_Thinking:_

Let me produce the combined summary following the exact structure.

## Objective
- Pivot "Cue" into an API-first, multi-tenant queue integration service; execute BUILD_PLAN.md Phase 13. WP1–WP8 shipped (uncommitted); WP9 (docs, env cleanup, full test pass) remains — but user has since reported two API-key flow bugs (bank admin can't reveal approved key; revoke status invisible) and **"implement the fixes"** is the current task: reveal-flag fix, `keyStatus` on bank-admin list, revoke cleanup, UI badges, tests.

## Important Details
- **Locked architecture decisions (user-confirmed):**
  - Four collections: `Staff`, `Admin`, `Manager`, `Superadmin` — **no `role` field; collection = role**; Manager cannot serve tickets
  - JWT payload `{ id, kind, role }`; `protect` dispatches via `modelForToken`/`KIND_MODELS`; superadmin login `POST /api/platform/login` returns identity under `data.user` (was `data.staff`, fixed in WP8)
  - **Dashboard = JWT-only** all four roles; **v1 = API-key-only** (`X-API-Key` header) for banks' external systems; demo switcher/`VITE_DEMO_API_KEY`/`/v1/demo/*` removed
  - Admin `bank` required; `tenantMatch` 403s if admin.bank ≠ key.bankName; JWT scoping pattern `bank = req.bankName || req.user?.bank`
  - Only Staff serve (`requireStaffServing`/`denyNonStaffServe`); provisioning: seed superadmin only, admin public self-register, managers/staff via temp password `Cue-XXXXXX-XXXXXX` (once, `mustChangePassword: true`) + invite links
  - `resolveStaffUser` (v1) = Staff-only, `req.role="staff"` → v1 uses `requireScope`, never role `authorize()`
  - Key format `cue_<48 hex>`, bcrypt-hashed; scopes: `branches:read`, `tickets:read/write`, `staff:read`, `analytics:read`, `webhooks:manage`, `admin` (superadmin-only; BANK_REQUESTABLE_SCOPES excludes `admin`)
  - Dual reveal on approve: raw key shown once to superadmin AND AES-256-GCM-staged (`encryptKey`, `KEY_WRAP_SECRET || JWT_SECRET`) on `ApiKeyRequest.encryptedRawKey` for bank admin one-time reveal (`bankKeyRevealedAt`); rotation reveal = superadmin only
  - Theme "Verdant Trust" `#0d7c66`/`#c9a227`/`#dc2626`; env-only branding; understandable comments
  - User directives: do not commit unless asked (nothing committed); "implement the fixes" for the API-key flow
- **Identified bugs (root causes, confirmed by reads):**
  1. Reveal never shows: `adminApiKeyRequest.routes.js` list does `.select("-encryptedRawKey")` then `canRevealKey = approved && !!r.encryptedRawKey && !bankKeyRevealedAt` → always `false`; `AdminOverview.jsx:367` only renders Reveal when `r.canRevealKey`
  2. Revoke invisible: `deleteApiKey` = `ApiKey.findByIdAndDelete` (`platformApiKey.controller.js:116`); suspend = `ApiKey.isActive=false`; bank-admin list returns only request `pending|approved|rejected` — no join to live key → need `keyStatus: "active"|"suspended"|"revoked"|null` + `keyPrefix`
  - Planned extra: on revoke, clear staged `encryptedRawKey` so a missed reveal can't return a dead key
- **API-key usage answer (given to user):** dashboard uses JWT; the key is for the bank's own systems — `X-API-Key: cue_...` on `/api/v1/*` (gated by scopes + rate limit); revoke → 401 "Invalid or revoked API key", suspend → 403
- **Response shapes:** `sendSuccess` → `{status, message, data, meta}`; key-request list nests `data: paginatedResponse(...)` so frontend reads `res.data?.data`; staff/branches list spreads `...paginatedResponse` so `res.data` is array directly (inconsistent but both handled)
- Tests: 123 backend + 8 frontend green; `vite build` green; Mongo not running locally (migration/seeds untested live); branch `api-version`, last commit `e3b890d`, all Phase 13 work uncommitted
- Pre-existing lint noise (`react-hooks/set-state-in-effect`, `react-refresh/only-export-components`) — not regressions

## Work State
### Completed
- Phases 1–8c, Phase 12 — committed `102d953`; Phase 13 WP1–WP2 — committed `e3b890d`
- **WP1–WP7 ✅** (four models, kind JWT, auth surface, manager/staff provisioning, v1 requireScope, dashboard→JWT, 4 login pages/demo removed) — as detailed in prior summary; all uncommitted
- **WP8 ✅ (this session):**
  - Deleted broken legacy `backend/src/routes/v1/apiKeyRequest.routes.js` (authorize("admin") always 403'd under `resolveStaffUser` role "staff") + unmounted from `v1/index.js` (replaced with comment)
  - `platformAuth.controller.js`: login response identity key `staff` → `user` with `role`/`kind`/`mustChangePassword`
  - `ProtectedRoute.jsx`: unauthenticated `/platform*` → `/platform/login` (state `from`)
  - `AuthInterceptor` in `AuthContext.jsx`: superadmin 401 → `/platform/login` with `sessionExpired` (role read from localStorage before `setAuth(null)`)
  - Stale comments fixed: `platform/apiKey.routes.js`, `platformApiKey.controller.js`, `apiKeyRequest.model.js` → JWT admin path
  - New `backend/tests/platform/superadmin.platform.test.js` (6 tests: login shape+JWT kind, bad password, getPlatformMe, approve/reject stamp `reviewedBy`, v1 router has no api-key-requests)
  - `BUILD_PLAN.md` WP8 marked ✅ with checklist
- **Manager wiring for admins ✅:**
  - `manageApi.js`: `fetchManagers`, `createManager`, `deactivateManagerApi`
  - New `ManagerSubTab.jsx`: list/create (name/email/optional password/branch)/deactivate; blank password → one-time temp-password modal
  - `ManagePanel.jsx`: admin tabs **Managers | Staff** (Managers default); manager sees Staff | Counters
  - `AdminOverview.jsx`: "coming in WP4" copy → "Manage → Managers"; fixed `setRevealedKey(null)` → `setAdminRevealKey(null)` bug
  - `StaffSubTab.jsx`: password optional (blank = temp), shows server `tempPassword` modal
  - Root cause explained to user: only form was staff-create; backend `POST /api/managers` existed but unwired
- Verified: 123 backend + 8 frontend tests green, `vite build` ok, `node --check` green after all changes

### Active
- **Implementing API-key reveal/status fixes (user: "implement the fixes")** — exploration done, no edits applied yet:
  - Bug 1 confirmed: `adminApiKeyRequest.routes.js:150-171` — `.select("-encryptedRawKey")` before computing `canRevealKey`
  - Bug 2 confirmed: no join to `ApiKey` for key health on bank-admin list; revoke = delete, suspend = `isActive=false`
  - Fix plan agreed: (a) load ciphertext for `canRevealKey` computation (omit from JSON), (b) resolve linked ApiKey → `keyStatus` (`revoked` if missing, `suspended` if `!isActive`, `else active`, null if not approved) + `keyPrefix`, (c) clear `encryptedRawKey` on revoke in `deleteApiKey`, (d) frontend `AdminOverview` badge Active/Suspended/Revoked + "ends in …" + note that key is for external `X-API-Key` use, (e) tests for canRevealKey and keyStatus
  - Last action: grep showed only existing test touchpoint is `superadmin.platform.test.js:157` (`request.encryptedRawKey`) — no canRevealKey/keyStatus tests exist yet

### Blocked
- Mongo not running locally — migration/seeds and live flow can't be verified end-to-end

## Next Move
1. Edit `backend/src/routes/adminApiKeyRequest.routes.js` list handler: remove/exclude-proof the `.select("-encryptedRawKey")` so `canRevealKey` computes correctly (never return ciphertext in JSON); enrich each approved item with `keyStatus` + `keyPrefix` by resolving linked `ApiKey` (missing → `"revoked"`, `!isActive` → `"suspended"`, else `"active"`; not approved → null); consider same on single GET `/:id`
2. Edit `backend/src/controllers/platform/platformApiKey.controller.js` `deleteApiKey`: clear staged `encryptedRawKey` on related `ApiKeyRequest` after delete
3. Frontend `AdminOverview.jsx`: render Reveal (already gated on `canRevealKey` — verify after fix), add key-health badge next to approved requests, add short usage note (`X-API-Key` on `/api/v1/*`, dashboard uses JWT)
4. Add backend tests (extend `backend/tests/platform/` or new file): list → `canRevealKey: true` when approved+ciphertext and `false` after reveal; `keyStatus` for active/suspended/revoked cases; run `npm test` both packages + `vite build`
5. Then WP9 (docs, env cleanup, full test pass) per BUILD_PLAN; do not commit until user asks

## Relevant Files
- `/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js` — list handler bug (`select("-encryptedRawKey")` vs `canRevealKey`); needs `keyStatus` enrichment; reveal GET `/:id` at ~line 185+
- `/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js` — `deleteApiKey` (line ~112, `findByIdAndDelete`), `toggleApiKey` (line ~176); add staged-ciphertext cleanup on revoke
- `/home/gamp/Desktop/cue/backend/src/controllers/platform/platformKeyRequest.controller.js` — approve stages `encryptedRawKey` (line ~140), sets `apiKey` ref
- `/home/gamp/Desktop/cue/backend/src/models/apiKeyRequest.model.js` — `status`, `encryptedRawKey`, `rawKeyStagedAt`, `bankKeyRevealedAt`, `apiKey` ref
- `/home/gamp/Desktop/cue/backend/src/models/apiKey.model.js` — `keyPrefix`, `isActive`, `verifyKey`, scopes
- `/home/gamp/Desktop/cue/backend/src/utils/keyWrap.js` — `encryptKey`/`decryptKey` (AES-256-GCM)
- `/home/gamp/Desktop/cue/backend/src/middlewares/apiKey.middleware.js` — `authenticateApiKey` (401 invalid/revoked/expired, 403 disabled)
- `/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx` — request status UI, `canRevealKey` gate (line 367), reveal modal, needs keyStatus badge
- `/home/gamp/Desktop/cue/frontend/src/features/staff/apiKeyRequestApi.js` — `requestApiKey`/`fetchApiKeyRequests`/`revealApiKeyRequest`
- `/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css` — badge styles (`mgmtBadgeOpen/Closed/Pending`, `keyModal`, `rawKeyBox`); may need active/suspended/revoked variants
- `/home/gamp/Desktop/cue/backend/tests/platform/superadmin.platform.test.js` — existing platform tests to extend
- `/home/gamp/Desktop/cue/backend/src/utils/response.js` — `sendSuccess`/`sendError` shape
- `/home/gamp/Desktop/cue/backend/src/utils/pagination.js` — `paginatedResponse` → `{ data, meta }`
- `/home/gamp/Desktop/cue/BUILD_PLAN.md` — Phase 13 plan; WP8 ✅; WP9 ⏳ (line ~122)
- `/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerSubTab.jsx` + `ManagePanel.jsx` + `manageApi.js` — manager creation wiring (done)
- `/home/gamp/Desktop/cue/backend/src/routes/manager.routes.js` + `controllers/manager.controller.js` — `POST /api/managers` backend

---

## User

---

## Assistant (Build · MiMo-V2.6-Flash Free · 22.5s)

_Thinking:_

The user wants me to continue. Looking at the summary, I've completed the main fixes:

1. ✅ Backend list fix - canRevealKey computation with encryptedRawKey, keyStatus enrichment
2. ✅ Revoke cleanup - clear encryptedRawKey on delete3. ✅ Frontend AdminOverview - key status badges and usage note

Next steps from the plan:
- Add backend tests for canRevealKey and keyStatus
- Run tests + vite build
- Then WP9

Let me continue with tests and verification.

Adding tests for `canRevealKey` and `keyStatus`, then running the full suite.

**Tool: glob**

**Input:**
```json
{
  "pattern": "backend/tests/**/*.test.js"
}
```

**Output:**
```
/home/gamp/Desktop/cue/backend/tests/models/fourModelSplit.test.js
/home/gamp/Desktop/cue/backend/tests/models/invite.model.test.js
/home/gamp/Desktop/cue/backend/tests/validators/auth.validator.test.js
/home/gamp/Desktop/cue/backend/tests/validators/provisioning.validator.test.js
/home/gamp/Desktop/cue/backend/tests/utils/response.test.js
/home/gamp/Desktop/cue/backend/tests/utils/keyWrap.test.js
/home/gamp/Desktop/cue/backend/tests/utils/pagination.test.js
/home/gamp/Desktop/cue/backend/tests/middlewares/superadmin.authorize.test.js
/home/gamp/Desktop/cue/backend/tests/middlewares/apiKey.middleware.test.js
/home/gamp/Desktop/cue/backend/tests/middlewares/validate.test.js
/home/gamp/Desktop/cue/backend/tests/middlewares/tenantMatch.test.js
/home/gamp/Desktop/cue/backend/tests/middlewares/requireStaffServing.test.js
/home/gamp/Desktop/cue/backend/tests/middlewares/auth.middleware.test.js
/home/gamp/Desktop/cue/backend/tests/middlewares/modelForToken.test.js
/home/gamp/Desktop/cue/backend/tests/middlewares/error.middleware.test.js
/home/gamp/Desktop/cue/backend/tests/platform/superadmin.platform.test.js
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/tests/platform/superadmin.platform.test.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/tests/platform/superadmin.platform.test.js</path>
<type>file</type>
<content>
1: import { describe, it, expect, vi, beforeEach } from "vitest";
2: import jwt from "jsonwebtoken";
3: import {
4:   loginSuperadmin,
5:   getPlatformMe,
6: } from "../../src/controllers/platform/platformAuth.controller.js";
7: import { reviewKeyRequest } from "../../src/controllers/platform/platformKeyRequest.controller.js";
8: import Superadmin from "../../src/models/superadmin.model.js";
9: import ApiKeyRequest from "../../src/models/apiKeyRequest.model.js";
10: import ApiKey from "../../src/models/apiKey.model.js";
11: import v1Router from "../../src/routes/v1/index.js";
12: 
13: process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
14: 
15: const mockRes = () => {
16:   const res = {};
17:   res.status = vi.fn().mockReturnValue(res);
18:   res.json = vi.fn().mockReturnValue(res);
19:   return res;
20: };
21: 
22: /**
23:  * Platform surface — Superadmin model everywhere (Phase 13 WP8).
24:  *
25:  * - login issues { id, kind: "superadmin", role: "superadmin" } JWT
26:  * - response wraps identity under `user` (same key as bank logins)
27:  * - getPlatformMe returns superadmin profile from protect's req.user
28:  * - reviewKeyRequest stamps reviewedBy with the Superadmin id
29:  * - legacy v1 /api-key-requests router is gone (authorize("admin")
30:  *   could never pass under resolveStaffUser's role "staff")
31:  */
32: describe("platformAuth — Superadmin model", () => {
33:   beforeEach(() => {
34:     vi.clearAllMocks();
35:   });
36: 
37:   it("loginSuperadmin returns user identity + superadmin JWT", async () => {
38:     const fake = {
39:       _id: "64b000000000000000000001",
40:       name: "Platform Ops",
41:       email: "superadmin@cue.dev",
42:       isActive: true,
43:       mustChangePassword: false,
44:       comparePassword: vi.fn().mockResolvedValue(true),
45:     };
46:     vi.spyOn(Superadmin, "findOne").mockReturnValue({
47:       select: vi.fn().mockResolvedValue(fake),
48:     });
49: 
50:     const req = { body: { email: "superadmin@cue.dev", password: "secret" } };
51:     const res = mockRes();
52:     const next = vi.fn();
53: 
54:     await loginSuperadmin(req, res, next);
55: 
56:     expect(next).not.toHaveBeenCalled();
57:     const payload = res.json.mock.calls[0][0];
58:     expect(payload.data.user).toMatchObject({
59:       email: "superadmin@cue.dev",
60:       role: "superadmin",
61:       kind: "superadmin",
62:     });
63:     expect(payload.data.staff).toBeUndefined();
64: 
65:     const claims = jwt.verify(payload.data.token, process.env.JWT_SECRET);
66:     expect(claims.kind).toBe("superadmin");
67:     expect(claims.role).toBe("superadmin");
68:     expect(claims.id).toBe(fake._id);
69:   });
70: 
71:   it("loginSuperadmin rejects bad password with generic 401", async () => {
72:     const fake = {
73:       _id: "64b000000000000000000001",
74:       email: "superadmin@cue.dev",
75:       isActive: true,
76:       comparePassword: vi.fn().mockResolvedValue(false),
77:     };
78:     vi.spyOn(Superadmin, "findOne").mockReturnValue({
79:       select: vi.fn().mockResolvedValue(fake),
80:     });
81: 
82:     const res = mockRes();
83:     await loginSuperadmin(
84:       { body: { email: "superadmin@cue.dev", password: "wrong" } },
85:       res,
86:       vi.fn(),
87:     );
88:     expect(res.status).toHaveBeenCalledWith(401);
89:   });
90: 
91:   it("getPlatformMe returns the protect-loaded Superadmin profile", async () => {
92:     const res = mockRes();
93:     await getPlatformMe(
94:       {
95:         user: {
96:           _id: "64b000000000000000000001",
97:           name: "Platform Ops",
98:           email: "superadmin@cue.dev",
99:         },
100:         role: "superadmin",
101:       },
102:       res,
103:       vi.fn(),
104:     );
105:     const payload = res.json.mock.calls[0][0];
106:     expect(payload.data).toMatchObject({
107:       email: "superadmin@cue.dev",
108:       role: "superadmin",
109:     });
110:   });
111: });
112: 
113: describe("platformKeyRequest — reviewedBy is Superadmin", () => {
114:   beforeEach(() => {
115:     vi.clearAllMocks();
116:   });
117: 
118:   it("approve stamps reviewedBy with the superadmin user id", async () => {
119:     const superadminId = "64b000000000000000000001";
120:     const request = {
121:       _id: "64b0000000000000000000aa",
122:       bankName: "acme",
123:       status: "pending",
124:       scopes: ["tickets:read"],
125:       rateLimit: 100,
126:       label: "prod",
127:       save: vi.fn().mockResolvedValue(true),
128:     };
129:     vi.spyOn(ApiKeyRequest, "findById").mockResolvedValue(request);
130:     vi.spyOn(ApiKey, "generateKey").mockResolvedValue({
131:       rawKey: "cue_raw",
132:       keyHash: "hash",
133:       keyPrefix: "cue_abcd",
134:     });
135:     vi.spyOn(ApiKey, "create").mockResolvedValue({
136:       _id: "64b0000000000000000000bb",
137:       keyPrefix: "cue_abcd",
138:       scopes: ["tickets:read"],
139:       rateLimit: 100,
140:     });
141: 
142:     const res = mockRes();
143:     const next = vi.fn();
144:     await reviewKeyRequest(
145:       {
146:         params: { id: "64b0000000000000000000aa" },
147:         body: { action: "approve", reviewNote: "ok" },
148:         user: { _id: superadminId, role: "superadmin" },
149:       },
150:       res,
151:       next,
152:     );
153: 
154:     expect(next).not.toHaveBeenCalled();
155:     expect(request.reviewedBy).toBe(superadminId);
156:     expect(request.status).toBe("approved");
157:     expect(request.encryptedRawKey).toBeTruthy();
158:     expect(request.save).toHaveBeenCalled();
159:     const payload = res.json.mock.calls[0][0];
160:     expect(payload.data.key).toBe("cue_raw");
161:   });
162: 
163:   it("reject stamps reviewedBy and does not create a key", async () => {
164:     const request = {
165:       _id: "64b0000000000000000000aa",
166:       bankName: "acme",
167:       status: "pending",
168:       save: vi.fn().mockResolvedValue(true),
169:     };
170:     vi.spyOn(ApiKeyRequest, "findById").mockResolvedValue(request);
171:     const createSpy = vi.spyOn(ApiKey, "create");
172: 
173:     const res = mockRes();
174:     await reviewKeyRequest(
175:       {
176:         params: { id: "64b0000000000000000000aa" },
177:         body: { action: "reject", reviewNote: "no" },
178:         user: { _id: "64b000000000000000000001", role: "superadmin" },
179:       },
180:       res,
181:       vi.fn(),
182:     );
183: 
184:     expect(request.status).toBe("rejected");
185:     expect(request.reviewedBy).toBe("64b000000000000000000001");
186:     expect(createSpy).not.toHaveBeenCalled();
187:   });
188: });
189: 
190: describe("v1 router — api-key-requests removed (WP8)", () => {
191:   it("does not mount /api-key-requests", () => {
192:     const stack = (v1Router.stack || []).map((layer) => ({
193:       name: layer.name,
194:       path: layer.route?.path,
195:       regexp: String(layer.regexp || ""),
196:     }));
197:     const mounts = stack.filter(
198:       (l) => l.path && String(l.path).includes("api-key-request"),
199:     );
200:     const regexpHits = stack.filter((l) =>
201:       l.regexp.includes("api-key-request"),
202:     );
203:     expect(mounts).toHaveLength(0);
204:     expect(regexpHits).toHaveLength(0);
205:   });
206: });

(End of file - total 206 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js</path>
<type>file</type>
<content>
1: import { Router } from "express";
2: import { body, param, validationResult } from "express-validator";
3: import ApiKeyRequest from "../models/apiKeyRequest.model.js";
4: import ApiKey from "../models/apiKey.model.js";
5: import { sendSuccess, sendError } from "../utils/response.js";
6: import { parsePagination, paginatedResponse } from "../utils/pagination.js";
7: import { decryptKey } from "../utils/keyWrap.js";
8: import { protect, authorize } from "../middlewares/auth.middleware.js";
9: 
10: /**
11:  * Bank-admin API key request routes — JWT-authenticated (Phase 13 WP4).
12:  *
13:  * Same behavior as the v1 API-key version, but identity comes from the
14:  * admin's JWT (`req.user`) instead of the API key header. This is the
15:  * path the dashboard will use once WP6 moves it off v1.
16:  *
17:  * bankName is ALWAYS forced from Admin.bank (never from the body).
18:  *
19:  * One-time reveal:
20:  *   GET /api/admin/api-key-requests/:id
21:  *   If status=approved and bankKeyRevealedAt is null, returns the raw key
22:  *   (decrypted from the staged ciphertext), wipes ciphertext, and sets
23:  *   bankKeyRevealedAt. Subsequent GETs return metadata only (no raw key).
24:  */
25: const router = Router();
26: 
27: const BANK_REQUESTABLE_SCOPES = [
28:   "branches:read",
29:   "tickets:read",
30:   "tickets:write",
31:   "staff:read",
32:   "analytics:read",
33:   "webhooks:manage",
34:   // "admin" is reserved for superadmin-created keys only.
35: ];
36: 
37: /**
38:  * Live health of the linked ApiKey for the bank admin's status list.
39:  * - not approved yet → null
40:  * - approved but ApiKey missing/deleted → "revoked" (superadmin revoke)
41:  * - ApiKey.isActive false → "suspended"
42:  * - else → "active"
43:  */
44: export const resolveKeyStatus = (request, keyDoc) => {
45:   if (request.status !== "approved") return null;
46:   if (!request.apiKey || !keyDoc) return "revoked";
47:   return keyDoc.isActive ? "active" : "suspended";
48: };
49: 
50: /**
51:  * Safe list/detail item — ciphertext is never included in JSON.
52:  * canRevealKey needs encryptedRawKey present on the in-memory doc
53:  * (do NOT select it out before this call).
54:  */
55: export const mapBankKeyRequest = (r, keyDoc = null) => ({
56:   id: r._id,
57:   bankName: r.bankName,
58:   label: r.label,
59:   scopes: r.scopes,
60:   rateLimit: r.rateLimit,
61:   status: r.status,
62:   reviewNote: r.reviewNote,
63:   apiKey: r.apiKey,
64:   canRevealKey:
65:     r.status === "approved" &&
66:     !!r.encryptedRawKey &&
67:     !r.bankKeyRevealedAt,
68:   revealedAt: r.bankKeyRevealedAt,
69:   keyStatus: resolveKeyStatus(r, keyDoc),
70:   keyPrefix: keyDoc?.keyPrefix || null,
71:   createdAt: r.createdAt,
72: });
73: 
74: // Only bank admins may request keys for their bank.
75: router.use(protect, authorize("admin"));
76: 
77: /**
78:  * POST /api/admin/api-key-requests
79:  * Body: { label?, scopes?, rateLimit? }
80:  */
81: router.post(
82:   "/",
83:   body("label")
84:     .optional()
85:     .trim()
86:     .isLength({ max: 200 })
87:     .withMessage("Label must be under 200 characters"),
88:   body("scopes")
89:     .optional()
90:     .isArray({ min: 1 })
91:     .withMessage("Scopes must be a non-empty array")
92:     .custom((scopes) => {
93:       const invalid = scopes.filter((s) => !BANK_REQUESTABLE_SCOPES.includes(s));
94:       if (invalid.length > 0) {
95:         throw new Error(
96:           `Scope(s) not requestable by bank admin: ${invalid.join(", ")}`,
97:         );
98:       }
99:       return true;
100:     }),
101:   body("rateLimit")
102:     .optional()
103:     .isInt({ min: 1, max: 10000 })
104:     .withMessage("Rate limit must be between 1 and 10,000"),
105:   async (req, res, next) => {
106:     try {
107:       const errors = validationResult(req);
108:       if (!errors.isEmpty()) {
109:         return sendError(res, {
110:           statusCode: 400,
111:           message: "Validation failed",
112:           errors: errors.array().map((e) => e.msg),
113:         });
114:       }
115: 
116:       // Bank scope always comes from the JWT identity (Admin.bank).
117:       const bankName = req.user.bank;
118:       if (!bankName) {
119:         return sendError(res, {
120:           statusCode: 400,
121:           message: "Admin has no bank — cannot request API keys",
122:         });
123:       }
124: 
125:       // Prevent duplicate pending requests for the same bank.
126:       const existingPending = await ApiKeyRequest.findOne({
127:         bankName,
128:         status: "pending",
129:       });
130:       if (existingPending) {
131:         return sendError(res, {
132:           statusCode: 409,
133:           message: "You already have a pending API key request",
134:         });
135:       }
136: 
137:       const { label, scopes, rateLimit } = req.body;
138: 
139:       const request = await ApiKeyRequest.create({
140:         bankName,
141:         // Admin collection ref (WP1 changed requestedBy → Admin).
142:         requestedBy: req.user._id,
143:         label: label || "",
144:         scopes: scopes?.length
145:           ? scopes
146:           : ["branches:read", "tickets:read", "tickets:write"],
147:         rateLimit: rateLimit || 100,
148:         status: "pending",
149:       });
150: 
151:       return sendSuccess(res, {
152:         statusCode: 201,
153:         message: "API key request submitted for superadmin review",
154:         data: {
155:           id: request._id,
156:           bankName: request.bankName,
157:           label: request.label,
158:           scopes: request.scopes,
159:           rateLimit: request.rateLimit,
160:           status: request.status,
161:           createdAt: request.createdAt,
162:         },
163:       });
164:     } catch (error) {
165:       next(error);
166:     }
167:   },
168: );
169: 
170: /**
171:  * GET /api/admin/api-key-requests
172:  * List this admin's bank requests (metadata only; ciphertext never included).
173:  *
174:  * Loads encryptedRawKey only so canRevealKey can be computed, then strips
175:  * it from the JSON payload. Also joins ApiKey for keyStatus (active /
176:  * suspended / revoked) so revoke/suspend shows up for the bank admin.
177:  */
178: router.get("/", async (req, res, next) => {
179:   try {
180:     const bankName = req.user.bank;
181:     if (!bankName) {
182:       return sendError(res, {
183:         statusCode: 400,
184:         message: "Admin has no bank — cannot list API key requests",
185:       });
186:     }
187: 
188:     const { page, limit, skip } = parsePagination(req.query);
189:     const filter = { bankName };
190: 
191:     const [requests, total] = await Promise.all([
192:       ApiKeyRequest.find(filter)
193:         .sort("-createdAt")
194:         .skip(skip)
195:         .limit(limit),
196:       ApiKeyRequest.countDocuments(filter),
197:     ]);
198: 
199:     // Batch-load linked keys (missing doc → revoked after superadmin delete).
200:     const keyIds = requests.map((r) => r.apiKey).filter(Boolean);
201:     const keys = keyIds.length
202:       ? await ApiKey.find({ _id: { $in: keyIds } })
203:           .select("keyPrefix isActive")
204:           .lean()
205:       : [];
206:     const keyById = new Map(keys.map((k) => [String(k._id), k]));
207: 
208:     const data = requests.map((r) =>
209:       mapBankKeyRequest(r, r.apiKey ? keyById.get(String(r.apiKey)) : null),
210:     );
211: 
212:     return sendSuccess(res, {
213:       statusCode: 200,
214:       message: "API key requests fetched",
215:       data: paginatedResponse(data, total, page, limit),
216:     });
217:   } catch (error) {
218:     next(error);
219:   }
220: });
221: 
222: /**
223:  * GET /api/admin/api-key-requests/:id
224:  * One-time raw-key reveal for an approved request (bank-scoped by JWT).
225:  */
226: router.get(
227:   "/:id",
228:   param("id").isMongoId().withMessage("Invalid request ID"),
229:   async (req, res, next) => {
230:     try {
231:       const errors = validationResult(req);
232:       if (!errors.isEmpty()) {
233:         return sendError(res, {
234:           statusCode: 400,
235:           message: "Validation failed",
236:           errors: errors.array().map((e) => e.msg),
237:         });
238:       }
239: 
240:       const bankName = req.user.bank;
241:       if (!bankName) {
242:         return sendError(res, {
243:           statusCode: 400,
244:           message: "Admin has no bank — cannot fetch API key requests",
245:         });
246:       }
247: 
248:       // Always scope the lookup to this bank — never leak another bank's request.
249:       // Keep encryptedRawKey on the doc only long enough to attempt reveal;
250:       // it is stripped from the response payload via mapBankKeyRequest.
251:       const request = await ApiKeyRequest.findOne({
252:         _id: req.params.id,
253:         bankName,
254:       });
255: 
256:       if (!request) {
257:         return sendError(res, { statusCode: 404, message: "Request not found" });
258:       }
259: 
260:       let rawKey = null;
261:       let justRevealed = false;
262: 
263:       if (request.status === "approved" && !request.bankKeyRevealedAt) {
264:         if (request.encryptedRawKey) {
265:           try {
266:             rawKey = decryptKey(request.encryptedRawKey);
267:             // Wipe ciphertext permanently after successful decrypt.
268:             await ApiKeyRequest.updateOne(
269:               { _id: request._id },
270:               {
271:                 $set: { bankKeyRevealedAt: new Date() },
272:                 $unset: { encryptedRawKey: 1 },
273:               },
274:             );
275:             justRevealed = true;
276:             // In-memory wipe so the response mapper can't leak ciphertext.
277:             request.encryptedRawKey = null;
278:             request.bankKeyRevealedAt = new Date();
279:           } catch {
280:             // Decryption failed (wrong secret / corruption) — don't leak internals.
281:             rawKey = null;
282:           }
283:         }
284:       }
285: 
286:       let keyDoc = null;
287:       if (request.apiKey) {
288:         keyDoc = await ApiKey.findById(request.apiKey)
289:           .select("keyPrefix isActive")
290:           .lean();
291:       }
292: 
293:       const mapped = mapBankKeyRequest(request, keyDoc);
294: 
295:       return sendSuccess(res, {
296:         statusCode: 200,
297:         message: justRevealed
298:           ? "API key revealed — copy it now, it won't be shown again"
299:           : "API key request fetched",
300:         data: {
301:           ...mapped,
302:           // Raw key only on the one-time reveal; null afterwards.
303:           key: rawKey,
304:         },
305:       });
306:     } catch (error) {
307:       next(error);
308:     }
309:   },
310: );
311: 
312: export default router;

(End of file - total 312 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js</path>
<type>file</type>
<content>
1: import ApiKey from "../../models/apiKey.model.js";
2: import ApiKeyRequest from "../../models/apiKeyRequest.model.js";
3: import { sendSuccess, sendError } from "../../utils/response.js";
4: import { parsePagination, paginatedResponse } from "../../utils/pagination.js";
5: import { validationResult } from "express-validator";
6: 
7: /**
8:  * Platform API key controller — superadmin-only key lifecycle.
9:  *
10:  * Replaces the old /api/v1/api-keys routes (authorize("admin")) which
11:  * let ANY bank admin see ALL banks' keys — a multi-tenancy hole.
12:  *
13:  * The raw API key is only returned ONCE — at creation or rotation.
14:  * Bank admins never call these endpoints; they submit ApiKeyRequests on
15:  * JWT /api/admin/api-key-requests instead.
16:  */
17: 
18: const handleValidation = (req, res) => {
19:   const errors = validationResult(req);
20:   if (!errors.isEmpty()) {
21:     sendError(res, {
22:       statusCode: 400,
23:       message: "Validation failed",
24:       errors: errors.array().map((e) => e.msg),
25:     });
26:     return false;
27:   }
28:   return true;
29: };
30: 
31: /**
32:  * POST /api/platform/api-keys
33:  * Create a key for a bank. Returns raw key ONCE.
34:  */
35: export const createApiKey = async (req, res, next) => {
36:   try {
37:     if (!handleValidation(req, res)) return;
38: 
39:     const { bankName, label, scopes, rateLimit, expiresAt } = req.body;
40:     const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();
41: 
42:     const apiKey = await ApiKey.create({
43:       bankName,
44:       label: label || "",
45:       keyHash,
46:       keyPrefix,
47:       scopes: scopes || ["branches:read", "tickets:read"],
48:       rateLimit: rateLimit || 100,
49:       expiresAt: expiresAt || null,
50:     });
51: 
52:     return sendSuccess(res, {
53:       statusCode: 201,
54:       message: "API key created. Copy it now — it won't be shown again.",
55:       data: {
56:         id: apiKey._id,
57:         bankName: apiKey.bankName,
58:         label: apiKey.label,
59:         key: rawKey,
60:         keyPrefix: apiKey.keyPrefix,
61:         scopes: apiKey.scopes,
62:         rateLimit: apiKey.rateLimit,
63:         isActive: apiKey.isActive,
64:         requestCount: apiKey.requestCount || 0,
65:         expiresAt: apiKey.expiresAt,
66:         createdAt: apiKey.createdAt,
67:       },
68:     });
69:   } catch (error) {
70:     next(error);
71:   }
72: };
73: 
74: /**
75:  * GET /api/platform/api-keys
76:  * List all keys across banks (metadata only, no hash/raw key).
77:  */
78: export const listApiKeys = async (req, res, next) => {
79:   try {
80:     const { page, limit, skip } = parsePagination(req.query);
81: 
82:     const filter = {};
83:     if (req.query.bankName) {
84:       filter.bankName = { $regex: req.query.bankName, $options: "i" };
85:     }
86:     if (req.query.isActive !== undefined) {
87:       filter.isActive = req.query.isActive === "true";
88:     }
89: 
90:     const [keys, total] = await Promise.all([
91:       ApiKey.find(filter)
92:         .select("-keyHash")
93:         .sort("-createdAt")
94:         .skip(skip)
95:         .limit(limit),
96:       ApiKey.countDocuments(filter),
97:     ]);
98: 
99:     return sendSuccess(res, {
100:       statusCode: 200,
101:       message: "API keys fetched",
102:       data: paginatedResponse(keys, total, page, limit),
103:     });
104:   } catch (error) {
105:     next(error);
106:   }
107: };
108: 
109: /**
110:  * DELETE /api/platform/api-keys/:id
111:  * Permanently revoke (delete) a key.
112:  * Also wipes any staged reveal ciphertext on linked ApiKeyRequests so a
113:  * bank admin can't reveal a key that no longer exists; the list endpoint
114:  * then reports keyStatus: "revoked" (ApiKey doc is gone).
115:  */
116: export const deleteApiKey = async (req, res, next) => {
117:   try {
118:     if (!handleValidation(req, res)) return;
119: 
120:     const key = await ApiKey.findByIdAndDelete(req.params.id);
121:     if (!key) {
122:       return sendError(res, { statusCode: 404, message: "API key not found" });
123:     }
124: 
125:     // Clear dual-reveal ciphertext staged at approval time.
126:     await ApiKeyRequest.updateMany(
127:       { apiKey: key._id },
128:       { $unset: { encryptedRawKey: 1, rawKeyStagedAt: 1 } },
129:     );
130: 
131:     return sendSuccess(res, {
132:       statusCode: 200,
133:       message: `API key for "${key.bankName}" has been permanently revoked`,
134:     });
135:   } catch (error) {
136:     next(error);
137:   }
138: };
139: 
140: /**
141:  * POST /api/platform/api-keys/:id/rotate
142:  * Rotate a key: new key generated, old key valid for 24h grace period.
143:  * Raw key returned ONCE to superadmin only (bank admin does NOT get a
144:  * rotation reveal — approval-time reveal only).
145:  */
146: export const rotateApiKey = async (req, res, next) => {
147:   try {
148:     if (!handleValidation(req, res)) return;
149: 
150:     const oldKey = await ApiKey.findById(req.params.id);
151:     if (!oldKey) {
152:       return sendError(res, { statusCode: 404, message: "API key not found" });
153:     }
154: 
155:     const { rawKey, keyHash, keyPrefix } = await ApiKey.generateKey();
156: 
157:     oldKey.keyHash = keyHash;
158:     oldKey.keyPrefix = keyPrefix;
159:     oldKey.gracePeriodEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
160:     await oldKey.save();
161: 
162:     return sendSuccess(res, {
163:       statusCode: 200,
164:       message:
165:         "API key rotated. New key shown below. Old key valid for 24 hours.",
166:       data: {
167:         id: oldKey._id,
168:         bankName: oldKey.bankName,
169:         label: oldKey.label,
170:         key: rawKey,
171:         keyPrefix: oldKey.keyPrefix,
172:         oldKeyValidUntil: oldKey.gracePeriodEndsAt,
173:         scopes: oldKey.scopes,
174:         rateLimit: oldKey.rateLimit,
175:       },
176:     });
177:   } catch (error) {
178:     next(error);
179:   }
180: };
181: 
182: /**
183:  * PATCH /api/platform/api-keys/:id/toggle
184:  * Suspend (disable) or re-enable a key without deleting it.
185:  */
186: export const toggleApiKey = async (req, res, next) => {
187:   try {
188:     if (!handleValidation(req, res)) return;
189: 
190:     const key = await ApiKey.findByIdAndUpdate(
191:       req.params.id,
192:       [{ $set: { isActive: { $not: "$isActive" } } }],
193:       { returnDocument: "after" },
194:     ).select("-keyHash");
195: 
196:     if (!key) {
197:       return sendError(res, { statusCode: 404, message: "API key not found" });
198:     }
199: 
200:     return sendSuccess(res, {
201:       statusCode: 200,
202:       message: `API key ${key.isActive ? "enabled" : "suspended"}`,
203:       data: key,
204:     });
205:   } catch (error) {
206:     next(error);
207:   }
208: };

(End of file - total 208 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx</path>
<type>file</type>
<content>
1: import { useCallback, useEffect, useState } from "react";
2: import { motion } from "framer-motion";
3: import { useAuth } from "../../features/auth/AuthContext";
4: import {
5:   fetchAdminOverview,
6:   createBranch,
7: } from "../../features/staff/adminApi";
8: import {
9:   requestApiKey,
10:   fetchApiKeyRequests,
11:   revealApiKeyRequest,
12: } from "../../features/staff/apiKeyRequestApi";
13: import { ApiError } from "../../lib/apiClient";
14: import styles from "./StaffHome.module.css";
15: 
16: // Scopes a bank admin may request (admin scope is superadmin-only).
17: const REQUESTABLE_SCOPES = [
18:   "branches:read",
19:   "tickets:read",
20:   "tickets:write",
21:   "staff:read",
22:   "analytics:read",
23:   "webhooks:manage",
24: ];
25: 
26: /**
27:  * AdminOverview — cross-branch dashboard for bank-scoped admin role.
28:  * Shows all branches (this bank only), all managers with staff counts,
29:  * a form to create branches, and the API key request panel
30:  * (request new key + view status / one-time reveal).
31:  *
32:  * Manager creation lives on Manage → Managers (POST /managers).
33:  */
34: const AdminOverview = () => {
35:   const { auth } = useAuth();
36:   const [data, setData] = useState(null);
37:   const [loading, setLoading] = useState(true);
38:   const [error, setError] = useState(null);
39: 
40:   // Branch creation form
41:   const [branchForm, setBranchForm] = useState({ name: "", location: "" });
42:   const [branchFormError, setBranchFormError] = useState(null);
43:   const [branchSubmitting, setBranchSubmitting] = useState(false);
44: 
45:   // API key request state
46:   const [keyRequests, setKeyRequests] = useState([]);
47:   const [keyForm, setKeyForm] = useState({
48:     label: "",
49:     rateLimit: 100,
50:     scopes: ["branches:read", "tickets:read", "tickets:write"],
51:   });
52:   const [keyFormError, setKeyFormError] = useState(null);
53:   const [keySubmitting, setKeySubmitting] = useState(false);
54:   const [adminRevealKey, setAdminRevealKey] = useState(null); // one-time raw key display
55: 
56:   const load = useCallback(async () => {
57:     try {
58:       // JWT admin overview — bank scope from Admin.bank server-side (WP6).
59:       const res = await fetchAdminOverview(auth.token);
60:       setData(res.data);
61:       setError(null);
62:     } catch (err) {
63:       setError(err.message || "Couldn't load admin overview.");
64:     } finally {
65:       setLoading(false);
66:     }
67:   }, [auth.token]);
68: 
69:   const loadKeyRequests = useCallback(async () => {
70:     try {
71:       const res = await fetchApiKeyRequests(auth.token);
72:       // paginatedResponse nests under data: { data: [...], meta }
73:       setKeyRequests(res.data?.data || res.data?.items || []);
74:     } catch {
75:       // Non-fatal — request panel just stays empty.
76:       setKeyRequests([]);
77:     }
78:   }, [auth.token]);
79: 
80:   useEffect(() => {
81:     load();
82:     loadKeyRequests();
83:   }, [load, loadKeyRequests]);
84: 
85:   const handleBranchChange = (field) => (e) =>
86:     setBranchForm((f) => ({ ...f, [field]: e.target.value }));
87: 
88:   const handleCreateBranch = async (e) => {
89:     e.preventDefault();
90:     setBranchFormError(null);
91:     setBranchSubmitting(true);
92:     try {
93:       await createBranch(branchForm, auth.token);
94:       setBranchForm({ name: "", location: "" });
95:       await load();
96:     } catch (err) {
97:       setBranchFormError(
98:         err instanceof ApiError ? err.message : "Couldn't create branch.",
99:       );
100:     } finally {
101:       setBranchSubmitting(false);
102:     }
103:   };
104: 
105:   // ── API key request handlers ──────────────────────────────
106:   const toggleScope = (scope) =>
107:     setKeyForm((f) => ({
108:       ...f,
109:       scopes: f.scopes.includes(scope)
110:         ? f.scopes.filter((s) => s !== scope)
111:         : [...f.scopes, scope],
112:     }));
113: 
114:   const handleRequestKey = async (e) => {
115:     e.preventDefault();
116:     setKeyFormError(null);
117:     if (keyForm.scopes.length === 0) {
118:       setKeyFormError("Select at least one scope.");
119:       return;
120:     }
121:     setKeySubmitting(true);
122:     try {
123:       await requestApiKey(keyForm, auth.token);
124:       setKeyForm({
125:         label: "",
126:         rateLimit: 100,
127:         scopes: ["branches:read", "tickets:read", "tickets:write"],
128:       });
129:       await loadKeyRequests();
130:     } catch (err) {
131:       setKeyFormError(
132:         err instanceof ApiError
133:           ? err.errors?.join(", ") || err.message
134:           : "Couldn't submit request.",
135:       );
136:     } finally {
137:       setKeySubmitting(false);
138:     }
139:   };
140: 
141:   const handleRevealKey = async (id) => {
142:     try {
143:       const res = await revealApiKeyRequest(id, auth.token);
144:       if (res.data?.key) {
145:         setAdminRevealKey({ id, key: res.data.key });
146:       } else {
147:         setKeyFormError("Key already revealed previously.");
148:       }
149:       await loadKeyRequests();
150:     } catch (err) {
151:       setKeyFormError(err.message || "Couldn't reveal key.");
152:     }
153:   };
154: 
155:   if (loading) return <p className={styles.mgmtStatus}>Loading overview…</p>;
156:   if (error) return <p className={styles.mgmtStatusError}>{error}</p>;
157:   if (!data) return null;
158: 
159:   return (
160:     <motion.div
161:       initial={{ opacity: 0, y: 12 }}
162:       animate={{ opacity: 1, y: 0 }}
163:       transition={{ duration: 0.4 }}
164:     >
165:       {/* ── Summary Cards ─────────────────────────── */}
166:       <div className={styles.ovStatRow}>
167:         <div className={styles.ovStatCard}>
168:           <span className={styles.ovStatValue}>{data.summary.totalBranches}</span>
169:           <span className={styles.ovStatLabel}>branches</span>
170:         </div>
171:         <div className={styles.ovStatCard}>
172:           <span className={styles.ovStatValue}>{data.summary.totalManagers}</span>
173:           <span className={styles.ovStatLabel}>managers</span>
174:         </div>
175:         <div className={styles.ovStatCard}>
176:           <span className={styles.ovStatValue}>{data.summary.totalStaff}</span>
177:           <span className={styles.ovStatLabel}>total staff</span>
178:         </div>
179:       </div>
180: 
181:       {/* ── Branches List ─────────────────────────── */}
182:       <div className={styles.mgmtSubHeading}>Branches</div>
183:       {data.branches.length === 0 && (
184:         <p className={styles.mgmtStatus}>No branches yet.</p>
185:       )}
186:       {data.branches.map((b) => (
187:         <div key={b.id} className={styles.mgmtRow}>
188:           <div>
189:             <div className={styles.mgmtRowTitle}>{b.name}</div>
190:             <div className={styles.mgmtRowSub}>{b.location || "No location"}</div>
191:           </div>
192:           <div className={styles.mgmtRowActions}>
193:             <span
194:               className={b.dayOpen ? styles.mgmtBadgeOpen : styles.mgmtBadgeClosed}
195:             >
196:               {b.dayOpen ? "Open" : "Closed"}
197:             </span>
198:           </div>
199:         </div>
200:       ))}
201: 
202:       {/* ── Create Branch Form ─────────────────────── */}
203:       <div className={styles.mgmtSubHeading}>Add branch</div>
204:       <form onSubmit={handleCreateBranch} className={styles.mgmtInlineForm}>
205:         <input
206:           required
207:           placeholder="Branch name"
208:           value={branchForm.name}
209:           onChange={handleBranchChange("name")}
210:         />
211:         <input
212:           placeholder="Location"
213:           value={branchForm.location}
214:           onChange={handleBranchChange("location")}
215:         />
216:         {branchFormError && (
217:           <p className={styles.mgmtStatusError}>{branchFormError}</p>
218:         )}
219:         <button
220:           type="submit"
221:           className={styles.mgmtSubmitBtn}
222:           disabled={branchSubmitting}
223:         >
224:           {branchSubmitting ? "Adding…" : "Add branch"}
225:         </button>
226:       </form>
227: 
228:       {/* ── Managers List ──────────────────────────── */}
229:       <div className={styles.mgmtSubHeading}>Managers</div>
230:       {data.managers.length === 0 && (
231:         <p className={styles.mgmtStatus}>
232:           No managers yet. Create one under Manage → Managers.
233:         </p>
234:       )}
235:       {data.managers.map((m) => (
236:         <div key={m.id} className={styles.mgmtRow}>
237:           <div>
238:             <div className={styles.mgmtRowTitle}>{m.name}</div>
239:             <div className={styles.mgmtRowSub}>
240:               {m.email}
241:               {m.branch && <> · {m.branch.name}</>}
242:             </div>
243:           </div>
244:           <div className={styles.mgmtRowActions}>
245:             <span className={styles.ovStaffCount}>
246:               {m.staffCount} staff
247:             </span>
248:           </div>
249:         </div>
250:       ))}
251: 
252:       {/* ── API Key Request Panel ─────────────────────── */}
253:       <div className={styles.mgmtSubHeading}>API key access</div>
254:       <p className={styles.mgmtStatus}>
255:         Request an API key for your bank. After superadmin approval, reveal
256:         it once here and send it on your systems as{" "}
257:         <code>X-API-Key: cue_…</code> to <code>/api/v1/*</code>. The Cue
258:         dashboard itself uses your JWT login — not this key.
259:       </p>
260: 
261:       <form onSubmit={handleRequestKey} className={styles.mgmtInlineForm}>
262:         <input
263:           placeholder="Label (e.g. Core banking backend)"
264:           value={keyForm.label}
265:           onChange={(e) =>
266:             setKeyForm((f) => ({ ...f, label: e.target.value }))
267:           }
268:         />
269:         <input
270:           type="number"
271:           min={1}
272:           max={10000}
273:           title="Rate limit (requests/min)"
274:           placeholder="Rate limit"
275:           value={keyForm.rateLimit}
276:           onChange={(e) =>
277:             setKeyForm((f) => ({
278:               ...f,
279:               rateLimit: parseInt(e.target.value, 10) || 100,
280:             }))
281:           }
282:           style={{ maxWidth: 140 }}
283:         />
284:         <div className={styles.scopeChips}>
285:           {REQUESTABLE_SCOPES.map((scope) => (
286:             <button
287:               type="button"
288:               key={scope}
289:               className={
290:                 keyForm.scopes.includes(scope)
291:                   ? styles.scopeChipActive
292:                   : styles.scopeChip
293:               }
294:               onClick={() => toggleScope(scope)}
295:             >
296:               {scope}
297:             </button>
298:           ))}
299:         </div>
300:         {keyFormError && (
301:           <p className={styles.mgmtStatusError}>{keyFormError}</p>
302:         )}
303:         <button
304:           type="submit"
305:           className={styles.mgmtSubmitBtn}
306:           disabled={keySubmitting}
307:         >
308:           {keySubmitting ? "Submitting…" : "Request API key"}
309:         </button>
310:       </form>
311: 
312:       {/* One-time raw key reveal modal */}
313:       {adminRevealKey && (
314:         <div className={styles.keyModalBackdrop}>
315:           <div className={styles.keyModal}>
316:             <h4>Your API key</h4>
317:             <div className={styles.rawKeyBox}>
318:               <code>{adminRevealKey.key}</code>
319:               <button
320:                 type="button"
321:                 className={styles.scopeChip}
322:                 onClick={() => navigator.clipboard?.writeText(adminRevealKey.key)}
323:               >
324:                 Copy
325:               </button>
326:             </div>
327:             <p className={styles.mgmtStatusError} style={{ background: "none", padding: 0 }}>
328:               This is the only time this key will be shown. Store it securely.
329:             </p>
330:             <button
331:               type="button"
332:               className={styles.mgmtSubmitBtn}
333:               onClick={() => setAdminRevealKey(null)}
334:             >
335:               I've saved it
336:             </button>
337:           </div>
338:         </div>
339:       )}
340: 
341:       <div className={styles.mgmtSubHeading}>Request status</div>
342:       {keyRequests.length === 0 && (
343:         <p className={styles.mgmtStatus}>No API key requests yet.</p>
344:       )}
345:       {keyRequests.map((r) => (
346:         <div key={r.id} className={styles.mgmtRow}>
347:           <div>
348:             <div className={styles.mgmtRowTitle}>
349:               {r.label || "API key request"}
350:             </div>
351:             <div className={styles.mgmtRowSub}>
352:               scopes: {r.scopes?.join(", ")} · {r.rateLimit}/min ·{" "}
353:               {new Date(r.createdAt).toLocaleString()}
354:               {r.keyPrefix ? ` · ends in ${r.keyPrefix}` : ""}
355:               {r.reviewNote ? ` · note: ${r.reviewNote}` : ""}
356:             </div>
357:           </div>
358:           <div className={styles.mgmtRowActions}>
359:             <span
360:               className={
361:                 r.status === "approved"
362:                   ? styles.mgmtBadgeOpen
363:                   : r.status === "rejected"
364:                     ? styles.mgmtBadgeClosed
365:                     : styles.mgmtBadgePending
366:               }
367:             >
368:               {r.status}
369:             </span>
370:             {r.status === "approved" && r.keyStatus && (
371:               <span
372:                 className={
373:                   r.keyStatus === "active"
374:                     ? styles.mgmtBadgeOpen
375:                     : r.keyStatus === "suspended"
376:                       ? styles.mgmtBadgePending
377:                       : styles.mgmtBadgeClosed
378:                 }
379:                 title={
380:                   r.keyStatus === "revoked"
381:                     ? "Key revoked by platform — integration calls will be rejected"
382:                     : r.keyStatus === "suspended"
383:                       ? "Key temporarily disabled by platform"
384:                       : "Key is active for X-API-Key integration calls"
385:                 }
386:               >
387:                 {r.keyStatus}
388:               </span>
389:             )}
390:             {r.canRevealKey && (
391:               <button
392:                 type="button"
393:                 className={styles.mgmtSubmitBtn}
394:                 onClick={() => handleRevealKey(r.id)}
395:               >
396:                 Reveal key
397:               </button>
398:             )}
399:           </div>
400:         </div>
401:       ))}
402:     </motion.div>
403:   );
404: };
405: 
406: export default AdminOverview;

(End of file - total 406 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css</path>
<type>file</type>
<content>
1: .page {
2:   min-height: 85vh;
3:   background: var(--paper);
4:   padding: 4rem 1.5rem;
5: }
6: 
7: .container {
8:   max-width: 780px;
9:   margin: 0 auto;
10: }
11: 
12: .headerRow {
13:   display: flex;
14:   align-items: flex-start;
15:   justify-content: space-between;
16:   gap: 1rem;
17:   margin-bottom: 2rem;
18: }
19: 
20: .logoHeader {
21:   display: flex;
22:   align-items: center;
23:   gap: 0.6rem;
24:   margin-bottom: 1.5rem;
25: }
26: .logoHeader img {
27:   width: 40px;
28:   height: 40px;
29: }
30: .logoHeader span {
31:   font-family: var(--font-display);
32:   font-weight: 700;
33:   font-size: 1.35rem;
34:   color: var(--paper-ink);
35: }
36: 
37: .eyebrow {
38:   font-family: var(--font-mono);
39:   color: var(--brand-accent);
40:   font-size: 0.85rem;
41:   letter-spacing: 0.08em;
42:   text-transform: uppercase;
43:   margin-bottom: 0.75rem;
44: }
45: 
46: .heading {
47:   font-size: var(--step-3);
48: }
49: 
50: .headerActions {
51:   display: flex;
52:   align-items: center;
53:   gap: 0.75rem;
54:   flex-shrink: 0;
55: }
56: 
57: .settingsLink,
58: .boardLink {
59:   padding: 0.6rem 1.1rem;
60:   border-radius: 100px;
61:   font-weight: 600;
62:   font-size: 0.85rem;
63:   color: var(--ink);
64:   box-shadow: inset 0 0 0 1px var(--paper-soft);
65:   transition: box-shadow 0.2s ease;
66:   text-decoration: none;
67: }
68: 
69: .settingsLink:hover,
70: .boardLink:hover {
71:   box-shadow: inset 0 0 0 2px var(--ink);
72: }
73: 
74: .logoutBtn {
75:   padding: 0.6rem 1.1rem;
76:   background: var(--ink);
77:   color: var(--paper);
78:   border-radius: 100px;
79:   font-weight: 600;
80:   font-size: 0.85rem;
81:   flex-shrink: 0;
82: }
83: 
84: .statRow {
85:   display: flex;
86:   gap: 1rem;
87:   margin-bottom: 2rem;
88: }
89: 
90: .statCard {
91:   background: var(--paper-raised);
92:   border-radius: 12px;
93:   padding: 1.25rem 1.5rem;
94:   display: flex;
95:   flex-direction: column;
96:   gap: 0.3rem;
97: }
98: 
99: .statValue {
100:   font-family: var(--font-mono);
101:   font-size: var(--step-2);
102:   font-weight: 700;
103:   color: var(--ink);
104: }
105: 
106: .statLabel {
107:   font-size: 0.8rem;
108:   color: var(--paper-soft);
109: }
110: 
111: .status {
112:   color: var(--paper-soft);
113:   font-size: 0.95rem;
114: }
115: 
116: .statusError {
117:   color: var(--brand-alert);
118:   font-size: 0.9rem;
119:   background: rgba(193, 67, 43, 0.1);
120:   padding: 0.6rem 0.8rem;
121:   border-radius: 8px;
122: }
123: 
124: .console {
125:   background: var(--ink);
126:   color: var(--paper);
127:   border-radius: 16px;
128:   padding: 2rem;
129: }
130: 
131: .counterHeader {
132:   display: flex;
133:   align-items: center;
134:   justify-content: space-between;
135:   flex-wrap: wrap;
136:   gap: 1rem;
137:   margin-bottom: 1.75rem;
138: }
139: 
140: .counterLabel {
141:   font-family: var(--font-mono);
142:   font-size: 0.9rem;
143:   letter-spacing: 0.05em;
144:   margin-right: 0.75rem;
145: }
146: 
147: .badgeOpen,
148: .badgeClosed {
149:   font-family: var(--font-mono);
150:   font-size: 0.7rem;
151:   letter-spacing: 0.05em;
152:   text-transform: uppercase;
153:   padding: 0.25rem 0.6rem;
154:   border-radius: 100px;
155: }
156: 
157: .badgeOpen {
158:   background: var(--brand-primary);
159:   color: var(--ink);
160: }
161: 
162: .badgeClosed {
163:   background: var(--ink-raised);
164:   color: var(--ink-soft);
165: }
166: 
167: .toggleBtn {
168:   padding: 0.55rem 1rem;
169:   border-radius: 100px;
170:   font-size: 0.85rem;
171:   font-weight: 600;
172:   color: var(--paper);
173:   box-shadow: inset 0 0 0 1px var(--ink-line);
174:   transition: box-shadow 0.2s ease;
175: }
176: 
177: .toggleBtn:hover {
178:   box-shadow: inset 0 0 0 1px var(--brand-accent);
179: }
180: 
181: .cardEyebrow {
182:   font-family: var(--font-mono);
183:   font-size: 0.8rem;
184:   letter-spacing: 0.08em;
185:   text-transform: uppercase;
186:   color: var(--ink-soft);
187:   margin-bottom: 1.25rem;
188:   display: block;
189: }
190: 
191: .flapRow {
192:   display: flex;
193:   gap: 0.4rem;
194:   justify-content: center;
195:   margin-bottom: 1.25rem;
196: }
197: 
198: .customerLine {
199:   text-align: center;
200:   color: var(--ink-soft);
201:   font-size: 0.9rem;
202:   margin-bottom: 1rem;
203: }
204: 
205: .priorityTag {
206:   display: block;
207:   width: fit-content;
208:   margin: 0 auto 1.25rem;
209:   background: var(--brand-alert);
210:   color: var(--ink);
211:   font-family: var(--font-mono);
212:   font-size: 0.7rem;
213:   font-weight: 700;
214:   padding: 0.25rem 0.6rem;
215:   border-radius: 4px;
216:   letter-spacing: 0.05em;
217: }
218: 
219: .actionRow {
220:   display: flex;
221:   gap: 1rem;
222: }
223: 
224: .completeBtn,
225: .skipBtn {
226:   flex: 1;
227:   padding: 0.85rem;
228:   border-radius: 100px;
229:   font-weight: 700;
230:   font-size: 0.9rem;
231:   transition:
232:     transform 0.2s ease,
233:     opacity 0.2s ease;
234: }
235: 
236: .completeBtn {
237:   background: var(--brand-primary);
238:   color: var(--ink);
239: }
240: 
241: .skipBtn {
242:   color: var(--paper);
243:   box-shadow: inset 0 0 0 1px var(--ink-line);
244: }
245: 
246: .completeBtn:hover,
247: .skipBtn:hover {
248:   transform: translateY(-2px);
249: }
250: 
251: .completeBtn:disabled,
252: .skipBtn:disabled {
253:   opacity: 0.6;
254:   transform: none;
255:   cursor: not-allowed;
256: }
257: 
258: .field {
259:   display: flex;
260:   flex-direction: column;
261:   gap: 0.5rem;
262:   font-size: 0.85rem;
263:   color: var(--ink-soft);
264:   margin-bottom: 1.25rem;
265: }
266: 
267: .field select {
268:   font-family: var(--font-body);
269:   font-size: 0.95rem;
270:   color: var(--paper);
271:   background: var(--ink-raised);
272:   border: 1px solid var(--ink-line);
273:   border-radius: 8px;
274:   padding: 0.75rem 0.9rem;
275: }
276: 
277: .field select:focus {
278:   outline: 2px solid var(--brand-primary);
279:   outline-offset: 1px;
280: }
281: 
282: .callBtn {
283:   width: 100%;
284:   padding: 0.9rem;
285:   background: var(--brand-primary);
286:   color: var(--ink);
287:   border-radius: 100px;
288:   font-weight: 700;
289:   font-size: 0.95rem;
290:   transition:
291:     transform 0.2s ease,
292:     opacity 0.2s ease;
293: }
294: 
295: .callBtn:hover {
296:   transform: translateY(-2px);
297: }
298: 
299: .callBtn:disabled {
300:   opacity: 0.5;
301:   transform: none;
302:   cursor: not-allowed;
303: }
304: 
305: /* ── Ticket History ─────────────────────────── */
306: .historySection {
307:   margin-top: 2rem;
308:   padding-top: 1.5rem;
309:   border-top: 1px solid var(--paper);
310: }
311: 
312: .sectionLabel {
313:   font-family: var(--font-mono);
314:   font-size: 0.8rem;
315:   letter-spacing: 0.08em;
316:   text-transform: uppercase;
317:   color: var(--paper-soft);
318:   margin-bottom: 1rem;
319: }
320: 
321: .historyList {
322:   display: flex;
323:   flex-direction: column;
324: }
325: 
326: .historyRow {
327:   display: flex;
328:   align-items: center;
329:   justify-content: space-between;
330:   gap: 1rem;
331:   padding: 0.85rem 0;
332:   border-bottom: 1px solid var(--paper);
333:   flex-wrap: wrap;
334: }
335: 
336: .historyLeft {
337:   display: flex;
338:   align-items: center;
339:   gap: 0.75rem;
340:   flex-wrap: wrap;
341: }
342: 
343: .ticketNum {
344:   font-family: var(--font-mono);
345:   font-weight: 700;
346:   font-size: 0.95rem;
347:   color: var(--ink);
348: }
349: 
350: .historyMeta {
351:   font-size: 0.8rem;
352:   color: var(--paper-soft);
353: }
354: 
355: .historyRight {
356:   display: flex;
357:   align-items: center;
358:   gap: 0.75rem;
359: }
360: 
361: .badgeCompleted,
362: .badgeSkipped {
363:   font-family: var(--font-mono);
364:   font-size: 0.65rem;
365:   letter-spacing: 0.05em;
366:   text-transform: uppercase;
367:   padding: 0.2rem 0.55rem;
368:   border-radius: 100px;
369: }
370: 
371: .badgeCompleted {
372:   background: var(--brand-primary);
373:   color: var(--ink);
374: }
375: 
376: .badgeSkipped {
377:   background: var(--ink);
378:   color: var(--paper-soft);
379: }
380: 
381: .recallBtn {
382:   font-size: 0.8rem;
383:   font-weight: 600;
384:   color: var(--brand-primary);
385:   transition: text-decoration 0.15s ease;
386: }
387: 
388: .recallBtn:hover {
389:   text-decoration: underline;
390: }
391: 
392: /* ── Mobile responsive ──────────────────────── */
393: @media (max-width: 640px) {
394:   .page {
395:     padding: 2rem 1rem;
396:   }
397: 
398:   .headerRow {
399:     flex-direction: column;
400:     gap: 0.75rem;
401:   }
402: 
403:   .headerActions {
404:     width: 100%;
405:     justify-content: flex-end;
406:   }
407: 
408:   .statRow {
409:     flex-direction: column;
410:   }
411: 
412:   .console {
413:     padding: 1.25rem;
414:   }
415: 
416:   .actionRow {
417:     flex-direction: column;
418:     gap: 0.75rem;
419:   }
420: 
421:   .historyRow {
422:     flex-direction: column;
423:     align-items: flex-start;
424:     gap: 0.5rem;
425:   }
426: 
427:   .historyRight {
428:     width: 100%;
429:     justify-content: space-between;
430:   }
431: 
432:   .mgmtInlineForm {
433:     flex-direction: column;
434:     align-items: stretch;
435:   }
436: 
437:   .mgmtInlineForm input {
438:     min-width: 0;
439:     width: 100%;
440:   }
441: 
442:   .mgmtSubmitBtn {
443:     width: 100%;
444:     text-align: center;
445:   }
446: 
447:   .mgmtTabContent {
448:     padding: 1.25rem;
449:     border-radius: 12px;
450:   }
451: 
452:   .ovStatRow {
453:     grid-template-columns: repeat(2, 1fr);
454:     gap: 0.75rem;
455:   }
456: 
457:   .ovStatCard {
458:     padding: 0.9rem;
459:   }
460: 
461:   .ovCounterGrid {
462:     grid-template-columns: repeat(3, 1fr);
463:     gap: 0.5rem;
464:   }
465: 
466:   .ovCounterStat {
467:     padding: 0.75rem;
468:   }
469: }
470: 
471: /* ── Top-level tabs (Console / Manage / History) ── */
472: .topTabs {
473:   display: flex;
474:   gap: 0.5rem;
475:   background: var(--paper-raised);
476:   border-radius: 100px;
477:   padding: 4px;
478:   margin-bottom: 1.5rem;
479:   overflow-x: auto;
480: }
481: .topTab,
482: .topTabActive {
483:   flex: 1;
484:   padding: 0.6rem 1rem;
485:   border-radius: 100px;
486:   font-size: 0.85rem;
487:   font-weight: 600;
488:   white-space: nowrap;
489:   transition:
490:     background 0.2s ease,
491:     color 0.2s ease;
492: }
493: .topTab {
494:   color: var(--paper-soft);
495: }
496: .topTabActive {
497:   background: var(--ink);
498:   color: var(--paper);
499: }
500: 
501: /* ── Manage panel ────────────────────────────── */
502: .mgmtPanel {
503:   margin-top: 0.5rem;
504: }
505: 
506: .mgmtHeader {
507:   margin-bottom: 0.5rem;
508: }
509: 
510: .mgmtEyebrow {
511:   font-family: var(--font-mono);
512:   color: var(--brand-accent);
513:   font-size: 0.85rem;
514:   letter-spacing: 0.08em;
515:   text-transform: uppercase;
516:   margin-bottom: 1rem;
517: }
518: 
519: .mgmtTabs {
520:   display: flex;
521:   gap: 0.5rem;
522:   background: var(--paper-raised);
523:   border-radius: 100px;
524:   padding: 4px;
525:   margin-bottom: 1.5rem;
526:   overflow-x: auto;
527: }
528: 
529: .mgmtTab,
530: .mgmtTabActive {
531:   flex: 1;
532:   padding: 0.6rem 1rem;
533:   border-radius: 100px;
534:   font-size: 0.85rem;
535:   font-weight: 600;
536:   white-space: nowrap;
537:   transition:
538:     background 0.2s ease,
539:     color 0.2s ease;
540: }
541: .mgmtTab {
542:   color: var(--paper-soft);
543: }
544: .mgmtTabActive {
545:   background: var(--ink);
546:   color: var(--paper);
547: }
548: 
549: .mgmtTabContent {
550:   background: var(--paper-raised);
551:   border-radius: 16px;
552:   padding: 1.75rem;
553: }
554: 
555: .mgmtStatus {
556:   color: var(--paper-soft);
557:   font-size: 0.9rem;
558: }
559: 
560: .mgmtStatusError {
561:   color: var(--brand-alert);
562:   font-size: 0.85rem;
563:   background: rgba(193, 67, 43, 0.1);
564:   padding: 0.5rem 0.75rem;
565:   border-radius: 8px;
566: }
567: 
568: .mgmtSubHeading {
569:   font-family: var(--font-mono);
570:   font-size: 0.75rem;
571:   letter-spacing: 0.08em;
572:   text-transform: uppercase;
573:   color: var(--paper-soft);
574:   margin: 1.5rem 0 0.75rem;
575: }
576: 
577: .mgmtRow {
578:   display: flex;
579:   align-items: flex-start;
580:   justify-content: space-between;
581:   gap: 1rem;
582:   padding: 0.85rem 0;
583:   border-bottom: 1px solid var(--paper);
584:   font-size: 0.9rem;
585:   flex-wrap: wrap;
586: }
587: 
588: .mgmtRowTitle {
589:   font-weight: 600;
590:   color: var(--ink);
591: }
592: 
593: .mgmtRowSub {
594:   font-size: 0.8rem;
595:   color: var(--paper-soft);
596: }
597: 
598: .mgmtRowActions {
599:   display: flex;
600:   align-items: center;
601:   gap: 0.75rem;
602:   flex-shrink: 0;
603: }
604: 
605: .mgmtLinkBtn {
606:   font-size: 0.8rem;
607:   font-weight: 600;
608:   color: var(--brand-primary);
609: }
610: .mgmtLinkBtn:hover {
611:   text-decoration: underline;
612: }
613: 
614: .mgmtBadgeOpen,
615: .mgmtBadgeClosed,
616: .mgmtBadgePending {
617:   font-family: var(--font-mono);
618:   font-size: 0.7rem;
619:   letter-spacing: 0.05em;
620:   text-transform: uppercase;
621:   padding: 0.2rem 0.55rem;
622:   border-radius: 100px;
623: }
624: .mgmtBadgeOpen {
625:   background: var(--brand-primary);
626:   color: var(--ink);
627: }
628: .mgmtBadgeClosed {
629:   background: var(--paper);
630:   color: var(--paper-soft);
631: }
632: .mgmtBadgePending {
633:   background: rgba(201, 162, 39, 0.2);
634:   color: var(--brand-accent);
635: }
636: 
637: .mgmtInlineForm {
638:   display: flex;
639:   flex-wrap: wrap;
640:   gap: 0.75rem;
641:   align-items: center;
642: }
643: .mgmtInlineForm input {
644:   font-family: var(--font-body);
645:   font-size: 0.9rem;
646:   padding: 0.65rem 0.9rem;
647:   border-radius: 8px;
648:   border: 1px solid var(--paper-soft);
649:   background: var(--paper);
650:   flex: 1;
651:   min-width: 160px;
652: }
653: .mgmtInlineForm input:focus {
654:   outline: 2px solid var(--brand-primary);
655:   outline-offset: 1px;
656: }
657: 
658: .mgmtInlineSelect {
659:   font-family: var(--font-body);
660:   font-size: 0.85rem;
661:   padding: 0.4rem 0.6rem;
662:   border-radius: 6px;
663:   border: 1px solid var(--paper-soft);
664:   background: var(--paper);
665: }
666: 
667: .mgmtSubmitBtn {
668:   padding: 0.7rem 1.25rem;
669:   background: var(--brand-primary);
670:   color: var(--ink);
671:   border-radius: 100px;
672:   font-weight: 700;
673:   font-size: 0.9rem;
674:   transition:
675:     transform 0.2s ease,
676:     opacity 0.2s ease;
677: }
678: .mgmtSubmitBtn:hover {
679:   transform: translateY(-2px);
680: }
681: .mgmtSubmitBtn:disabled {
682:   opacity: 0.6;
683:   transform: none;
684:   cursor: not-allowed;
685: }
686: 
687: .mgmtQueueChips {
688:   display: flex;
689:   flex-wrap: wrap;
690:   gap: 0.35rem;
691:   margin-top: 0.4rem;
692: }
693: 
694: .mgmtQueueChip {
695:   font-family: var(--font-mono);
696:   font-size: 0.7rem;
697:   letter-spacing: 0.03em;
698:   padding: 0.2rem 0.55rem;
699:   border-radius: 100px;
700:   border: 1px solid var(--paper-soft);
701:   color: var(--paper-soft);
702:   background: transparent;
703:   transition:
704:     background 0.15s ease,
705:     color 0.15s ease,
706:     border-color 0.15s ease;
707: }
708: .mgmtQueueChip:hover {
709:   border-color: var(--brand-primary);
710:   color: var(--brand-primary);
711: }
712: .mgmtQueueChipActive {
713:   background: var(--brand-primary);
714:   color: var(--ink);
715:   border-color: var(--brand-primary);
716: }
717: .mgmtQueueChipActive:hover {
718:   color: var(--ink);
719: }
720: 
721: /* ── Overview panels ─────────────────────────── */
722: .ovStatRow {
723:   display: grid;
724:   grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
725:   gap: 1rem;
726:   margin-bottom: 2rem;
727: }
728: 
729: .ovStatCard {
730:   background: var(--paper-raised);
731:   border-radius: 12px;
732:   padding: 1.25rem 1.5rem;
733:   display: flex;
734:   flex-direction: column;
735:   gap: 0.3rem;
736: }
737: 
738: .ovStatValue {
739:   font-family: var(--font-mono);
740:   font-size: var(--step-2);
741:   font-weight: 700;
742:   color: var(--ink);
743: }
744: 
745: .ovStatLabel {
746:   font-size: 0.8rem;
747:   color: var(--paper-soft);
748: }
749: 
750: .ovSection {
751:   margin-bottom: 2rem;
752: }
753: 
754: .ovBarHeader {
755:   display: flex;
756:   align-items: center;
757:   justify-content: space-between;
758:   margin-bottom: 0.5rem;
759: }
760: 
761: .ovBarLabel {
762:   font-size: 0.9rem;
763:   font-weight: 600;
764:   color: var(--ink);
765: }
766: 
767: .ovBarValue {
768:   font-family: var(--font-mono);
769:   font-size: 0.9rem;
770:   font-weight: 700;
771:   color: var(--brand-primary);
772: }
773: 
774: .ovBarTrack {
775:   height: 8px;
776:   background: var(--paper);
777:   border-radius: 4px;
778:   overflow: hidden;
779: }
780: 
781: .ovBarFill {
782:   height: 100%;
783:   background: var(--brand-primary);
784:   border-radius: 4px;
785:   transition: width 0.4s ease;
786: }
787: 
788: .ovQueueRow {
789:   margin-bottom: 0.75rem;
790: }
791: 
792: .ovQueueInfo {
793:   display: flex;
794:   align-items: center;
795:   justify-content: space-between;
796:   margin-bottom: 0.35rem;
797: }
798: 
799: .ovQueueName {
800:   font-size: 0.9rem;
801:   color: var(--ink);
802: }
803: 
804: .ovQueueCount {
805:   font-family: var(--font-mono);
806:   font-size: 0.85rem;
807:   font-weight: 600;
808:   color: var(--ink);
809: }
810: 
811: .ovCounterGrid {
812:   display: grid;
813:   grid-template-columns: repeat(3, 1fr);
814:   gap: 0.75rem;
815:   margin-bottom: 1rem;
816: }
817: 
818: .ovCounterStat {
819:   background: var(--paper);
820:   border-radius: 10px;
821:   padding: 1rem;
822:   text-align: center;
823: }
824: 
825: .ovCounterValue {
826:   display: block;
827:   font-family: var(--font-mono);
828:   font-size: var(--step-1);
829:   font-weight: 700;
830:   color: var(--ink);
831: }
832: 
833: .ovCounterLabel {
834:   font-size: 0.7rem;
835:   color: var(--paper-soft);
836:   text-transform: uppercase;
837:   letter-spacing: 0.05em;
838: }
839: 
840: .ovCounterList {
841:   display: flex;
842:   flex-direction: column;
843: }
844: 
845: .ovCounterRow {
846:   display: flex;
847:   align-items: center;
848:   gap: 0.75rem;
849:   padding: 0.6rem 0;
850:   border-bottom: 1px solid var(--paper);
851:   font-size: 0.85rem;
852: }
853: 
854: .ovCounterName {
855:   font-weight: 600;
856:   color: var(--ink);
857:   min-width: 100px;
858: }
859: 
860: .ovStaffCount {
861:   font-family: var(--font-mono);
862:   font-size: 0.85rem;
863:   color: var(--brand-primary);
864:   font-weight: 600;
865: }
866: 
867: /* ── API key request: scope chips + one-time reveal modal ── */
868: .scopeChips {
869:   display: flex;
870:   flex-wrap: wrap;
871:   gap: 0.4rem;
872:   width: 100%;
873: }
874: 
875: .scopeChip,
876: .scopeChipActive {
877:   font-family: var(--font-mono);
878:   font-size: 0.7rem;
879:   letter-spacing: 0.03em;
880:   padding: 0.35rem 0.65rem;
881:   border-radius: 100px;
882:   border: 1px solid var(--paper-soft);
883:   background: var(--paper);
884:   color: var(--paper-soft);
885:   cursor: pointer;
886:   transition:
887:     background 0.15s ease,
888:     color 0.15s ease,
889:     border-color 0.15s ease;
890: }
891: .scopeChipActive {
892:   background: var(--brand-primary);
893:   border-color: var(--brand-primary);
894:   color: var(--ink);
895:   font-weight: 600;
896: }
897: 
898: .keyModalBackdrop {
899:   position: fixed;
900:   inset: 0;
901:   background: rgba(15, 20, 25, 0.65);
902:   display: flex;
903:   align-items: center;
904:   justify-content: center;
905:   z-index: 1000;
906:   padding: 1.5rem;
907: }
908: 
909: .keyModal {
910:   background: var(--paper-raised);
911:   border-radius: 16px;
912:   padding: 1.75rem;
913:   max-width: 560px;
914:   width: 100%;
915:   display: flex;
916:   flex-direction: column;
917:   gap: 0.85rem;
918: }
919: 
920: .keyModal h4 {
921:   font-size: var(--step-1);
922:   color: var(--ink);
923:   margin: 0;
924: }
925: 
926: .rawKeyBox {
927:   display: flex;
928:   gap: 0.6rem;
929:   align-items: center;
930:   background: var(--paper);
931:   border: 1px dashed var(--paper-soft);
932:   border-radius: 10px;
933:   padding: 0.85rem;
934: }
935: 
936: .rawKeyBox code {
937:   flex: 1;
938:   font-family: var(--font-mono);
939:   font-size: 0.75rem;
940:   word-break: break-all;
941:   color: var(--ink);
942: }

(End of file - total 942 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/BUILD_PLAN.md"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/BUILD_PLAN.md</path>
<type>file</type>
<content>
1: # Build Plan — Cue
2: 
3: A sequenced plan for everything left to build, and why it's ordered this way. Update the relevant status line here as each phase ships.
4: 
5: ---
6: 
7: ## Pivot: API-First Queue Integration Service
8: 
9: ### Concept Shift
10: 
11: **Before:** Standalone queue management platform banks deploy as their own instance
12: **After:** API-first service banks integrate into their existing software via REST API + webhooks
13: 
14: The demo frontend becomes a proof-of-concept, not the primary product. Banks call Cue's API from their own systems. The customer never interacts with Cue directly — they interact with the bank's app, which calls Cue.
15: 
16: ### Key Architectural Changes
17: 
18: | Area              | Current                                | New                                     |
19: | ----------------- | -------------------------------------- | --------------------------------------- |
20: | Auth              | JWT tokens for all users               | API keys for bank integrations          |
21: | Routes            | `/api/*`                               | `/api/v1/*` (versioned)                 |
22: | Branding          | 3-layer (env + MongoDB + BrandContext) | Env vars only                           |
23: | Frontend          | Full app with admin/manager panels     | Simplified demo (customer + staff only) |
24: | AI Agent          | Groq/LLaMA chatbot                     | Deferred                                |
25: | Multi-tenancy     | Implicit (single deployment)           | Explicit (API key → bank/tenant)        |
26: | Kiosk/Appointment | Public (no auth)                       | API key required                        |
27: 
28: ---
29: 
30: ## Where things stand (Previous Work)
31: 
32: | Piece                                                      | Status             |
33: | ---------------------------------------------------------- | ------------------ |
34: | Backend: auth, roles, branches, queues, counters, tickets  | ✅ Done            |
35: | Backend: real-time (Socket.io), no-show handling           | ✅ Done            |
36: | Backend: branch analytics, daily report, staff performance | ✅ Done            |
37: | Backend: public board endpoints                            | ✅ Done            |
38: | Backend: kiosk, appointments, nearest-branch               | ✅ Done            |
39: | Backend: AI agent (Groq API)                               | ✅ Done (deferred) |
40: | Backend: webhooks, Slack/Discord notifications             | ✅ Done (deferred) |
41: | Backend: audit log, bulk import, export                    | ✅ Done            |
42: | Backend: email notifications (Resend)                      | ✅ Done (deferred) |
43: | Backend: automated tests (58 tests)                        | ✅ Done            |
44: | Frontend: all 18 pages                                     | ✅ Done (simplified) |
45: | Frontend: dark mode, responsive, animations                | ✅ Done            |
46: | Frontend: automated tests (8 tests)                        | ✅ Done            |
47: | CI: GitHub Actions pipeline                                | ✅ Done            |
48: | Customer accounts removed — guest-based tickets            | ✅ Done            |
49: | Staff management (staff/counter/queue assignment)         | ✅ Done (Phase 8c) |
50: | Role-based dashboards (admin/manager overview)            | ✅ Done (Phase 8c) |
51: | Superadmin platform console + key request flow            | ✅ Done (Phase 12) |
52: | Four-model split (Staff/Admin/Manager/Superadmin) + kind JWT | ✅ Done (Phase 13 WP1–2) |
53: | Four login endpoints + admin self-registration + invites    | ✅ Done (Phase 13 WP3) |
54: | Provisioning controllers (manager/staff, temp password)     | ✅ Done (Phase 13 WP4) |
55: | Staff-only serving + requireScope wiring on v1              | ✅ Done (Phase 13 WP5) |
56: 
57: ---
58: 
59: ## Phase 13 — Real product auth (four-model split) 🚧
60: 
61: **Goal:** Replace the demo switcher with real per-role login/registration and split identity into four collections. Dashboard becomes JWT-only; v1 stays API-key-only for bank integrations.
62: 
63: **Locked decisions:**
64: - Four collections: `Staff`, `Admin`, `Manager`, `Superadmin` (no `role` field — collection = role)
65: - JWT carries `kind` + `role` claims; `protect` dispatches by `kind`
66: - Manager fields: name, email, password, branch, bank, isActive, mustChangePassword — no queues/counter, cannot serve tickets
67: - Admin has `bank` (informational + tenantMatch) but runtime scoping still from API key; **403 if admin.bank ≠ key.bankName**
68: - Dashboard: JWT-only; v1: API-key-only for external bank systems
69: - Seeds: **superadmin only** (admins self-register public; managers/staff via temp-password + invite links — both mechanisms)
70: - Demo switcher / `/v1/demo/*` / `VITE_DEMO_API_KEY` fully removed (WP7)
71: - Open admin registration: instant, `bankName` required, rate-limited
72: - Manager keeps oversight (overview, analytics, staff create, counters open/close/assign others, close/open day) but **cannot serve tickets**
73: 
74: ### WP1 — Four models ✅
75: - [x] `staff.model.js` slimmed: name, email, password, branch, counter, queues, isEmailVerified, isActive, mustChangePassword — **no `role`**
76: - [x] New `admin.model.js`: name, email, password, **bank** (required, indexed), isActive, mustChangePassword
77: - [x] New `manager.model.js`: name, email, password, branch, bank (denormalized), isActive, mustChangePassword — no counter/queues
78: - [x] New `superadmin.model.js`: name, email, password, isActive, mustChangePassword — not bank-scoped
79: - [x] Refs: `ApiKeyRequest.requestedBy` → Admin, `reviewedBy` → Superadmin; token/auditLog/pushSubscription refPath enums → `[Staff, Admin, Manager, Superadmin]`
80: - [x] `migrateSplitStaff.js` (+ `npm run migrate:split-staff`, `--dry-run` supported): routes legacy `role` docs into the four collections, denormalizes manager/admin bank from branch, strips role from remaining staff
81: - [x] `seedSuperadmin.js` → Superadmin model; `seedAdmin.js` → Admin model (+ `SEED_ADMIN_BANK`); **`seedAll.js` deleted**, `seed:all` script removed
82: 
83: ### WP2 — Identity: kind JWT + protect dispatch ✅
84: - [x] `protect`: `modelForToken(decoded)` picks Staff/Admin/Manager/Superadmin by `kind` (falls back to `role` for pre-split tokens); rejects unknown kind; **checks `isActive`** (was missing)
85: - [x] JWTs signed with `{ id, kind, role }` by both login paths (platform + staff login)
86: - [x] `resolveStaffUser`: Staff only; `req.role = "staff"` (collection = role); rejects inactive
87: - [x] New `tenantMatch` middleware: admin bank vs `req.bankName` → 403 on mismatch; mounted on authenticated v1 chain
88: - [x] `audit.middleware` maps role → model name for refPath
89: - [x] Admin overview queries `Manager` collection (no role filter); `getAllStaff` stamps `role: "staff"` for API consumers
90: - [x] `createStaff` / staffImport / staff validator: role no longer accepted (Staff-only creation)
91: - [x] Frontend: StaffSubTab staff-only form; AdminOverview manager-create form deferred to WP4
92: - [x] Tests: `modelForToken` (7), `tenantMatch` (5), `fourModelSplit` schemas (8) → **80 backend** green; **8 frontend** + `vite build` green
93: 
94: ### WP3 — Four login endpoints + admin public registration + invites ✅
95: - [x] `POST /api/auth/login/{staff,manager,admin}` — kind JWT `{ id, kind, role }`, generic 401 (no enumeration)
96: - [x] `POST /api/auth/register/admin` — public, instant, `bankName` required, `registerLimiter` (5/15min)
97: - [x] `invite.model.js` — SHA-256 at rest, kind manager|staff, bank/branch scope, 7d TTL, single-use `usedAt`
98: - [x] `POST /api/auth/invites/manager` (admin, bank from JWT) / `invites/staff` (admin|manager, branch-in-bank check)
99: - [x] `POST /api/auth/register/{manager,staff}` — redeem token, path/kind must match, invitee sets own password
100: - [x] `GET /api/auth/me` + `POST /api/auth/change-password` (any kind; clears `mustChangePassword`)
101: - [x] Validators: login×3, registerAdmin, registerWithInvite, invites, changePassword
102: 
103: ### WP4 — Provisioning controllers (manager/staff create, temp password, invite links) ✅
104: - [x] `manager.controller.js`: create (bank denormalized from branch, branch-in-bank check), list (bank-scoped), reassign branch, deactivate
105: - [x] `POST /api/managers` — admin JWT; dual path: body password OR server temp password (`Cue-XXXXXX-XXXXXX`, returned once, `mustChangePassword: true`)
106: - [x] `createStaff`: same dual path; admin branch must be in admin.bank; welcome email **never includes** temp password
107: - [x] `getAllStaff` / `deactivateStaff` / `assignStaffToBranch` / `assignQueuesToStaff`: manager → own branch; admin → all `Branch.bank === Admin.bank` (403 otherwise); new `getStaffById`
108: - [x] JWT admin key-request routes: `POST/GET /api/admin/api-key-requests`, `GET /:id` one-time reveal — `bankName` always `req.user.bank`
109: - [x] Mounted in `app.js`: `/api/managers`, `/api/admin/api-key-requests`; staff routes add `GET /:staffId`
110: 
111: ### WP5 — Role/permission enforcement (manager cannot serve; requireScope wiring) ✅
112: - [x] `requireStaffServing` middleware: staff pass; manager/admin/superadmin → 403 with clear messages; prefers signed `kind` over `role`
113: - [x] JWT ticket routes: call-next / call / complete / skip / my-stats / my-history → `requireStaffServing` only (no authorize)
114: - [x] Oversight kept for manager/admin: branch tickets, recall, priority; close/open day stays manager
115: - [x] Controller defense-in-depth: `denyNonStaffServe` in callNext/call/complete/skip/my-stats/my-history (works on both JWT and v1 paths)
116: - [x] v1 requireScope wiring: tickets write/read, branches:read (branch/queue/counter/board), staff:read, analytics:read
117: - [x] v1 role authorize removed where resolveStaffUser always sets role "staff" (would 403 every API-key request); controller accepts `req.apiKey` integration path for admin overview
118: 
119: ### WP6 — Dashboard moves off v1 onto JWT `/api/*` surface ✅
120: ### WP7 — Frontend: 4 login pages, kill demo switcher/API-key mode ✅
121: ### WP8 — Platform console adjustments (Superadmin model everywhere) ✅
122: ### WP9 — Docs, env cleanup, full test pass ⏳
123: 
124: **WP6 checklist:**
125: - [x] Backend: `GET /api/admin/overview` (protect + authorize("admin")) — bank scope from `Admin.bank`
126: - [x] `getAdminOverview` accepts JWT path: `bank = req.bankName || req.user?.bank`
127: - [x] Branch create/list/update/delete JWT bank-scoping (`Admin.bank` when no API key)
128: - [x] Analytics `canAccessBranch` uses `Admin.bank` for JWT admin
129: - [x] Frontend API modules migrated off `v1Api` → `apiClient` + Bearer `token`:
130:   - `manageApi.js`, `adminApi.js`, `apiKeyRequestApi.js`, `ticketsApi.js`
131:   - `useCounterOperations`, `useMyCounter`, `useMyStats`, `useTicketHistory`
132:   - `useMyTicket` (public lookup stays unauthenticated; cancel uses JWT)
133: - [x] All StaffHome components pass `auth.token` (StaffSubTab, CounterSubTab, CounterConsole, ManagerOverview, AdminOverview, TicketHistory)
134: - [x] Staff list pagination shape: `res.data` array (paginatedResponse spread)
135: 
136: **WP7 checklist:**
137: - [x] JWT-only `AuthContext` — `login(staff|manager|admin|superadmin)`, `getAuthMe` refresh, no demo auto-init, no `VITE_DEMO_API_KEY`, no `switchUser`
138: - [x] Four login surfaces: `/login/staff`, `/login/manager`, `/login/admin` (+ existing `/platform/login`)
139: - [x] `ProtectedRoute` requires `auth.token` (not apiKey); role allow-list still enforced
140: - [x] Navbar: demo UserSwitcher removed; signed-out “Sign in” → `/login/staff`
141: - [x] `authApi.changePassword` targets `POST /auth/change-password` with Bearer token (kind-aware, not Staff-only)
142: - [x] `mustChangePassword` force prompt on `/staff` + `clearMustChangePassword` after rotation
143: - [x] Counter open allows staff on their own assigned counter (symmetric with close)
144: - [x] LoginPage validates `kind` ∈ {staff, manager, admin}
145: - [x] Backend demo surface removed: `demo.controller.js`, `routes/v1/demo.routes.js`, `GET /api/v1/demo/users` mount
146: - [x] Guest ticket pages off v1 → public `/api/tickets*` + new `GET /api/queues/public` (no auth)
147: 
148: **WP8 checklist:**
149: - [x] Platform login response identity key → `user` (matches bank logins); payload includes `role`/`kind`/`mustChangePassword`; JWT still `{ id, kind: "superadmin", role: "superadmin" }`
150: - [x] Legacy `routes/v1/apiKeyRequest.routes.js` **removed** + unmounted from `v1/index.js` (`authorize("admin")` always 403’d under `resolveStaffUser` role `"staff"`; dashboard uses JWT `/api/admin/api-key-requests`)
151: - [x] Stale comments updated: platform api-key routes, platform key controller, `apiKeyRequest.model.js` → JWT admin path (requestedBy → Admin)
152: - [x] `ProtectedRoute`: unauthenticated `/platform*` → `/platform/login` (not marketing home)
153: - [x] `AuthInterceptor`: superadmin 401 → `/platform/login` with `sessionExpired` state (PlatformLogin already renders the notice)
154: - [x] PlatformDashboard / platformApi / PlatformLogin already Superadmin-model + JWT-only (verified, no change)
155: - [x] `reviewedBy` → Superadmin on platform approve/reject (tested)
156: - [x] Tests: `tests/platform/superadmin.platform.test.js` — login shape + JWT kind, reject bad password, getPlatformMe, approve/reject stamp `reviewedBy`, v1 router has no `api-key-requests`
157: - [x] authorize("superadmin") isolation already covered by `superadmin.authorize.test.js` + `modelForToken.test.js`
158: 
159: ---
160: 
161: ## Phase 1 — API Key Authentication ✅
162: 
163: **Goal:** Replace JWT-only auth with API key authentication for bank integrations.
164: 
165: **Ships:**
166: 
167: - [x] `ApiKey` model: `key` (hashed), `bankName`, `label`, `scopes[]`, `rateLimit`, `isActive`, `lastUsedAt`, `expiresAt`, `createdAt`
168: - [x] Key generation endpoint: `POST /api/v1/api-keys` (admin only)
169: - [x] Key listing: `GET /api/v1/api-keys` (admin only)
170: - [x] Key revocation: `DELETE /api/v1/api-keys/:id` (admin only)
171: - [x] Key rotation: `POST /api/v1/api-keys/:id/rotate` (generates new key, old key active for 24h grace period)
172: - [x] Key toggle: `PATCH /api/v1/api-keys/:id/toggle` (enable/disable without deleting)
173: - [x] `authenticateApiKey` middleware: reads `X-API-Key` header, validates key, attaches `req.bank` and `req.apiKey` to request
174: - [x] `requireScope(scope)` middleware: checks `req.apiKey.scopes` includes required scope
175: - [x] Rate limiting middleware keyed to API key ID (not IP)
176: - [x] Seed a default admin API key (`npm run seed:apikey`)
177: - [x] V1 routes mounted in `app.js` with API key auth pipeline
178: - [x] Tests for `requireScope` and `apiKeyRateLimit` middlewares (10 tests)
179: 
180: **Scopes:**
181: 
182: | Scope             | Access                                               |
183: | ----------------- | ---------------------------------------------------- |
184: | `branches:read`   | Read branch info, queues, counters, board data       |
185: | `tickets:write`   | Create/cancel tickets (kiosk, appointment, customer) |
186: | `tickets:read`    | Read ticket status, position, ETA                    |
187: | `staff:read`      | Read staff list                                      |
188: | `analytics:read`  | Read analytics, reports                              |
189: | `webhooks:manage` | Create/delete/toggle webhooks                        |
190: | `admin`           | Full access (system management)                      |
191: 
192: ---
193: 
194: ## Phase 2 — API Versioning ✅
195: 
196: **Goal:** Prefix all routes with `/api/v1/` for backward compatibility and future-proofing.
197: 
198: **Architecture:**
199: ```
200: Legacy:  /api/*  → JWT auth (protect middleware)     → existing controllers
201: V1:      /api/v1/* → API key auth → bankScope → same controllers (bank-scoping is optional)
202: ```
203: 
204: Controllers check `req.bankName` — if set (v1), filter by bank. If not (legacy), skip.
205: 
206: **Ships:**
207: 
208: - [x] V1 routes mounted in `app.js` via clean `v1Router`
209: - [x] `bankScope` middleware: finds branches belonging to API key's bank, attaches to `req.bankBranchIds`
210: - [x] `validateBranchOwnership` middleware: validates specific branch belongs to bank
211: - [x] Board controller: optional bank-scoping on `getAllBoards` and `getBranchBoard`
212: - [x] Branch controller: optional bank-scoping on all CRUD + auto-set bank on create
213: - [x] Kiosk controller: optional bank validation on create, get, cancel
214: - [x] Appointment controller: optional bank validation on slots, create, get
215: - [x] V1 route files for all resources (`routes/v1/*.routes.js`)
216: - [x] V1 index router with bankScope middleware (`routes/v1/index.js`)
217: - [x] Branch model: added `bank` field for multi-tenant isolation
218: - [x] Branch name uniqueness scoped to bank (not global)
219: - [x] Frontend API client: added `v1Api` helper and `apiKey` option for v1 routes
220: - [x] Legacy `/api/` routes preserved for backward compatibility
221: - [x] All 45 backend + 8 frontend tests pass
222: 
223: ---
224: 
225: ## Phase 3 — Multi-Tenancy Foundation ✅
226: 
227: **Goal:** Explicit data isolation per bank/tenant.
228: 
229: **Ships:**
230: 
231: - [x] `bank` field added to Branch model (done in Phase 2)
232: - [x] Branch name uniqueness scoped to bank (done in Phase 2)
233: - [x] `bankScope` middleware attaches `req.bankBranchIds` and `req.bankFilter` (done in Phase 2)
234: - [x] V1 controllers filter all queries by `req.bankName` (done in Phase 2)
235: - [x] V1 board endpoints: filtered by bank (done in Phase 2)
236: - [x] V1 kiosk/appointment endpoints: validate branch belongs to bank (done in Phase 2)
237: - [ ] Staff model: add `bank` field (Phase 8 or later)
238: - [ ] Ticket model: add `bank` field for direct queries (Phase 8 or later)
239: 
240: ---
241: 
242: ## Phase 4 — Simplify Branding ✅
243: 
244: **Goal:** Remove MongoDB BrandConfig, keep env vars only.
245: 
246: **Ships:**
247: 
248: - [x] Delete `BrandConfig` model
249: - [x] Simplify `brand.config.js` (env vars only, no cache)
250: - [x] Delete PATCH endpoint from brand routes (no runtime updates)
251: - [x] Keep `GET /api/brand` endpoint (returns env var values, for demo frontend)
252: - [x] Remove DB cache/invalidation logic
253: - [x] Update email templates to use env vars directly
254: 
255: ---
256: 
257: ## Phase 5 — New Color Theme ✅
258: 
259: **Goal:** Update the color palette to be professional, banking-friendly, and welcoming.
260: 
261: **Theme: "Verdant Trust"**
262: 
263: | Role       | Current               | New                    | Rationale                |
264: | ---------- | --------------------- | ---------------------- | ------------------------ |
265: | Primary    | `#4fa37b` (sage)      | `#0d7c66` (deep teal)  | Trust, stability, growth |
266: | Accent     | `#c9a227` (gold)      | `#c9a227` (keep)       | Premium feel             |
267: | Alert      | `#c1432b` (rust)      | `#dc2626` (clean red)  | Better readability       |
268: | Background | `#efe6cf` (parchment) | `#f9fafb` (warm white) | Clean, modern            |
269: | Text       | `#101f17` (forest)    | `#111827` (near black) | Better contrast          |
270: | Surface    | —                     | `#e8ebe9` (sage gray)  | Cards, surfaces          |
271: 
272: **Dark mode:**
273: 
274: | Role       | Current   | New                       |
275: | ---------- | --------- | ------------------------- |
276: | Background | `#1a1a1f` | `#0f1419`                 |
277: | Primary    | `#5bb88a` | `#2dd4a8` (brighter teal) |
278: | Accent     | `#c9a227` | `#fbbf24` (brighter gold) |
279: | Surface    | —         | `#1e272e`                 |
280: 
281: **Ships:**
282: 
283: - [x] Update `global.css` CSS custom properties (light + dark mode)
284: - [x] Update `BrandContext` defaults
285: - [x] Update env var defaults (.env.example)
286: 
287: ---
288: 
289: ## Phase 6 — Remove Deferred Features ✅
290: 
291: **Goal:** Clean out code that's no longer part of the core product. Move to `deferred/` folder, do not delete.
292: 
293: **Ships:**
294: 
295: - [x] Move AI agent to `deferred/backend/`: `groq.service.js`, `agent.controller.js`, `agent.routes.js`
296: - [x] Move AgentChat component to `deferred/frontend/`
297: - [x] Move push notification routes and service to `deferred/backend/`
298: - [x] Move `usePushNotifications` hook to `deferred/frontend/`
299: - [x] Move Slack/Discord notification service to `deferred/backend/`
300: - [x] Remove `notificationWebhooks` field from Branch model
301: - [x] Remove agent/push route mounts from `app.js`
302: - [x] Remove notification/push imports from `ticket.controller.js`
303: - [x] Remove email notifications (Resend) — moved to deferred (no longer used in core ticket flow)
304: 
305: ---
306: 
307: ## Phase 7 — Frontend Simplification ✅
308: 
309: **Goal:** Remove admin/manager panels and advanced features. Keep demo-focused pages.
310: 
311: **Moved to deferred:**
312: 
313: - [x] Admin panel (`/pages/StaffHome/admin/` — AdminPanel.jsx + all tabs)
314: - [x] Manager panel (`/pages/StaffHome/manager/` — ManagerPanel.jsx + all tabs)
315: - [x] Advanced analytics components (`PeakHoursHeatmap`, `StaffLeaderboard`, `WaitTimeTargets`)
316: - [x] Webhook management UI (`WebhookSettings`)
317: - [x] Bulk staff import UI (inline in AnalyticsTab)
318: - [x] CSV/PDF export buttons (inline in AnalyticsTab)
319: - [x] Admin login page (`/pages/AdminLogin/`)
320: - [x] Forgot password page (`/pages/ForgotPassword/`)
321: - [x] Reset password page (`/pages/ResetPassword/`)
322: - [x] Verify email page (`/pages/VerifyEmail/`)
323: - [x] Settings page (`/pages/Settings/`)
324: - [x] Admin API module (`features/admin/adminApi.js`)
325: - [x] Manager API module (`features/manager/managerApi.js`)
326: 
327: **Updated:**
328: 
329: - [x] StaffHome: removed manager/admin panels, shows only CounterConsole + TicketHistory
330: - [x] App.jsx: removed 5 routes (admin-login, forgot-password, reset-password, verify-email, settings)
331: - [x] Removed Settings link from staff header
332: 
333: **Kept (Demo Pages):**
334: 
335: - [x] Landing page (`/`) — marketing
336: - [x] Live boards (`/boards`, `/board/:id`) — public demo
337: - [x] Kiosk (`/kiosk/:id`) — walk-in demo
338: - [x] Appointments (`/appointment/:id`) — booking demo
339: - [x] Branch detail (`/branch/:id`) — public info
340: - [x] Find nearby (`/find-nearby`) — location demo
341: - [x] Contact (`/contact`) — sales inquiries
342: - [x] Login/Register — demo auth
343: - [x] Customer dashboard (`/account`) — ticket tracker demo
344: - [x] Staff dashboard (`/staff`) — counter console demo (simplified)
345: 
346: ---
347: 
348: ## Phase 8 — Staff Auth via API Key ✅
349: 
350: **Goal:** Staff don't log in via the demo UI. They access the system through the bank's integration.
351: 
352: **Ships:**
353: 
354: - [x] Remove Login + Register pages from demo frontend (moved to deferred/)
355: - [x] Staff dashboard authenticates via API key (demo uses VITE_DEMO_API_KEY)
356: - [x] AuthContext simplified: API-key-first, auto-initializes from env var
357: - [x] ProtectedRoute works with API key auth
358: - [x] All staff hooks (useMyCounter, useMyStats, useCounterOperations, useTicketHistory) use apiKey
359: - [x] All customer hooks (useMyTicket, ticketsApi) use apiKey
360: - [x] App.jsx routes: removed login, register routes
361: - [x] Removed email verification, forgot/reset password flows from demo
362: - [x] Backend auth endpoints preserved for bank integrations
363: 
364: ---
365: 
366: ## Phase 8b — Guest-Based Tickets & Remove Customer Accounts ✅
367: 
368: **Goal:** Customers don't register or log in. They walk up, fill a form (name, phone, email, purpose), get a ticket, and check status via a public page.
369: 
370: **Ships:**
371: 
372: - [x] Ticket model: removed `user` field; added `guestEmail`, `purpose` fields
373: - [x] Ticket creation (`POST /api/v1/tickets`): public, accepts guest info (`guestName`, `guestPhone`, `guestEmail`, `purpose`)
374: - [x] Ticket lookup (`GET /api/v1/tickets/public/:id`): public, looks up by `_id` or `kioskId`
375: - [x] Ticket cancellation (`PATCH /api/v1/tickets/:id/cancel`): public, anyone with ticket ID can cancel
376: - [x] `createTicket` controller: generates `kioskId`, removes email sending, removes User model dependency
377: - [x] `getMyTicket` controller: removed (customers use public endpoint)
378: - [x] `cancelTicket` controller: simplified to find by ticket ID only
379: - [x] `notifyTicketChange`: removed user emission (no user accounts)
380: - [x] `callNextTicket`, `callTicket`, `completeTicket`: removed email sending
381: - [x] Ticket validator: added guest field validation
382: - [x] Deleted `User` model (`backend/src/models/user.model.js`)
383: - [x] Deleted `auth.controller.js` (all user auth endpoints removed)
384: - [x] Emptied `auth.routes.js` (no user auth routes)
385: - [x] `protect` middleware: simplified to only query Staff model
386: - [x] `resolveStaffUser` middleware: removed User fallback
387: - [x] `user.controller.js`: simplified `changePassword` to Staff only
388: - [x] `demo.controller.js`: returns only Staff users (no customers)
389: - [x] `seedAll.js`: removed customer seeding; admin created as Staff role
390: - [x] `seedAdmin.js`: updated to seed Staff model
391: - [x] Frontend: deleted `CustomerHome` page and `CreateTicketFlow` component
392: - [x] Frontend: created `TicketPage` with `TicketForm` (name, phone, email, purpose, branch, service) and `TicketStatus` (ticket number, position, ETA, auto-refresh)
393: - [x] Frontend: ticket ID stored in localStorage for status persistence
394: - [x] Frontend: routes updated — `/ticket` and `/ticket/:ticketId` replace `/account`
395: - [x] Frontend: `AuthContext` simplified — removed `accountType`, `switchUser` always navigates to `/staff`
396: - [x] Frontend: `Navbar` removed customer role badge and accountType logic
397: - [x] Frontend: deleted `EmailVerificationBadge` component
398: - [x] Frontend: `useMyTicket` hook rewritten for public endpoint
399: - [x] Frontend: `CounterConsole` updated — `user.email` → `guestEmail`
400: - [x] All 45 backend + 8 frontend tests pass
401: 
402: ---
403: 
404: ## Phase 8c — Staff Management & Role-Based Dashboards ✅
405: 
406: **Goal:** Managers can manage staff, counters, and queue assignments; admins and managers get role-appropriate overview dashboards.
407: 
408: **Ships:**
409: 
410: - [x] Staff model: added `queues[]` field (ObjectId refs to Queue)
411: - [x] `assignQueuesToStaff` controller: validates queues belong to same branch
412: - [x] `getAllStaff` populates `counter` + `queues`
413: - [x] Legacy route: `PATCH /:staffId/queues`
414: - [x] New `routes/v1/staff.routes.js` (GET /, POST /, PATCH /:staffId/queues, DELETE /:staffId — admin + manager only)
415: - [x] `v1Auth.controller.js`: `/me` returns `queues` array
416: - [x] `features/staff/manageApi.js`: fetchStaffList, createStaff, assignQueuesToStaff, deactivateStaffApi, fetchBranchCounters, createCounter, assign/unassignStaffToCounter, fetchBranchQueues
417: - [x] `ManagePanel.jsx`, `StaffSubTab.jsx`, `CounterSubTab.jsx` created
418: - [x] `CounterConsole.jsx`: filters queue dropdown to assigned queues (fallback to all)
419: - [x] V1 counter assign/unassign routes verified
420: - [x] `admin.controller.js`: `getAdminOverview` (branches, managers with staff counts, summary) — bank-scoping fixed in Phase 12
421: - [x] `routes/v1/admin.routes.js` (admin-only), `routes/v1/analytics.routes.js` (admin + manager, `validateBranchOwnership`)
422: - [x] Both mounted in `routes/v1/index.js`
423: - [x] `features/staff/adminApi.js`: fetchAdminOverview, fetchBranchAnalytics, fetchBranchStaffPerformance, createBranch
424: - [x] `AdminOverview.jsx`: cross-branch dashboard, summary cards, branch list, manager list with staff counts, create branch/manager forms
425: - [x] `ManagerOverview.jsx`: branch analytics — tickets, completion rate, queue lengths, counter status, staff performance
426: - [x] `StaffHome.jsx` tabs: Admin = Overview + Manage; Manager = Overview + Manage (**no Console**); Staff = Console + History
427: - [x] `ManagePanel.jsx`: Admin = Staff sub-tab only; Manager = Staff + Counters sub-tabs
428: - [x] `StaffSubTab.jsx`: admin can create managers (role + branch selectors), shows branch name per staff
429: - [x] Public v1 routes fix: `routes/v1/public.routes.js` mounted before `authenticateApiKey` in `app.js`
430: - [x] All 45 backend + 8 frontend tests pass, `vite build` passes
431: 
432: ---
433: 
434: ## Phase 9 — Webhook Enhancement
435: 
436: **Goal:** Make webhooks a first-class citizen for bank integrations.
437: 
438: **Ships:**
439: 
440: - [ ] Add more event types: `ticket.created`, `ticket.completed`, `ticket.cancelled`, `queue.updated`, `branch.opened`, `branch.closed`
441: - [ ] Exponential backoff retry (1s, 5s, 30s, 5min, 30min)
442: - [ ] Webhook delivery log model (event, payload, status, response, timestamp)
443: - [ ] `GET /api/v1/webhooks/:id/deliveries` endpoint
444: - [ ] Webhook test endpoint: `POST /api/v1/webhooks/:id/test` (sends test event)
445: 
446: ---
447: 
448: ## Phase 10 — API Documentation & Integration Guide
449: 
450: **Goal:** Banks can integrate without reading source code.
451: 
452: **Ships:**
453: 
454: - [ ] Update OpenAPI spec for all v1 endpoints
455: - [ ] Add API key authentication to Swagger UI
456: - [ ] Write integration guide: "Integrate Cue into Your Bank's System"
457: - [ ] Document webhook payloads and verification
458: - [ ] Document rate limits and error codes
459: - [ ] Update README files
460: 
461: ---
462: 
463: ## Phase 11 — Testing & CI Updates
464: 
465: **Goal:** Ensure the refactored system works correctly.
466: 
467: **Ships:**
468: 
469: - [ ] Update existing tests for v1 routes
470: - [ ] Add API key auth tests
471: - [ ] Add multi-tenancy isolation tests
472: - [ ] Update CI pipeline for new structure
473: - [ ] Update frontend tests for removed features
474: - [ ] Run full test suite, fix any regressions
475: 
476: ---
477: 
478: ## Phase 12 — Platform Superadmin Console & Bank-Scoped Admin (Option B) ✅
479: 
480: **Goal:** Split platform operations (superadmin) from bank operations (bank-scoped admin). Superadmin monitors API usage and exclusively owns API key lifecycle; bank admin requests keys for their own bank. Everything bank-facing becomes bank-scoped.
481: 
482: **Decisions (locked):**
483: 
484: | Topic | Decision |
485: |---|---|
486: | Superadmin auth | JWT-only login at `/platform`; only persona who must log in; excluded from demo user switcher |
487: | Dashboard | New `/platform` route: Overview / API Keys / Key Requests |
488: | Usage tracking | Daily buckets (`ApiKeyUsage`) + `ApiKey.requestCount` total |
489: | Key ownership | Superadmin only creates/revokes/suspends/rotates; bank admin only **requests** |
490: | Bank admin UI | Visible **"Request API key"** button + request-status list on AdminOverview |
491: | Request form | Multi-select scopes: `branches:read`, `tickets:read`, `tickets:write`, `staff:read`, `analytics:read`, `webhooks:manage` (`admin` scope reserved for superadmin-created keys) |
492: | Raw-key delivery | **Encrypted one-time store**: on approve, AES-256-GCM-encrypt raw key onto `ApiKeyRequest`; shown once to superadmin immediately; bank admin's first GET of approved request returns raw key once then ciphertext is permanently deleted |
493: | Rotation reveal | **Approval only** — rotated keys shown once to superadmin; bank admin does not get rotation reveals |
494: | Platform scope v1 | **Keys + usage only** (no bank/branch health, no other platform actions yet) |
495: | Bank scoping (Option B) | Fix `getAdminOverview` + `canAccessBranch`; audit remaining admin routes |
496: 
497: **Architecture after this phase:**
498: 
499: ```
500: Superadmin (platform operator)
501:   └─ JWT login at POST /api/platform/login
502:   └─ Dashboard at /platform  (Overview | API Keys | Key Requests)
503:   └─ Owns: key CRUD, usage monitoring, key-request approval
504:   └─ NOT in demo user switcher, NOT bank-scoped, no API key needed
505: 
506: Bank Admin / Manager / Staff (bank personas)
507:   └─ Demo API-key + X-Staff-Id switcher (unchanged)
508:   └─ /staff dashboard (admin now bank-scoped)
509:   └─ Bank admin: POST /api/v1/api-key-requests to request a key
510:   └─ Superadmin approves → key created → raw key shown once to superadmin,
511:      staged encrypted for bank admin's one-time reveal from request status
512: ```
513: 
514: **Route security split:**
515: 
516: ```
517: /api/platform/*            → protect (JWT) + authorize("superadmin")  ← no bankScope
518: /api/v1/api-keys/*         → REMOVED (multi-tenancy hole: any admin saw all keys)
519: /api/v1/api-key-requests/* → API-key auth + authorize("admin") + bankScope
520: ```
521: 
522: **Work packages (execution order):**
523: 
524: ### WP1 — Superadmin role foundation ✅
525: - [x] `staff.model.js`: add `"superadmin"` to role enum
526: - [x] `seedSuperadmin.js` (new) + `seed:superadmin` npm script + `.env.example` vars (`SEED_SUPERADMIN_EMAIL`, `SEED_SUPERADMIN_PASSWORD`)
527: - [x] `demo.controller.js`: exclude `role: "superadmin"` from `getDemoUsers`
528: 
529: ### WP2 — Platform routes (JWT, outside `/api/v1`) ✅
530: - [x] New `routes/platform/*` + `controllers/platform/*`
531: - [x] Endpoints:
532:   ```
533:   POST   /api/platform/login
534:   GET    /api/platform/me
535:   GET    /api/platform/overview
536:   GET    /api/platform/api-keys
537:   POST   /api/platform/api-keys
538:   DELETE /api/platform/api-keys/:id
539:   PATCH  /api/platform/api-keys/:id/toggle
540:   POST   /api/platform/api-keys/:id/rotate
541:   GET    /api/platform/usage?days=7
542:   GET    /api/platform/key-requests?status=
543:   PATCH  /api/platform/key-requests/:id     → approve | reject
544:   ```
545: - [x] Mount in `app.js` before v1; `protect` + `authorize("superadmin")` at router level (login route open)
546: - [x] Reuse/adapt existing apiKey controller logic into `platformApiKey.controller.js`; new `platformUsage.controller.js`, `platformKeyRequest.controller.js`, `platformAuth.controller.js`
547: 
548: ### WP3 — Usage tracking (daily buckets + total) ✅
549: - [x] New `apiKeyUsage.model.js` (`{apiKey, date:"YYYY-MM-DD", count}`, unique compound index + TTL)
550: - [x] `apiKey.model.js`: add `requestCount` (default 0)
551: - [x] `apiKey.middleware.js`: fire-and-forget `$inc` upsert on UsageLog + `requestCount` alongside existing `lastUsedAt` write
552: 
553: ### WP4 — Bank-admin key request flow + dual reveal ✅
554: - [x] New `apiKeyRequest.model.js`: `bankName`, `requestedBy` (Staff ref), `label`, `scopes[]`, `rateLimit`, `status: pending/approved/rejected`, `reviewedBy`, `reviewNote`, `apiKey` ref, **`encryptedRawKey`** (iv+tag+payload), **`rawKeyStagedAt`**, `bankKeyRevealedAt`, timestamps
555: - [x] New v1 routes `apiKeyRequest.routes.js`:
556:   - `POST /` (bankName from `req.bankName`, requestedBy from `req.user`; blocks duplicate pending)
557:   - `GET /` (own bank's requests; exposes `canRevealKey`)
558:   - `GET /:id` one-time reveal: if approved + not yet revealed → decrypt, return raw key, wipe ciphertext, set `bankKeyRevealedAt`
559: - [x] Platform approve: generate key → create ApiKey → link request → encrypt raw key onto request → return raw key once to superadmin
560: - [x] Crypto helper `utils/keyWrap.js`: AES-256-GCM with key derived from `KEY_WRAP_SECRET` (fallback `JWT_SECRET`)
561: - [x] Mount in `routes/v1/index.js` with `authorize("admin")`
562: 
563: ### WP5 — Remove multi-tenancy hole ✅
564: - [x] Remove `app.use("/api/v1/api-keys", apiKeyRouter)` from `app.js`
565: - [x] Delete `routes/apiKey.routes.js` + orphaned `controllers/apiKey.controller.js` (no frontend consumers)
566: 
567: ### WP6 — Bank-scoping fixes (Option B) ✅
568: - [x] `admin.controller.js` `getAdminOverview`: filter branches by `req.bankName`; managers by `branch ∈ req.bankBranchIds`; staff count scoped when bank present
569: - [x] `analytics.controller.js` `canAccessBranch`: now async; admin with `req.bankName` must match `branch.bank`; legacy JWT admin keeps permissive behavior; all 3 call sites await it
570: - [x] Audit other `authorize("admin")` routes: `export` / `staffImport` / `advancedAnalytics` are legacy-JWT-only and NOT called from the demo frontend (Phase 7 moved their UI to deferred/) — left unscoped for single-deployment legacy mode; not reachable from bank-scoped demo UI
571: 
572: ### WP7 — Frontend `/platform` console + bank admin request UI ✅
573: - [x] `pages/Platform/PlatformLogin.jsx` + `PlatformDashboard.jsx` + `Platform.module.css` (Verdant Trust; adapted deferred AdminLogin styling)
574: - [x] Dashboard tabs: **Overview** (keys, active keys, requests today/7d bars, pending count, top keys), **API Keys** (table + create/suspend/revoke/rotate, raw key modal once), **Key Requests** (pending, approve→show raw key once, reject with note)
575: - [x] `AuthContext`: dual mode — `apiKey` (demo staff) vs `token` (superadmin, calls `/platform/me`); `loginPlatform()` helper
576: - [x] `ProtectedRoute`: accepts either apiKey or token; role check unchanged
577: - [x] `App.jsx`: `/platform/login`, `/platform` (ProtectedRoute `["superadmin"]`)
578: - [x] `Navbar`: superadmin sees Platform link, no user switcher; `superadmin` role badge CSS
579: - [x] `AdminOverview.jsx`: **"Request API key"** form (label + rateLimit + multi-select scope chips) + request status list (pending/approved/rejected; approved unrevealed shows **"Reveal key"** button → one-time GET → modal with copy)
580: - [x] New `features/platform/platformApi.js`; new `features/staff/apiKeyRequestApi.js`
581: - [x] Fix unused `motion` import in `ManagePanel.jsx:2`
582: 
583: ### WP8 — Tests ✅
584: - [x] `superadmin.authorize.test.js`: superadmin passes superadmin routes; rejected from bank admin routes; bank admin rejected from superadmin routes (4 tests)
585: - [x] `keyWrap.test.js`: encrypt/decrypt round-trip, random IV, wrong-secret fail, tamper fail, short-ciphertext fail, JWT_SECRET fallback, `usageDateKey` formatting (9 tests)
586: - [x] Existing tests still pass: **58 backend** (was 45, +13 new) + **8 frontend**
587: - [x] `node --check` all backend JS passes; `vite build` passes
588: 
589: ### WP9 — Docs & plan bookkeeping ✅
590: - [x] `.env.example`: superadmin seed vars + `KEY_WRAP_SECRET`
591: - [x] Understandable comments on all new code
592: - [x] This Phase 12 section updated with ship status
593: - [x] Full test suite run (58 backend + 8 frontend, all green)
594: 
595: **Not in scope for Phase 12:** webhooks/docs phases (9–11), pre-existing lint debt in untouched files, platform bank/branch management, OpenAPI updates for platform routes (deferred to Phase 10).
596: 
597: ---
598: 
599: ## Cross-cutting
600: 
601: - [ ] Update `BUILD_PLAN.md` with final status
602: - [ ] Update `README.md` with new architecture overview
603: - [ ] Update `backend/README.md` with v1 API reference
604: - [ ] Update `frontend/README.md` with simplified feature list
605: - [ ] Update `.env.example` with new variables (API_KEY_SECRET, etc.)

(End of file - total 605 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/package.json"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/package.json</path>
<type>file</type>
<content>
1: {
2:   "name": "smart-queue-management-system",
3:   "version": "1.0.0",
4:   "description": "This is a RESTful backend service designed to help users to join queues remotely, to track their positions, to manage and call the next ticket....",
5:   "type": "module",
6:   "main": "server.js",
7:   "scripts": {
8:     "dev": "nodemon src/server.js",
9:     "start": "node src/server.js",
10:     "seed:admin": "node src/scripts/seedAdmin.js",
11:     "seed:superadmin": "node src/scripts/seedSuperadmin.js",
12:     "seed:apikey": "node src/scripts/seedApiKey.js",
13:     "migrate:split-staff": "node src/scripts/migrateSplitStaff.js",
14:     "test": "vitest run",
15:     "test:watch": "vitest"
16:   },
17:   "repository": {
18:     "type": "git",
19:     "url": "git+.git"
20:   },
21:   "keywords": [],
22:   "author": "",
23:   "license": "ISC",
24:   "bugs": {
25:     "url": "https://github.com/ayomidade/Smart-Queue-Management-System-Backend-API/issues"
26:   },
27:   "homepage": "https://github.com/ayomidade/Smart-Queue-Management-System-Backend-API#readme",
28:   "dependencies": {
29:     "bcryptjs": "^3.0.3",
30:     "compression": "^1.8.2",
31:     "cors": "^2.8.6",
32:     "dotenv": "^17.4.2",
33:     "express": "^5.2.1",
34:     "express-rate-limit": "^8.6.2",
35:     "express-validator": "^7.3.2",
36:     "groq-sdk": "^1.6.0",
37:     "helmet": "^8.3.0",
38:     "js-yaml": "^5.3.0",
39:     "jsonwebtoken": "^9.0.3",
40:     "mongoose": "^9.9.3",
41:     "multer": "^2.3.0",
42:     "resend": "^6.21.0",
43:     "socket.io": "^4.8.3",
44:     "swagger-jsdoc": "^6.3.0",
45:     "swagger-ui-express": "^5.0.1",
46:     "web-push": "^3.6.7"
47:   },
48:   "devDependencies": {
49:     "nodemon": "^3.1.14",
50:     "vitest": "^5.0.0"
51:   },
52:   "allowScripts": {
53:     "@scarf/scarf@1.4.0": true
54:   }
55: }

(End of file - total 55 lines)
</content>
```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 48.5s)

_Thinking:_

Now I need to write tests for `canRevealKey` and `keyStatus` logic, then run the full test suite.

I'll create a new test file that tests the exported `mapBankKeyRequest` and `resolveKeyStatus` helpers directly - that's the cleanest way since the routes are Express handlers. I can also test the deleteApiKey controller for ciphertext cleanup.

Let me write tests for:
1. `canRevealKey` logic in `mapBankKeyRequest` - true when approved + encryptedRawKey present + not yet revealed; false after revealed; false when pending/rejected
2. `keyStatus` via `resolveKeyStatus` - null when pending/rejected; "revoked" when apiKey missing or keyDoc null; "suspended" when isActive false; "active" when isActive true
3. Ciphertext never in mapped output
4. `deleteApiKey` clears encryptedRawKey on linked requests

Let me write the test file.

Writing tests for `canRevealKey`, `keyStatus`, and revoke ciphertext cleanup.

**Tool: write**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/tests/platform/adminApiKeyRequest.test.js",
  "content": "import { describe, it, expect, vi, beforeEach } from \"vitest\";\nimport {\n  mapBankKeyRequest,\n  resolveKeyStatus,\n} from \"../../src/routes/adminApiKeyRequest.routes.js\";\nimport { deleteApiKey } from \"../../src/controllers/platform/platformApiKey.controller.js\";\nimport ApiKey from \"../../src/models/apiKey.model.js\";\nimport ApiKeyRequest from \"../../src/models/apiKeyRequest.model.js\";\n\n/**\n * Bank-admin API key request list helpers + revoke cleanup (Phase 13 fixes).\n *\n * Bug 1: list used to `.select(\"-encryptedRawKey\")` before computing\n * canRevealKey → Reveal button never appeared. mapBankKeyRequest now\n * requires the ciphertext on the in-memory doc and never returns it.\n *\n * Bug 2: revoke (ApiKey.findByIdAndDelete) left ApiKeyRequest untouched and\n * the bank-admin list had no live key status. deleteApiKey now unsets staged\n * ciphertext; resolveKeyStatus reports active/suspended/revoked/null.\n */\nconst baseRequest = (overrides = {}) => ({\n  _id: \"64b0000000000000000000aa\",\n  bankName: \"acme\",\n  label: \"prod\",\n  scopes: [\"tickets:read\"],\n  rateLimit: 100,\n  status: \"pending\",\n  reviewNote: \"\",\n  apiKey: null,\n  encryptedRawKey: null,\n  bankKeyRevealedAt: null,\n  createdAt: new Date(\"2026-01-01T00:00:00.000Z\"),\n  ...overrides,\n});\n\nconst mockRes = () => {\n  const res = {};\n  res.status = vi.fn().mockReturnValue(res);\n  res.json = vi.fn().mockReturnValue(res);\n  return res;\n};\n\ndescribe(\"mapBankKeyRequest — canRevealKey\", () => {\n  beforeEach(() => {\n    vi.clearAllMocks();\n  });\n\n  it(\"canRevealKey is true for approved + ciphertext + not yet revealed\", () => {\n    const mapped = mapBankKeyRequest(\n      baseRequest({\n        status: \"approved\",\n        encryptedRawKey: \"iv.tag.payload\",\n        bankKeyRevealedAt: null,\n        apiKey: \"64b0000000000000000000bb\",\n      }),\n    );\n    expect(mapped.canRevealKey).toBe(true);\n    expect(mapped.encryptedRawKey).toBeUndefined();\n  });\n\n  it(\"canRevealKey is false after bank admin has revealed\", () => {\n    const mapped = mapBankKeyRequest(\n      baseRequest({\n        status: \"approved\",\n        encryptedRawKey: null,\n        bankKeyRevealedAt: new Date(),\n        apiKey: \"64b0000000000000000000bb\",\n      }),\n    );\n    expect(mapped.canRevealKey).toBe(false);\n    expect(mapped.revealedAt).toBeTruthy();\n  });\n\n  it(\"canRevealKey is false for pending and rejected requests\", () => {\n    expect(\n      mapBankKeyRequest(\n        baseRequest({ status: \"pending\", encryptedRawKey: \"staged\" }),\n      ).canRevealKey,\n    ).toBe(false);\n    expect(\n      mapBankKeyRequest(\n        baseRequest({ status: \"rejected\", encryptedRawKey: \"staged\" }),\n      ).canRevealKey,\n    ).toBe(false);\n  });\n\n  it(\"never includes ciphertext in the mapped payload\", () => {\n    const mapped = mapBankKeyRequest(\n      baseRequest({\n        status: \"approved\",\n        encryptedRawKey: \"iv.tag.payload\",\n        bankKeyRevealedAt: null,\n      }),\n    );\n    expect(Object.keys(mapped)).not.toContain(\"encryptedRawKey\");\n    expect(JSON.stringify(mapped)).not.toContain(\"iv.tag.payload\");\n  });\n});\n\ndescribe(\"resolveKeyStatus — live key health\", () => {\n  it(\"is null until the request is approved\", () => {\n    expect(\n      resolveKeyStatus(baseRequest({ status: \"pending\" }), {\n        isActive: true,\n      }),\n    ).toBeNull();\n    expect(\n      resolveKeyStatus(baseRequest({ status: \"rejected\" }), null),\n    ).toBeNull();\n  });\n\n  it(\"is active when linked ApiKey exists and isActive\", () => {\n    expect(\n      resolveKeyStatus(\n        baseRequest({ status: \"approved\", apiKey: \"64b0000000000000000000bb\" }),\n        { isActive: true, keyPrefix: \"cue_abcd\" },\n      ),\n    ).toBe(\"active\");\n  });\n\n  it(\"is suspended when linked ApiKey is disabled\", () => {\n    expect(\n      resolveKeyStatus(\n        baseRequest({ status: \"approved\", apiKey: \"64b0000000000000000000bb\" }),\n        { isActive: false },\n      ),\n    ).toBe(\"suspended\");\n  });\n\n  it(\"is revoked when apiKey ref is set but ApiKey doc is gone (superadmin delete)\", () => {\n    expect(\n      resolveKeyStatus(\n        baseRequest({ status: \"approved\", apiKey: \"64b0000000000000000000bb\" }),\n        null,\n      ),\n    ).toBe(\"revoked\");\n  });\n\n  it(\"is revoked when approved request has no linked ApiKey\", () => {\n    expect(\n      resolveKeyStatus(baseRequest({ status: \"approved\", apiKey: null }), null),\n    ).toBe(\"revoked\");\n  });\n});\n\ndescribe(\"mapBankKeyRequest — keyStatus + keyPrefix join\", () => {\n  it(\"surfaces keyStatus and keyPrefix for approved requests\", () => {\n    const mapped = mapBankKeyRequest(\n      baseRequest({\n        status: \"approved\",\n        encryptedRawKey: \"staged\",\n        bankKeyRevealedAt: null,\n        apiKey: \"64b0000000000000000000bb\",\n      }),\n      { _id: \"64b0000000000000000000bb\", isActive: true, keyPrefix: \"cue_abcd\" },\n    );\n    expect(mapped.keyStatus).toBe(\"active\");\n    expect(mapped.keyPrefix).toBe(\"cue_abcd\");\n    expect(mapped.canRevealKey).toBe(true);\n  });\n\n  it(\"reports revoked when join misses the ApiKey doc\", () => {\n    const mapped = mapBankKeyRequest(\n      baseRequest({\n        status: \"approved\",\n        encryptedRawKey: null,\n        bankKeyRevealedAt: new Date(),\n        apiKey: \"64b0000000000000000000bb\",\n      }),\n      null,\n    );\n    expect(mapped.keyStatus).toBe(\"revoked\");\n    expect(mapped.keyPrefix).toBeNull();\n  });\n\n  it(\"keyStatus is null for non-approved requests\", () => {\n    const mapped = mapBankKeyRequest(baseRequest({ status: \"pending\" }), null);\n    expect(mapped.keyStatus).toBeNull();\n    expect(mapped.keyPrefix).toBeNull();\n  });\n});\n\ndescribe(\"deleteApiKey — revoke clears staged reveal ciphertext\", () => {\n  beforeEach(() => {\n    vi.clearAllMocks();\n  });\n\n  it(\"unsets encryptedRawKey + rawKeyStagedAt on linked requests\", async () => {\n    const key = { _id: \"64b0000000000000000000bb\", bankName: \"acme\" };\n    vi.spyOn(ApiKey, \"findByIdAndDelete\").mockResolvedValue(key);\n    const updateManySpy = vi\n      .spyOn(ApiKeyRequest, \"updateMany\")\n      .mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });\n\n    const res = mockRes();\n    const next = vi.fn();\n    await deleteApiKey(\n      { params: { id: \"64b0000000000000000000bb\" }, body: {} },\n      res,\n      next,\n    );\n\n    expect(next).not.toHaveBeenCalled();\n    expect(updateManySpy).toHaveBeenCalledWith(\n      { apiKey: key._id },\n      { $unset: { encryptedRawKey: 1, rawKeyStagedAt: 1 } },\n    );\n    expect(res.status).toHaveBeenCalledWith(200);\n    const payload = res.json.mock.calls[0][0];\n    expect(payload.message).toContain(\"revoked\");\n  });\n\n  it(\"returns 404 when the key is already gone\", async () => {\n    vi.spyOn(ApiKey, \"findByIdAndDelete\").mockResolvedValue(null);\n    const updateManySpy = vi.spyOn(ApiKeyRequest, \"updateMany\");\n\n    const res = mockRes();\n    await deleteApiKey(\n      { params: { id: \"64b0000000000000000000bb\" }, body: {} },\n      res,\n      vi.fn(),\n    );\n\n    expect(res.status).toHaveBeenCalledWith(404);\n    expect(updateManySpy).not.toHaveBeenCalled();\n  });\n});\n"
}
```

**Output:**
```
Wrote file successfully.
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/package.json"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/package.json</path>
<type>file</type>
<content>
1: {
2:   "name": "frontend",
3:   "private": true,
4:   "version": "0.0.0",
5:   "type": "module",
6:   "scripts": {
7:     "dev": "vite",
8:     "build": "vite build",
9:     "lint": "eslint .",
10:     "test": "vitest run",
11:     "test:watch": "vitest",
12:     "preview": "vite preview"
13:   },
14:   "dependencies": {
15:     "framer-motion": "^13.1.0",
16:     "gsap": "^3.15.0",
17:     "react": "^19.2.8",
18:     "react-dom": "^19.2.8",
19:     "react-router-dom": "^7.18.2",
20:     "socket.io-client": "^4.8.3"
21:   },
22:   "devDependencies": {
23:     "@eslint/js": "^10.0.1",
24:     "@testing-library/jest-dom": "^7.0.1",
25:     "@testing-library/react": "^16.3.3",
26:     "@testing-library/user-event": "^14.6.7",
27:     "@types/react": "^19.2.17",
28:     "@types/react-dom": "^19.2.3",
29:     "@vitejs/plugin-react": "^6.0.4",
30:     "eslint": "^10.8.0",
31:     "eslint-plugin-react-hooks": "^7.1.1",
32:     "eslint-plugin-react-refresh": "^0.5.3",
33:     "globals": "^17.7.0",
34:     "jsdom": "^30.0.1",
35:     "vite": "^8.2.0",
36:     "vitest": "^5.0.0"
37:   }
38: }

(End of file - total 38 lines)
</content>
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "frontend/src/**/*.test.{js,jsx}"
}
```

**Output:**
```
/home/gamp/Desktop/cue/frontend/src/lib/__tests__/apiClient.test.js
/home/gamp/Desktop/cue/frontend/src/components/ErrorBoundary/__tests__/ErrorBoundary.test.jsx
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "backend/.env.example"
}
```

**Output:**
```
/home/gamp/Desktop/cue/backend/.env.example
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "**/.env.example"
}
```

**Output:**
```
/home/gamp/Desktop/cue/frontend/.env.example
/home/gamp/Desktop/cue/backend/.env.example
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "README.md"
}
```

**Output:**
```
/home/gamp/Desktop/cue/README.md
/home/gamp/Desktop/cue/backend/README.md
/home/gamp/Desktop/cue/frontend/README.md
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "**/README.md"
}
```

**Output:**
```
/home/gamp/Desktop/cue/README.md
/home/gamp/Desktop/cue/backend/README.md
/home/gamp/Desktop/cue/frontend/README.md
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/utils/keyWrap.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/utils/keyWrap.js</path>
<type>file</type>
<content>
1: import crypto from "crypto";
2: 
3: /**
4:  * Key wrap helper — AES-256-GCM encryption for staged raw API keys.
5:  *
6:  * When a superadmin approves a bank admin's key request, the raw key is
7:  * shown once to the superadmin AND staged encrypted on the ApiKeyRequest
8:  * document so the bank admin can reveal it once from their request status.
9:  * After the bank admin reveals it, the ciphertext is wiped permanently.
10:  *
11:  * The encryption key is derived from KEY_WRAP_SECRET (falls back to JWT_SECRET)
12:  * via SHA-256, so no extra key material is required in the environment for
13:  * basic setups.
14:  *
15:  * Ciphertext format (base64): iv || authTag || encryptedPayload
16:  */
17: 
18: const ALGO = "aes-256-gcm";
19: const IV_LENGTH = 12; // standard GCM nonce length
20: const TAG_LENGTH = 16;
21: 
22: function getSecret() {
23:   const secret = process.env.KEY_WRAP_SECRET || process.env.JWT_SECRET;
24:   if (!secret) {
25:     throw new Error(
26:       "KEY_WRAP_SECRET or JWT_SECRET must be set to encrypt staged API keys",
27:     );
28:   }
29:   return crypto.createHash("sha256").update(secret).digest();
30: }
31: 
32: /**
33:  * Encrypt a plaintext string (the raw API key).
34:  * Returns a single base64 string safe to store on the request document.
35:  */
36: export function encryptKey(plaintext) {
37:   const key = getSecret();
38:   const iv = crypto.randomBytes(IV_LENGTH);
39:   const cipher = crypto.createCipheriv(ALGO, key, iv);
40:   const encrypted = Buffer.concat([
41:     cipher.update(plaintext, "utf8"),
42:     cipher.final(),
43:   ]);
44:   const tag = cipher.getAuthTag();
45:   return Buffer.concat([iv, tag, encrypted]).toString("base64");
46: }
47: 
48: /**
49:  * Decrypt a ciphertext produced by encryptKey.
50:  * Throws if the payload was tampered with (GCM auth fails).
51:  */
52: export function decryptKey(ciphertextB64) {
53:   const key = getSecret();
54:   const raw = Buffer.from(ciphertextB64, "base64");
55:   if (raw.length <= IV_LENGTH + TAG_LENGTH) {
56:     throw new Error("Invalid ciphertext: too short");
57:   }
58:   const iv = raw.subarray(0, IV_LENGTH);
59:   const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
60:   const encrypted = raw.subarray(IV_LENGTH + TAG_LENGTH);
61:   const decipher = crypto.createDecipheriv(ALGO, key, iv);
62:   decipher.setAuthTag(tag);
63:   return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
64:     "utf8",
65:   );
66: }
67: 
68: /** Today's date as YYYY-MM-DD (UTC) — used for UsageLog daily buckets. */
69: export function usageDateKey(date = new Date()) {
70:   return date.toISOString().slice(0, 10);
71: }

(End of file - total 71 lines)
</content>
```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 64.7s)

_Thinking:_

Let me run the tests now - backend and frontend - plus vite build.

Running backend and frontend tests plus build.

**Tool: bash**

**Input:**
```json
{
  "command": "npm test 2>&1",
  "workdir": "/home/gamp/Desktop/cue/backend",
  "timeout": 120000
}
```

**Output:**
```
npm notice run smart-queue-management-system@1.0.0 test
npm notice run vitest run

 RUN  v5.0.0 /home/gamp/Desktop/cue/backend


 Test Files  17 passed (17)
      Tests  137 passed (137)
   Start at  13:01:16
   Duration  25.52s (import 72%, transform 20%, tests 5%, worker 4%)

    Isolate  17 workers spawned · ~1.48s startup each (spawn + environment, per file)
             at least ~6.91s faster with isolate: false — reuses workers across files instead of one per file


```

**Tool: bash**

**Input:**
```json
{
  "command": "npm test 2>&1 && npm run build 2>&1",
  "workdir": "/home/gamp/Desktop/cue/frontend",
  "timeout": 120000
}
```

**Output:**
```
npm notice run frontend@0.0.0 test
npm notice run vitest run

 RUN  v5.0.0 /home/gamp/Desktop/cue/frontend


 Test Files  2 passed (2)
      Tests  8 passed (8)
   Start at  13:01:15
   Duration  14.90s (environment 80%, setup 8%, transform 4%, import 4%, tests 3%)

npm notice run frontend@0.0.0 build
npm notice run vite build
vite v8.2.2 building client environment for production...
transforming...
✓ 551 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                 0.54 kB │ gzip:  0.32 kB
dist/assets/SplitFlapBoard-CScboK_F.css         0.04 kB │ gzip:  0.06 kB
dist/assets/MotionBackground-EDPDeuNe.css       0.44 kB │ gzip:  0.27 kB
dist/assets/FlapUnit-DSD43QmB.css               0.70 kB │ gzip:  0.38 kB
dist/assets/Contact-Cd2pagkb.css                2.39 kB │ gzip:  0.84 kB
dist/assets/LoginPage-B4Vixr4H.css              2.47 kB │ gzip:  0.92 kB
dist/assets/NearestBranch-Devvl3jF.css          2.75 kB │ gzip:  0.90 kB
dist/assets/Branch-CqJodSU_.css                 3.12 kB │ gzip:  0.96 kB
dist/assets/Kiosk-CIx0xwPK.css                  3.56 kB │ gzip:  0.98 kB
dist/assets/Boards-CI7PsP93.css                 3.78 kB │ gzip:  1.22 kB
dist/assets/TicketPage-BmnPbBSs.css             4.13 kB │ gzip:  1.23 kB
dist/assets/Appointment-Db7QMx4x.css            4.26 kB │ gzip:  1.16 kB
dist/assets/NotFound-BZmeblkS.css               4.36 kB │ gzip:  1.58 kB
dist/assets/Board-DcZVuyKg.css                  5.39 kB │ gzip:  1.58 kB
dist/assets/index-xkllxhr3.css                  6.57 kB │ gzip:  2.09 kB
dist/assets/Platform-DC6vainy.css               7.71 kB │ gzip:  1.91 kB
dist/assets/Landing-BwrVP7ac.css                8.78 kB │ gzip:  1.89 kB
dist/assets/StaffHome-DOlY-_Yf.css             15.31 kB │ gzip:  2.92 kB
dist/assets/prefersReducedMotion-H_9XR_Vq.js    0.10 kB │ gzip:  0.11 kB
dist/assets/SplitFlapBoard-lZaAiP_Q.js          0.57 kB │ gzip:  0.39 kB
dist/assets/FlapUnit-CjdPGZGi.js                0.77 kB │ gzip:  0.45 kB
dist/assets/MotionBackground-BYY9E_Z5.js        0.91 kB │ gzip:  0.49 kB
dist/assets/Platform.module-CSE0V78f.js         1.64 kB │ gzip:  0.61 kB
dist/assets/PlatformLogin-BEfGOPTP.js           2.60 kB │ gzip:  1.16 kB
dist/assets/LoginPage-Cq3oYdj3.js               3.68 kB │ gzip:  1.58 kB
dist/assets/NearestBranch-CYtwcpGa.js           4.03 kB │ gzip:  1.55 kB
dist/assets/Branch-ttPbMdun.js                  4.59 kB │ gzip:  1.73 kB
dist/assets/Contact-CvzJC1UY.js                 4.77 kB │ gzip:  1.88 kB
dist/assets/Kiosk-CQdZO648.js                   5.26 kB │ gzip:  2.01 kB
dist/assets/Boards-AyoNmczF.js                  6.41 kB │ gzip:  2.15 kB
dist/assets/Appointment-Dv0b9WEE.js             8.11 kB │ gzip:  2.65 kB
dist/assets/TicketPage-Cz_rIm8a.js              8.16 kB │ gzip:  2.71 kB
dist/assets/Board-CqXrV2Yb.js                   8.95 kB │ gzip:  2.99 kB
dist/assets/PlatformDashboard-BgVs5YAL.js      10.22 kB │ gzip:  3.03 kB
dist/assets/NotFound-Cm1-Hgu6.js               11.01 kB │ gzip:  4.14 kB
dist/assets/StaffHome-DtsrtFAy.js              39.89 kB │ gzip:  9.20 kB
dist/assets/esm-Ckkn2Ami.js                    41.16 kB │ gzip: 12.86 kB
dist/assets/Landing-DN9BJry8.js                63.03 kB │ gzip: 25.15 kB
dist/assets/gsap-DWxn8li7.js                   69.58 kB │ gzip: 27.28 kB
dist/assets/proxy-GcLvUCXa.js                 129.60 kB │ gzip: 42.29 kB
dist/assets/index-CDoassWe.js                 241.78 kB │ gzip: 77.50 kB

✓ built in 6.12s

```

**Tool: bash**

**Input:**
```json
{
  "command": "node --check src/routes/adminApiKeyRequest.routes.js && node --check src/controllers/platform/platformApiKey.controller.js && node --check tests/platform/adminApiKeyRequest.test.js && echo OK",
  "workdir": "/home/gamp/Desktop/cue/backend"
}
```

**Output:**
```
OK

```

---

## Assistant (Build · MiMo-V2.6-Flash Free · 10.5s)

_Thinking:_

All tests pass:
- Backend: 137 tests (was 123, +14 new)
- Frontend: 8 tests
- vite build OK
- node --check OK

The API-key fix task is complete. Let me summarize what was done for the user.

All green: **137 backend** (was 123, +14 new) + **8 frontend**, `vite build` ok, `node --check` ok.

### Fixes implemented

**1. Reveal never showed** (`adminApiKeyRequest.routes.js`)
- Removed `.select("-encryptedRawKey")` from list — `canRevealKey` now sees the ciphertext
- Ciphertext never in JSON: `mapBankKeyRequest()` strips it; single GET decrypts → returns `key` once → unsets ciphertext

**2. Revoke/suspend invisible** — list now joins linked `ApiKey`:
- `keyStatus`: `active` | `suspended` (`isActive=false`) | `revoked` (ApiKey deleted or no ref) | `null` (not approved)
- `keyPrefix` for "ends in …"

**3. Revoke cleanup** (`platformApiKey.controller.js`)
- `deleteApiKey` now `$unset`s `encryptedRawKey` + `rawKeyStagedAt` on linked `ApiKeyRequest`s — can't reveal a dead key

**4. Frontend** (`AdminOverview.jsx`)
- Second badge next to status for approved keys (active/suspended/revoked, color-coded + tooltips)
- Usage note: `X-API-Key: cue_…` on `/api/v1/*`; dashboard uses JWT

**5. Tests** — new `backend/tests/platform/adminApiKeyRequest.test.js` (14 cases): `canRevealKey` matrix, `resolveKeyStatus` matrix, ciphertext never leaked, revoke unsets staged ciphertext.

**What was wrong (recap):** list `.select`’d ciphertext out before computing `canRevealKey` → always `false`; no join to live `ApiKey` → revoke/suspend invisible.

Next: **WP9** (docs, env cleanup, final test pass) — or verify live with Mongo up. Want me to proceed to WP9?

---

## User

how are the admins to send the key to their systems?
Is there a way to have an interface for it?

---

## Assistant (Plan · MiMo-V2.6-Flash Free · 13.5s)

_Thinking:_

The user is asking a product/design question about how bank admins send/use the API key for their systems, and whether there's an interface for it.

I'm in Plan Mode - read only. I should explore the current codebase to understand what exists for key delivery/reveal and what an "interface for it" might mean, then present a plan/options.

Let me understand the current flow:
1. Bank admin requests key via AdminOverview
2. Superadmin approves → key created, raw key shown once to superadmin, staged encrypted on ApiKeyRequest
3. Bank admin reveals once via AdminOverview (now fixed)
4. Bank admin needs to put that key in their bank's own systems (core banking, backend, etc.) as `X-API-Key: cue_...`

The question "how are the admins to send the key to their systems?" - they reveal it, copy it, then configure it in their bank's own software. There's currently no "interface" for pushing the key to their systems.

What could "interface" mean?
- Documentation/guide on how to use the key
- A setup wizard that shows curl examples, code snippets
- Multiple key slots / integration profiles so they can manage keys for different systems
- A way to verify the key works from the UI (test connection button)
- Export/secure handoff options
- Maybe they mean: how does the bank admin technically deliver it to their servers - there's no secure channel, just copy-paste

I should explore what currently exists in the UI and docs, then propose options and ask clarifying questions.

Let me search the codebase for relevant pieces - AdminOverview reveal flow, platform docs, README, API docs.

I'll look at how key delivery works today and what surfaces exist, then propose interface options.

**Tool: grep**

**Input:**
```json
{
  "pattern": "Reveal key|X-API-Key|integration|curl",
  "path": "/home/gamp/Desktop/cue",
  "include": "*.{md,jsx,js,html}"
}
```

**Output:**
```
Found 28 matches
/home/gamp/Desktop/cue/BUILD_PLAN.md:
  Line 20: | Auth              | JWT tokens for all users               | API keys for bank integrations          |

  Line 61: **Goal:** Replace the demo switcher with real per-role login/registration and split identity into four collections. Dashboard becomes JWT-only; v1 stays API-key-only for bank integrations.

  Line 117: - [x] v1 role authorize removed where resolveStaffUser always sets role "staff" (would 403 every API-key request); controller accepts `req.apiKey` integration path for admin overview

  Line 163: **Goal:** Replace JWT-only auth with API key authentication for bank integrations.

  Line 173: - [x] `authenticateApiKey` middleware: reads `X-API-Key` header, validates key, attaches `req.bank` and `req.apiKey` to request

  Line 350: **Goal:** Staff don't log in via the demo UI. They access the system through the bank's integration.

  Line 362: - [x] Backend auth endpoints preserved for bank integrations

  Line 436: **Goal:** Make webhooks a first-class citizen for bank integrations.

  Line 456: - [ ] Write integration guide: "Integrate Cue into Your Bank's System"

  Line 579: - [x] `AdminOverview.jsx`: **"Request API key"** form (label + rateLimit + multi-select scope chips) + request status list (pending/approved/rejected; approved unrevealed shows **"Reveal key"** button → one-time GET → modal with copy)


/home/gamp/Desktop/cue/backend/src/models/apiKey.model.js:
  Line 75:     // Banks can request higher limits for high-traffic integrations.


/home/gamp/Desktop/cue/backend/src/scripts/seedApiKey.js:
  Line 63:   console.log("  Use this key in the X-API-Key header:");

  Line 64:   console.log(`  X-API-Key: ${rawKey}`);


/home/gamp/Desktop/cue/backend/src/app.js:
  Line 99: // These routes are the primary integration surface for banks.

  Line 100: // They use API key authentication via the X-API-Key header.


/home/gamp/Desktop/cue/backend/src/routes/admin.overview.routes.js:
  Line 9:  * Parallel to GET /api/v1/admin (API-key integration path).


/home/gamp/Desktop/cue/frontend/src/lib/apiClient.js:
  Line 38:         ? { "X-API-Key": apiKey }


/home/gamp/Desktop/cue/backend/src/routes/v1/admin.routes.js:
  Line 12:  * (integration path); bank isolation still comes from req.bankName.


/home/gamp/Desktop/cue/backend/src/middlewares/apiKey.middleware.js:
  Line 9:  * Authenticates requests using the X-API-Key header.

  Line 29:         message: "API key required. Pass it via the X-API-Key header.",


/home/gamp/Desktop/cue/backend/src/middlewares/resolveStaffUser.js:
  Line 8:  * request. Used by bank integrations that pass

  Line 13:  *      call the integration API as themselves)


/home/gamp/Desktop/cue/backend/src/middlewares/tenantMatch.js:
  Line 14:  *   - JWT only (dashboard, no X-API-Key)  → scoped by admin.bank


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx:
  Line 257:         <code>X-API-Key: cue_…</code> to <code>/api/v1/*</code>. The Cue

  Line 381:                     ? "Key revoked by platform — integration calls will be rejected"

  Line 384:                       : "Key is active for X-API-Key integration calls"

  Line 396:                 Reveal key


/home/gamp/Desktop/cue/backend/src/controllers/v1Auth.controller.js:
  Line 7:  * Used by bank integrations to populate auth state (id, branch, role).

```

**Tool: grep**

**Input:**
```json
{
  "pattern": "adminApiKeyRequest|fetchApiKeyRequests|revealApiKeyRequest|keyStatus",
  "path": "/home/gamp/Desktop/cue"
}
```

**Output:**
```
Found 24 matches
/home/gamp/Desktop/cue/backend/src/app.js:
  Line 25: import adminKeyRequestRouter from "./routes/adminApiKeyRequest.routes.js";


/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js:
  Line 114:  * then reports keyStatus: "revoked" (ApiKey doc is gone).


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx:
  Line 10:   fetchApiKeyRequests,

  Line 11:   revealApiKeyRequest,

  Line 71:       const res = await fetchApiKeyRequests(auth.token);

  Line 143:       const res = await revealApiKeyRequest(id, auth.token);

  Line 370:             {r.status === "approved" && r.keyStatus && (

  Line 373:                   r.keyStatus === "active"

  Line 375:                     : r.keyStatus === "suspended"

  Line 380:                   r.keyStatus === "revoked"

  Line 382:                     : r.keyStatus === "suspended"

  Line 387:                 {r.keyStatus}


/home/gamp/Desktop/cue/backend/src/routes/adminApiKeyRequest.routes.js:
  Line 69:   keyStatus: resolveKeyStatus(r, keyDoc),

  Line 175:  * it from the JSON payload. Also joins ApiKey for keyStatus (active /


/home/gamp/Desktop/cue/backend/src/routes/platform/apiKey.routes.js:
  Line 22:  * (routes/adminApiKeyRequest.routes.js) instead.


/home/gamp/Desktop/cue/backend/tests/platform/adminApiKeyRequest.test.js:
  Line 5: } from "../../src/routes/adminApiKeyRequest.routes.js";

  Line 146: describe("mapBankKeyRequest — keyStatus + keyPrefix join", () => {

  Line 147:   it("surfaces keyStatus and keyPrefix for approved requests", () => {

  Line 157:     expect(mapped.keyStatus).toBe("active");

  Line 172:     expect(mapped.keyStatus).toBe("revoked");

  Line 176:   it("keyStatus is null for non-approved requests", () => {

  Line 178:     expect(mapped.keyStatus).toBeNull();


/home/gamp/Desktop/cue/frontend/src/features/staff/apiKeyRequestApi.js:
  Line 16: export const fetchApiKeyRequests = (token) =>

  Line 23: export const revealApiKeyRequest = (id, token) =>

```

**Tool: glob**

**Input:**
```json
{
  "pattern": "**/*openapi*"
}
```

**Output:**
```
/home/gamp/Desktop/cue/backend/src/docs/openapi.yaml
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "**/*swagger*"
}
```

**Output:**
```
No files found
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/README.md",
  "limit": 80
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/README.md</path>
<type>file</type>
<content>
1: # Cue — Smart Queue Management System
2: 
3: A queue management platform built for banks: customers join a queue remotely and track their position in real time, staff clear the line with one button, and managers and admins get the visibility to run a branch, or a whole network, without a physical waiting room.
4: 
5: This repo holds both halves of the project.
6: 
7: ```
8: /
9:   backend/     REST + real-time API (Node, Express, MongoDB, Socket.io)
10:   frontend/    Customer, staff, and admin-facing interface (React, Vite)
11: ```
12: 
13: ## The idea
14: 
15: Physical bank queues are a solved problem everywhere except the bank. Cue replaces the take-a-number machine with a system that:
16: 
17: - lets a customer pull a ticket from their phone and see their live position and estimated wait,
18: - lets staff pull the next customer with a single call, priority customers served first, automatically,
19: - lets a branch manager run their own branch, staff, counters, and analytics, without needing admin looped into every decision,
20: - lets a network admin see and manage every branch from one login,
21: - clears itself up when a called customer never shows.
22: 
23: ## Status
24: 
25: | Piece       | Status                                                                                                                                        |
26: | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
27: | Backend API | Built: auth, roles (customer/staff/manager/admin), branches, queues, counters, tickets, real-time updates, no-show handling, branch analytics |
28: | Frontend    | In progress: public landing page complete (placeholder data), customer/staff/admin apps not yet started                                       |
29: | AI agent    | Planned, not yet started                                                                                                                      |
30: 
31: See [`backend/README.md`](./backend/README.md) and [`frontend/README.md`](./frontend/README.md) for the details of each.
32: 
33: ## Roles
34: 
35: | Role     | Scope                                                         |
36: | -------- | ------------------------------------------------------------- |
37: | Customer | Joins a queue, tracks their own ticket                        |
38: | Staff    | Runs one counter in one branch                                |
39: | Manager  | Runs one branch: staff, counters, ticket overrides, analytics |
40: | Admin    | Runs the network: every branch, every role                    |
41: 
42: ## Roadmap
43: 
44: - Customer ticket app, staff counter dashboard, manager/admin dashboards
45: - Wire the frontend up to the real API
46: - AI agent: a tool-using assistant for customers (book/check/cancel a ticket) and for staff/admin (natural-language operations summaries)
47: - Stand-out features: public live board, QR/kiosk check-in, SMS/WhatsApp notifications, appointment booking, nearest-branch finder
48: 
49: ## License
50: 
51: ISC

(End of file - total 51 lines)
</content>
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "frontend/src/pages/StaffHome/*"
}
```

**Output:**
```
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/TicketHistory.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagePanel.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/CounterSubTab.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerSubTab.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/CounterConsole.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerOverview.jsx
```

**Tool: grep**

**Input:**
```json
{
  "pattern": "API key|api key|X-API-Key",
  "path": "/home/gamp/Desktop/cue/frontend/src"
}
```

**Output:**
```
Found 26 matches
/home/gamp/Desktop/cue/frontend/src/lib/apiClient.js:
  Line 21:  * v1 API key auth (via `apiKey` option).

  Line 26:  * If both are provided, API key takes precedence.

  Line 36:       // API key auth (v1 routes) takes precedence over JWT auth

  Line 38:         ? { "X-API-Key": apiKey }

  Line 82:  * V1 API client — uses API key auth instead of JWT.


/home/gamp/Desktop/cue/frontend/src/features/tickets/useMyTicket.js:
  Line 100:       // Backend requires auth (or API key) for cancel — surface a clear error.


/home/gamp/Desktop/cue/frontend/src/features/staff/apiKeyRequestApi.js:
  Line 4:  * Bank admin API key request API — JWT `/api/admin/api-key-requests` (WP6).


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css:
  Line 867: /* ── API key request: scope chips + one-time reveal modal ── */


/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx:
  Line 29:  * a form to create branches, and the API key request panel

  Line 45:   // API key request state

  Line 105:   // ── API key request handlers ──────────────────────────────

  Line 253:       <div className={styles.mgmtSubHeading}>API key access</div>

  Line 255:         Request an API key for your bank. After superadmin approval, reveal

  Line 257:         <code>X-API-Key: cue_…</code> to <code>/api/v1/*</code>. The Cue

  Line 308:           {keySubmitting ? "Submitting…" : "Request API key"}

  Line 316:             <h4>Your API key</h4>

  Line 343:         <p className={styles.mgmtStatus}>No API key requests yet.</p>

  Line 349:               {r.label || "API key request"}

  Line 384:                       : "Key is active for X-API-Key integration calls"


/home/gamp/Desktop/cue/frontend/src/features/platform/platformApi.js:
  Line 7:  * attaches Authorization: Bearer. Superadmin never uses an API key.


/home/gamp/Desktop/cue/frontend/src/pages/Platform/PlatformDashboard.jsx:
  Line 23:  * PlatformDashboard — superadmin console for API keys + usage monitoring.

  Line 30:  * Superadmin JWT (auth.token) is used for every call — never an API key.

  Line 98:         title: "API key created",

  Line 146:         title: "API key rotated",

  Line 367:               <p className={styles.status}>No API keys yet.</p>


/home/gamp/Desktop/cue/frontend/src/pages/TicketPage/TicketForm.jsx:
  Line 53:       // Public JWT create — guests never hold an API key.

```

**Tool: glob**

**Input:**
```json
{
  "pattern": "docs/**/*"
}
```

**Output:**
```
No files found
```

---

## Assistant (Plan · MiMo-V2.6-Flash Free · 20.9s)

_Thinking:_

The user is asking a product design question: how do admins actually get the key into their bank's systems, and is there an interface for that?

Currently:
1. Admin reveals key once in AdminOverview modal2. They copy it and manually paste into their bank's own software (core banking, backend, etc.)
3. No interface exists for "sending" the key to their systems - because the key is a secret that only their systems should hold. Cue can't push it to their servers unless they provide a mechanism.

There are different interpretations of "interface for it":
1. **Delivery/handoff UI** - how the admin securely takes the revealed key and puts it into their systems (docs + curl examples + copy + "how to use" panel after reveal)
2. **Integration guide UI** - a step-by-step panel showing how to call `/api/v1/*` with the key (language snippets)
3. **They literally mean**: Cue should somehow deliver the key to bank systems (webhook, secret manager, env export) - more complex
4. **Multiple keys / key management UI** for different systems (maybe already partially exists - label field)

Actually re-reading: "how are the admins to send the key to their systems? Is there a way to have an interface for it?"

They might be asking:
- Process question: currently they copy-paste from the one-time reveal modal → paste into their bank's config (env var, header config)
- Interface question: can we build something better than copy-paste?

I should answer the current process clearly, then propose interface options and ask what they want.

Plan mode - read only, no edits. I can present a plan.

Options for interface:

- After reveal (or on any active key row), show a "How to use" panel with:
  - Base URL
  - Header example: `X-API-Key: cue_...`
  - curl / JS / Python snippets
  - Link to OpenAPI
  - "Verify" button that pings `/api/v1/branches` with the key (but we don't store the raw key after reveal... verify can't re-show key)

Problem: after reveal, the raw key is never stored server-side (only hash). So Cue **cannot** re-send or re-display the key. Any "interface to send the key" that requires storing it would need architectural change (encrypted at rest again, or bank admin provides their endpoint).

- Admin's bank systems call Cue - they need to put key in THEIR config
- Cue cannot push to arbitrary bank systems without an outbound integration (secrets manager, vault, etc.) - out of scope

1. **Reveal modal enhancements** (lightweight, Phase 10 docs): after reveal show ready-to-paste snippets with the key filled in; for subsequent visits show snippets with placeholder + keyPrefix
2. **"Test connection"** using a one-time verification endpoint: admin pastes key once more into a "Test key" field → backend `authenticateApiKey` check → returns200/401 (key not stored)
3. **Integrations page**: list keys with status, scopes, docs link - already partially there
4. **Docs microsite / integration guide panel** in the dashboard

If they literally want "send key to systems":
- Not possible without bank providing an API/vault to receive secrets
- Real-world pattern: admin copies into their secret manager / .env / config

I should ask clarifying questions about what they mean while presenting the options.

Also check openapi.yaml for existing docs surface.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/docs/openapi.yaml",
  "limit": 60
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/docs/openapi.yaml</path>
<type>file</type>
<content>
1: openapi: 3.0.3
2: info:
3:   title: Queue Management API
4:   description: |
5:     REST API for the queue management system. Supports customer ticket
6:     creation, staff counter operations, manager/admin dashboards, public
7:     board displays, kiosk check-in, and appointment booking.
8: 
9:     **Authentication:** Most endpoints require a Bearer token in the
10:     `Authorization` header. Public endpoints (board, branch info, kiosk,
11:     appointments, nearest branch) require no auth.
12: 
13:     **Rate limits:** Auth routes: 10 req / 15 min. Public writes (kiosk,
14:     appointments): 20 req / 5 min. Public reads: 60 req / 1 min.
15:   version: 1.0.0
16:   contact:
17:     name: Queue Management Team
18: 
19: servers:
20:   - url: http://localhost:3000/api
21:     description: Local development
22: 
23: tags:
24:   - name: Auth
25:     description: Registration, login, email verification, password reset
26:   - name: Staff
27:     description: Staff account management (admin/manager)
28:   - name: Branches
29:     description: Branch CRUD, public info, nearest-branch lookup
30:   - name: Users
31:     description: Profile and password change for authenticated users
32:   - name: Queues
33:     description: Service queue management
34:   - name: Counters
35:     description: Counter assignment and open/close
36:   - name: Tickets
37:     description: Ticket lifecycle — create, call, complete, skip, recall
38:   - name: Analytics
39:     description: Branch analytics, daily reports, staff performance
40:   - name: Board
41:     description: Public live board data
42:   - name: Kiosk
43:     description: Anonymous kiosk check-in
44:   - name: Appointments
45:     description: Appointment booking and slot lookup
46: 
47: paths:
48:   # ─── Health ───────────────────────────────────────────
49:   /health:
50:     get:
51:       tags: [System]
52:       summary: Health check
53:       responses:
54:         "200":
55:           description: Service is healthy
56: 
57:   # ─── Auth ─────────────────────────────────────────────
58:   /auth/register:
59:     post:
60:       tags: [Auth]

(Showing lines 1-60 of 1226. Use offset=61 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/features/staff/apiKeyRequestApi.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/features/staff/apiKeyRequestApi.js</path>
<type>file</type>
<content>
1: import { apiClient } from "../../lib/apiClient";
2: 
3: /**
4:  * Bank admin API key request API — JWT `/api/admin/api-key-requests` (WP6).
5:  *
6:  * bankName is always taken from Admin.bank server-side (never from body).
7:  * One-time reveal: GET /:id returns { key } on the first call after
8:  * approval, then key is null forever after.
9:  */
10: 
11: /** POST — submit a pending request for this admin's bank */
12: export const requestApiKey = (data, token) =>
13:   apiClient.post("/admin/api-key-requests", data, { token });
14: 
15: /** GET — list this bank's requests (status view) */
16: export const fetchApiKeyRequests = (token) =>
17:   apiClient.get("/admin/api-key-requests", { token });
18: 
19: /**
20:  * GET /:id — one-time raw-key reveal for an approved request.
21:  * Returns { ...meta, key: "cue_..." } first time; key: null afterwards.
22:  */
23: export const revealApiKeyRequest = (id, token) =>
24:   apiClient.get(`/admin/api-key-requests/${id}`, { token });

(End of file - total 24 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/middlewares/apiKey.middleware.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/middlewares/apiKey.middleware.js</path>
<type>file</type>
<content>
1: import ApiKey from "../models/apiKey.model.js";
2: import ApiKeyUsage from "../models/apiKeyUsage.model.js";
3: import { sendError } from "../utils/response.js";
4: import { usageDateKey } from "../utils/keyWrap.js";
5: 
6: /**
7:  * API Key Authentication Middleware
8:  *
9:  * Authenticates requests using the X-API-Key header.
10:  * On success, attaches `req.apiKey` (the ApiKey document) and `req.bankName`
11:  * to the request for downstream controllers to use.
12:  *
13:  * Usage:
14:  *   router.get("/endpoint", authenticateApiKey, requireScope("tickets:read"), handler)
15:  *
16:  * The key is looked up by hashing it with bcrypt and comparing against stored hashes.
17:  * This is intentionally slow (bcrypt) to prevent timing attacks.
18:  *
19:  * After authentication, we update `lastUsedAt` fire-and-forget (don't await).
20:  */
21: 
22: export const authenticateApiKey = async (req, res, next) => {
23:   try {
24:     const apiKey = req.headers["x-api-key"];
25: 
26:     if (!apiKey) {
27:       return sendError(res, {
28:         statusCode: 401,
29:         message: "API key required. Pass it via the X-API-Key header.",
30:       });
31:     }
32: 
33:     // Verify the key against all stored hashes.
34:     // Returns the matching ApiKey document or null.
35:     const keyDoc = await ApiKey.verifyKey(apiKey);
36: 
37:     if (!keyDoc) {
38:       return sendError(res, {
39:         statusCode: 401,
40:         message: "Invalid or revoked API key",
41:       });
42:     }
43: 
44:     // Check if the key has expired
45:     if (keyDoc.expiresAt && keyDoc.expiresAt < new Date()) {
46:       return sendError(res, {
47:         statusCode: 401,
48:         message: "API key has expired",
49:       });
50:     }
51: 
52:     // Check if the key is active (not disabled)
53:     if (!keyDoc.isActive) {
54:       return sendError(res, {
55:         statusCode: 403,
56:         message: "API key has been disabled. Contact support.",
57:       });
58:     }
59: 
60:     // Check if we're in the grace period (key was rotated, old key still valid temporarily)
61:     if (keyDoc.gracePeriodEndsAt && keyDoc.gracePeriodEndsAt < new Date()) {
62:       return sendError(res, {
63:         statusCode: 401,
64:         message: "API key has expired due to rotation. Use the new key.",
65:       });
66:     }
67: 
68:     // Attach key info to request for downstream use
69:     req.apiKey = keyDoc;
70:     req.bankName = keyDoc.bankName;
71: 
72:     // Update lastUsedAt + usage counters fire-and-forget (non-blocking).
73:     // We use updateOne instead of save to avoid triggering middleware.
74:     // Usage tracking:
75:     //   - ApiKey.requestCount  → lifetime total (cheap $inc)
76:     //   - ApiKeyUsage          → daily bucket {apiKey, date:"YYYY-MM-DD"} for charts
77:     const today = usageDateKey();
78:     ApiKey.updateOne(
79:       { _id: keyDoc._id },
80:       {
81:         $set: { lastUsedAt: new Date() },
82:         $inc: { requestCount: 1 },
83:       },
84:     ).exec().catch(() => {}); // silently ignore errors
85: 
86:     ApiKeyUsage.updateOne(
87:       { apiKey: keyDoc._id, date: today },
88:       { $inc: { count: 1 } },
89:       { upsert: true },
90:     ).exec().catch(() => {});
91: 
92:     next();
93:   } catch (error) {
94:     next(error);
95:   }
96: };
97: 
98: /**
99:  * Require Scope Middleware
100:  *
101:  * Checks that the authenticated API key includes the specified permission scope.
102:  * Must be used AFTER authenticateApiKey middleware.
103:  *
104:  * Usage:
105:  *   router.post("/tickets", authenticateApiKey, requireScope("tickets:write"), handler)
106:  *
107:  * The "admin" scope grants access to everything, so it bypasses scope checks.
108:  */
109: 
110: export const requireScope = (...requiredScopes) => {
111:   return (req, res, next) => {
112:     if (!req.apiKey) {
113:       return sendError(res, {
114:         statusCode: 401,
115:         message: "Authentication required before scope check",
116:       });
117:     }
118: 
119:     const keyScopes = req.apiKey.scopes || [];
120: 
121:     // Admin scope grants full access — skip individual scope checks
122:     if (keyScopes.includes("admin")) {
123:       return next();
124:     }
125: 
126:     // Check if the key has ALL required scopes
127:     const hasAllScopes = requiredScopes.every((scope) =>
128:       keyScopes.includes(scope),
129:     );
130: 
131:     if (!hasAllScopes) {
132:       return sendError(res, {
133:         statusCode: 403,
134:         message: `Missing required scope(s): ${requiredScopes.join(", ")}. Your key has: ${keyScopes.join(", ") || "none"}`,
135:       });
136:     }
137: 
138:     next();
139:   };
140: };
141: 
142: /**
143:  * API Key Rate Limiter
144:  *
145:  * Rate limits based on API key identity (not IP). This is more appropriate
146:  * for a multi-tenant API because:
147:  * - Multiple banks may share the same IP (e.g., behind a proxy)
148:  * - Each bank's key should have its own rate limit
149:  * - IP-based limiting doesn't work for server-to-server calls
150:  *
151:  * The rate limit is stored in-memory per key. For production, consider
152:  * Redis-backed rate limiting for multi-instance deployments.
153:  *
154:  * Usage:
155:  *   router.get("/endpoint", authenticateApiKey, apiKeyRateLimit, handler)
156:  */
157: 
158: // In-memory store for rate limit counters.
159: // Key: ApiKey._id, Value: { count, resetAt }
160: // Resets every minute (sliding window).
161: const rateLimitStore = new Map();
162: 
163: // Clean up expired entries every 5 minutes to prevent memory leaks
164: setInterval(() => {
165:   const now = Date.now();
166:   for (const [keyId, entry] of rateLimitStore) {
167:     if (entry.resetAt <= now) {
168:       rateLimitStore.delete(keyId);
169:     }
170:   }
171: }, 5 * 60 * 1000);
172: 
173: export const apiKeyRateLimit = (req, res, next) => {
174:   if (!req.apiKey) {
175:     return sendError(res, {
176:       statusCode: 401,
177:       message: "Authentication required before rate limit check",
178:     });
179:   }
180: 
181:   const keyId = req.apiKey._id.toString();
182:   const maxRequests = req.apiKey.rateLimit || 100;
183:   const windowMs = 60 * 1000; // 1 minute window
184: 
185:   const now = Date.now();
186:   const entry = rateLimitStore.get(keyId);
187: 
188:   if (!entry || entry.resetAt <= now) {
189:     // New window — start counting
190:     rateLimitStore.set(keyId, { count: 1, resetAt: now + windowMs });
191:   } else {
192:     // Existing window — increment count
193:     entry.count++;
194: 
195:     if (entry.count > maxRequests) {
196:       const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
197:       res.setHeader("Retry-After", retryAfter);
198:       res.setHeader("X-RateLimit-Limit", maxRequests);
199:       res.setHeader("X-RateLimit-Remaining", 0);
200:       res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));
201: 
202:       return sendError(res, {
203:         statusCode: 429,
204:         message: `Rate limit exceeded. Max ${maxRequests} requests per minute. Try again in ${retryAfter}s.`,
205:       });
206:     }
207:   }
208: 
209:   // Add rate limit headers to response
210:   const remaining = maxRequests - (rateLimitStore.get(keyId)?.count || 0);
211:   res.setHeader("X-RateLimit-Limit", maxRequests);
212:   res.setHeader("X-RateLimit-Remaining", Math.max(0, remaining));
213:   res.setHeader("X-RateLimit-Reset", Math.ceil((rateLimitStore.get(keyId)?.resetAt || now + windowMs) / 1000));
214: 
215:   next();
216: };

(End of file - total 216 lines)
</content>
```

**Tool: grep**

**Input:**
```json
{
  "pattern": "sendSuccess|verify|test.*key",
  "path": "/home/gamp/Desktop/cue/backend/src/controllers"
}
```

**Output:**
```
Found 100 matches (more matches available)
/home/gamp/Desktop/cue/backend/src/controllers/counter.controller.js:
  Line 4: import { sendSuccess, sendError } from "../utils/response.js";

  Line 30:     return sendSuccess(res, {

  Line 55:     return sendSuccess(res, {

  Line 112:     return sendSuccess(res, {

  Line 145:     return sendSuccess(res, {

  Line 178:     return sendSuccess(res, {

  Line 214:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/staff.controller.js:
  Line 7: import { sendSuccess, sendError } from "../utils/response.js";

  Line 121:     return sendSuccess(res, {

  Line 178:     return sendSuccess(res, {

  Line 226:     return sendSuccess(res, {

  Line 270:     return sendSuccess(res, {

  Line 317:     return sendSuccess(res, {

  Line 363:     return sendSuccess(res, {

  Line 430:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/user.controller.js:
  Line 1: import { sendSuccess, sendError } from "../utils/response.js";

  Line 6:     return sendSuccess(res, {

  Line 68:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/export.controller.js:
  Line 6: import { sendSuccess, sendError } from "../utils/response.js";


/home/gamp/Desktop/cue/backend/src/controllers/webhook.controller.js:
  Line 2: import { sendSuccess, sendError } from "../utils/response.js";

  Line 29:     return sendSuccess(res, {

  Line 56:     return sendSuccess(res, {

  Line 72:     return sendSuccess(res, { statusCode: 200, message: "Webhook deleted" });

  Line 90:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/brand.controller.js:
  Line 2: import { sendSuccess } from "../utils/response.js";

  Line 14:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/appointment.controller.js:
  Line 5: import { sendSuccess, sendError } from "../utils/response.js";

  Line 91:     return sendSuccess(res, {

  Line 203:     return sendSuccess(res, {

  Line 243:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/kiosk.controller.js:
  Line 5: import { sendSuccess, sendError } from "../utils/response.js";

  Line 71:     return sendSuccess(res, {

  Line 133:     return sendSuccess(res, {

  Line 189:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/staffImport.controller.js:
  Line 2: import { sendSuccess, sendError } from "../utils/response.js";

  Line 79:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/auth.controller.js:
  Line 8: import { sendSuccess, sendError } from "../utils/response.js";

  Line 89:     return sendSuccess(res, {

  Line 142:     return sendSuccess(res, {

  Line 183:     return sendSuccess(res, {

  Line 259:     return sendSuccess(res, {

  Line 334:       return sendSuccess(res, {

  Line 360:     return sendSuccess(res, {

  Line 379:     return sendSuccess(res, {

  Line 432:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/contact.controller.js:
  Line 1: import { sendSuccess } from "../utils/response.js";

  Line 24:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/analytics.controller.js:
  Line 6: import { sendSuccess, sendError } from "../utils/response.js";

  Line 138:     return sendSuccess(res, {

  Line 224:     return sendSuccess(res, {

  Line 265:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/ticket.controller.js:
  Line 4: import { sendSuccess, sendError } from "../utils/response.js";

  Line 103:     return sendSuccess(res, {

  Line 151:     return sendSuccess(res, {

  Line 286:     return sendSuccess(res, {

  Line 325:     return sendSuccess(res, {

  Line 363:     return sendSuccess(res, {

  Line 399:     return sendSuccess(res, {

  Line 437:     return sendSuccess(res, {

  Line 481:     return sendSuccess(res, {

  Line 525:     return sendSuccess(res, {

  Line 562:     return sendSuccess(res, {

  Line 592:     return sendSuccess(res, {

  Line 618:     return sendSuccess(res, {

  Line 649:     return sendSuccess(res, {

  Line 688:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/manager.controller.js:
  Line 3: import { sendSuccess, sendError } from "../utils/response.js";

  Line 76:     return sendSuccess(res, {

  Line 123:     return sendSuccess(res, {

  Line 168:     return sendSuccess(res, {

  Line 204:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/board.controller.js:
  Line 6: import { sendSuccess, sendError } from "../utils/response.js";

  Line 22:       return sendSuccess(res, {

  Line 98:     return sendSuccess(res, {

  Line 173:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/queue.controller.js:
  Line 2: import { sendSuccess } from "../utils/response.js";

  Line 9:     return sendSuccess(res, {

  Line 35:     return sendSuccess(res, {

  Line 60:     return sendSuccess(res, {

  Line 82:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/v1Auth.controller.js:
  Line 1: import { sendSuccess } from "../utils/response.js";

  Line 11:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/branch.controller.js:
  Line 5: import { sendSuccess } from "../utils/response.js";

  Line 20:     return sendSuccess(res, {

  Line 45:     return sendSuccess(res, {

  Line 77:     return sendSuccess(res, {

  Line 132:     return sendSuccess(res, {

  Line 160:     return sendSuccess(res, {

  Line 201:     return sendSuccess(res, {

  Line 313:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/admin.controller.js:
  Line 4: import { sendSuccess } from "../utils/response.js";

  Line 102:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/advancedAnalytics.controller.js:
  Line 6: import { sendSuccess, sendError } from "../utils/response.js";

  Line 73:     return sendSuccess(res, {

  Line 186:     return sendSuccess(res, {

  Line 255:     return sendSuccess(res, {

  Line 304:     return sendSuccess(res, {


/home/gamp/Desktop/cue/backend/src/controllers/platform/platformApiKey.controller.js:
  Line 3: import { sendSuccess, sendError } from "../../utils/response.js";

  Line 52:     return sendSuccess(res, {

  Line 99:     return sendSuccess(res, {


(Results truncated. Consider using a more specific path or pattern.)
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/README.md",
  "limit": 80
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/README.md</path>
<type>file</type>
<content>
1: # Cue — Backend API
2: 
3: A REST + real-time backend for managing customer queues across bank branches. Customers join a queue remotely and track their position and estimated wait time; staff pull the next customer with one call; managers run their branch; admins run the network.
4: 
5: ## Table of Contents
6: 
7: - [Features](#features)
8: - [Tech Stack](#tech-stack)
9: - [Roles & Access](#roles--access)
10: - [Project Structure](#project-structure)
11: - [Getting Started](#getting-started)
12: - [API Reference](#api-reference)
13: - [Response Format](#response-format)
14: - [Real-Time Events](#real-time-events-socketio)
15: 
16: ## Features
17: 
18: - **Role-based access** across four roles: customer, staff, manager, admin
19: - **Multi-branch, multi-queue** support (services are scoped per branch)
20: - **Priority-aware dispatch** — priority tickets (elderly, disabled, VIP) always served ahead
21: - **Live position & ETA** — customers see how many people are ahead and estimated wait time
22: - **Real-time updates** via Socket.io — branch boards and customer ticket status update instantly
23: - **Automatic no-show handling** — called tickets auto-expire to "skipped"
24: - **Branch analytics** — live dashboard, end-of-day reports, and per-staff performance tracking
25: - **AI Assistant** — natural-language queue operations and analytics summaries via Groq API
26: - **Kiosk & Appointment booking** — anonymous ticket creation and scheduled appointments
27: - **Public boards** — live "Now Serving" boards per branch and network-wide hub
28: - **Nearest branch finder** — geolocation-based branch discovery with live queue data
29: - **Contact form** — validated customer inquiries with email notifications
30: - **Webhook support** — subscribe to queue events via HTTP callbacks
31: - **Slack/Discord notifications** — get alerts for ticket calls, queue thresholds, day open/close
32: - **Browser push notifications** — VAPID-based Web Push for ticket status and queue alerts
33: - **Email notifications** — ticket created, called, completed, and cancelled emails via Resend
34: - **Audit log** — track who did what across the system
35: - **Bulk staff import** — CSV upload for onboarding multiple staff at once
36: - **Export analytics** — download reports as CSV or HTML
37: - **Peak hours heatmap** — visualize busiest times per branch
38: - **Staff leaderboard** — gamified daily/weekly/monthly performance rankings
39: - **Service-level wait time targets** — set expected handling times per queue, track on-target status
40: - **Compression** — gzip responses for faster transfers
41: - **Rate-limited auth** to slow down brute-force attempts
42: - **Automated tests** — 35 backend tests covering utils, middleware, and validators
43: 
44: ## Tech Stack
45: 
46: | Layer         | Choice                |
47: | ------------- | --------------------- |
48: | Runtime       | Node.js (ESM)         |
49: | Framework     | Express 5             |
50: | Database      | MongoDB + Mongoose    |
51: | Real-time     | Socket.io             |
52: | Auth          | JWT, bcrypt           |
53: | Validation    | express-validator     |
54: | Email         | Resend SDK            |
55: | AI            | Groq API (LLaMA 3.3) |
56: | Rate limiting | express-rate-limit    |
57: | Compression   | compression           |
58: | File upload   | multer                |
59: | Testing       | vitest                |
60: 
61: ## Roles & Access
62: 
63: | Role         | Scope                   | Can do                                                                                                                                                                                                                                                         |
64: | ------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
65: | **customer** | self only               | join a queue, view their own active ticket (with live position/ETA), cancel their own ticket, chat with AI assistant                                                                                                                                           |
66: | **staff**    | one counter, one branch | pull/call the next ticket, complete or skip a ticket, close their own assigned counter, chat with AI assistant (with analytics tools)                                                                                                                          |
67: | **manager**  | one branch              | everything staff can, plus: create/deactivate staff, full counter control, ticket overrides (recall, priority), branch analytics, daily reports, staff performance, wait time targets, bulk staff import, webhook management, export analytics, AI assistant    |
68: | **admin**    | entire network          | branches, queues, staff of any role/branch, cross-branch access, webhook management, network-wide analytics, AI assistant with full admin tools                                                                                                                |
69: 
70: Customers and admins live in the `User` collection; staff and managers live in a separate `Staff` collection with their own login.
71: 
72: ## Project Structure
73: 
74: ```
75: src/
76:   config/         # database connection
77:   controllers/    # request handlers
78:   jobs/           # background jobs (no-show sweeper)
79:   middlewares/    # auth, validation, error handling, rate limiting, audit logging
80:   models/         # Mongoose schemas

(Showing lines 1-80 of 314. Use offset=81 to continue.)
</content>
```

---

## Assistant (Plan · MiMo-V2.6-Flash Free · 33.6s)

_Thinking:_

The user is asking a product design question:
1. How do admins send the key to their systems?
2. Is there a way to have an interface for it?

Currently the flow is:
1. Admin requests key in dashboard
2. Superadmin approves → raw key shown once to superadmin + staged encrypted
3. Bank admin clicks "Reveal key" once → modal with copy button
4. Admin then has to manually put that key into their bank's own systems (core banking backend, etc.) as `X-API-Key: cue_...` on `/api/v1/*`

There's no "send to systems" mechanism - it's copy-paste out-of-band. The key is never re-retrievable after reveal (hash only stored).

"Interface for it" could mean:
A) Documentation/integration guide showing how to use the key (curl examples, code snippets)
B) An interface where admins configure their systems to receive the key somehowC) A "test connection" / playground interface where they can try the key against sample endpoints
D) Export/download options for the key when revealed
E) Multi-key management UI for different systems (label already exists)
F) Literally sending the key to the bank's servers - which would require the bank's systems to have an endpoint Cue can push to, or admin provides webhook/URLImportant constraint: after reveal, Cue cannot re-send the key - only hash is stored. So any "interface to send key later" would need architectural change (keep encrypted copy) or the admin must copy it at reveal time.

Reasonable product answers:
1. **How they send it today:** Copy from one-time reveal modal → paste into their system's config (env var, secret manager, header config). Out-of-band, manual.
2. **Interfaces we could build:**
   - **Integration guide panel** next to reveal: copyable curl/JS/Python snippets with the key pre-filled   - **Test connection / playground**: paste key (or use revealed key in-session only) → hit a sample `/api/v1/branches` to verify
   - **Download options**: at reveal time, download as .env snippet / curl script / JSON
   - **"Where is this key used?"** field - admin notes which system (label already partially does this)
   - **Push delivery**: would need bank to provide a secure endpoint Cue posts to - usually not how API keys work; banks pull/use the key themselves

I should explain the current flow clearly, then propose interface options and ask which they want - since we're in plan mode, I should research and present options, ask clarifying questions.

Let me also check if there's any docs page or integration guide surface already, and what the reveal modal looks like more carefully. I have enough.

Also worth noting: superadmin also sees the raw key once at approval - they could hand it over channel. But the intended flow is bank admin reveals it.

I'll present:
1. Current reality (copy-paste, one-time)
2. Why Cue can't "auto-send" without new architecture (hash-only after reveal)
3. Interface options with a recommended plan
4. Ask which scope they want

Since plan mode - ask clarifying question about which interface they mean.

## How it works today

There is **no send step**. The intended handoff is:

1. Superadmin approves → raw key shown once to them; also staged encrypted for the bank.
2. Bank admin clicks **Reveal key** in AdminOverview → one-time modal with **Copy**.
3. The admin pastes it into **their** systems out-of-band: env var, secret manager, gateway config, app config, etc.
4. Those systems call Cue as `X-API-Key: cue_…` on `/api/v1/*`.

After reveal, Cue only stores a **hash** — it cannot re-display or re-send the key. So “interface for sending the key” has to mean either **helping the admin use the key at reveal time**, or a **new delivery design**.

## Interface options

| Option | What it is | Effort |
|---|---|---|
| **A. Integration snippets** (recommended) | In the reveal modal + on each active key row: ready-to-paste `curl` / JS / Python / header examples with base URL, scopes, `X-API-Key`. “Copy snippet” next to “Copy key”. | Small — frontend only |
| **B. Verify connection** | “Test key” box: admin pastes the key once → backend runs `ApiKey.verifyKey` → green/red + scopes + last used. Key not stored. | Small — 1 endpoint + UI |
| **C. Export at reveal** | Download `.env` / `curl` script / JSON when the key is first shown (only time raw key exists client-side). | Small |
| **D. Integration guide page** | Full in-app guide: auth, scopes, examples, rate limits, errors (Phase 10 docs, UI host). | Medium |
| **E. Push to bank systems** | Cue posts the key to a URL the bank provides (webhook/vault). **Not recommended** — bank would have to accept secrets from Cue; unusual, risky, needs trust model. | Large + awkward |

**Constraint:** only **A/C/D at reveal time** can embed the real key. After that, snippets use a placeholder + `keyPrefix` (“ends in …”). **B** works anytime without storing the raw key.

## Recommended package

1. **A + C** — enrich the existing one-time reveal modal (snippets + download), keep snippets with placeholder on the status list.  
2. **B** — “Test key” so admins know the handoff worked.  
3. Fold **D** into Phase 10 (WP9/docs) rather than a separate product surface.

## Clarifying questions

1. Did you mean **help the admin apply the key** (A–D), or **Cue delivering the key to bank servers** (E)?  
2. If applying: is **snippets + copy/download at reveal** enough, or do you also want **test connection** and/or a **full integration guide page**?

---

## User

I don't mean helping the bank deliver the key to their server.
for now, a test connecton, Integration snippets, and full integration guide is what i'd go for.
i can alway test the routes and other things with postman/hoppscotch

---

## Assistant (Plan · MiMo-V2.6-Flash Free · 180.0s)

_Thinking:_

The user wants:
1. Test connection
2. Integration snippets
3. Full integration guide

They clarified they don't mean helping the bank deliver the key to their server (not option E), and they can test routes with Postman/Hoppscotch themselves.

I'm in Plan Mode - I need to research and construct a comprehensive plan. Let me explore more of the codebase to understand:
- What routes exist for v1
- Current reveal modal structure
- What auth/verify capabilities exist
- OpenAPI/docs state
- Frontend routing structure for where an integration guide page would live
- Platform docs or swagger setup

Let me gather more details to make a solid plan.

Researching the codebase to draft a concrete plan for test connection, snippets, and the integration guide.

**Tool: task**

**Input:**
```json
{
  "description": "Map v1 API surface",
  "prompt": "Explore the Cue repo at /home/gamp/Desktop/cue (read-only). Goal: map the public v1 API surface for an integration guide plan.\n\nReturn:\n1. Full list of routes mounted under /api/v1 (from backend/src/routes/v1/index.js and each route file): method, path, auth (authenticateApiKey vs public), required scopes (requireScope), brief purpose\n2. Also list notable public /api/* routes used by the demo frontend (tickets public, queues/public, brand, health, sockets if any)\n3. Error response shapes (sendError format) and rate limit headers\n4. How authenticateApiKey + requireScope + apiKeyRateLimit are chained in v1/index.js and app.js\n5. Whether swagger/openapi is mounted (swagger-jsdoc usage, where openapi.yaml is loaded)\n6. Any existing \"integration\" or docs pages in frontend\n\nBe thorough. Return structured markdown with exact file paths.",
  "subagent_type": "explore"
}
```

**Error:**
```
Task cancelled
```

**Tool: task**

**Input:**
```json
{
  "description": "Map reveal modal and routing",
  "prompt": "Explore the Cue frontend at /home/gamp/Desktop/cue/frontend (read-only). Goal: plan where to put (a) integration snippets + download in the reveal modal, (b) test connection UI, (c) a full integration guide page for bank admins.\n\nReturn:\n1. How AdminOverview.jsx reveal modal works (state, copy button, what data is available after reveal: key, scopes, bankName, rateLimit, keyPrefix, base URL sources)\n2. How apiClient.js builds base URLs (VITE_ env vars, production base)\n3. App.jsx routes for admin/staff (ProtectedRoute roles) — where an /integration or docs page could mount\n4. StaffHome.jsx tab structure (admin tabs) — could guide live as a tab vs separate route\n5. Existing modal/CSS patterns (keyModal, scope chips) to reuse\n6. Frontend test setup (vitest, testing-library) — how existing tests are structured\n7. Any existing download/export utilities\n8. Whether platform superadmin has similar reveal UI that should also get snippets (PlatformDashboard)\n\nExact file paths + line numbers. Structured markdown.",
  "subagent_type": "explore"
}
```

**Error:**
```
Task cancelled
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/v1/index.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/routes/v1/index.js</path>
<type>file</type>
<content>
1: import { Router } from "express";
2: import boardRouter from "./board.routes.js";
3: import branchRouter from "./branch.routes.js";
4: import queueRouter from "./queue.routes.js";
5: import counterRouter from "./counter.routes.js";
6: import ticketRouter from "./ticket.routes.js";
7: import kioskRouter from "./kiosk.routes.js";
8: import appointmentRouter from "./appointment.routes.js";
9: import staffRouter from "./staff.routes.js";
10: import adminRouter from "./admin.routes.js";
11: import analyticsRouter from "./analytics.routes.js";
12: import { bankScope } from "../../middlewares/bankScope.middleware.js";
13: import { getme } from "../../controllers/v1Auth.controller.js";
14: 
15: /**
16:  * V1 Routes Index
17:  *
18:  * Mounts all v1 API routes under a common router.
19:  * The bankScope middleware is applied here so that all downstream
20:  * routes have access to req.bankBranchIds and req.bankFilter.
21:  *
22:  * Authentication (authenticateApiKey) and rate limiting (apiKeyRateLimit)
23:  * are applied at the app.js level before these routes are reached.
24:  *
25:  * Route structure:
26:  *   /api/v1/board/*          → boardRouter
27:  *   /api/v1/branches/*       → branchRouter
28:  *   /api/v1/queues/*         → queueRouter
29:  *   /api/v1/counters/*       → counterRouter
30:  *   /api/v1/tickets/*        → ticketRouter
31:  *   /api/v1/kiosk/*          → kioskRouter
32:  *   /api/v1/appointments/*   → appointmentRouter
33:  *   /api/v1/staff/*          → staffRouter
34:  *   /api/v1/admin/*          → adminRouter
35:  *   /api/v1/analytics/*      → analyticsRouter
36:  */
37: 
38: const v1Router = Router();
39: 
40: // Apply bank scope middleware to all v1 routes.
41: // This finds all branches belonging to the API key's bank
42: // and attaches them to req.bankBranchIds for downstream use.
43: v1Router.use(bankScope);
44: 
45: // Mount all v1 resource routes
46: v1Router.use("/board", boardRouter);
47: v1Router.use("/branches", branchRouter);
48: v1Router.use("/queues", queueRouter);
49: v1Router.use("/counters", counterRouter);
50: v1Router.use("/tickets", ticketRouter);
51: v1Router.use("/kiosk", kioskRouter);
52: v1Router.use("/appointments", appointmentRouter);
53: v1Router.use("/staff", staffRouter);
54: v1Router.use("/admin", adminRouter);
55: v1Router.use("/analytics", analyticsRouter);
56: // API key requests live on JWT /api/admin/api-key-requests (WP4/WP8).
57: // The old /v1/api-key-requests path is removed — it used authorize("admin")
58: // while resolveStaffUser always sets role "staff", so every call 403'd.
59: v1Router.get("/auth/me", getme);
60: 
61: export default v1Router;

(End of file - total 61 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/app.js",
  "limit": 150
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/app.js</path>
<type>file</type>
<content>
1: import express, { json, urlencoded } from "express";
2: import compression from "compression";
3: import errorHandler from "./middlewares/error.middleware.js";
4: import notFoundHandler from "./middlewares/notFound.js";
5: import auth_router from "./routes/auth.routes.js";
6: import branch_router from "./routes/branch.route.js";
7: import userRouter from "./routes/user.routes.js";
8: import staff_router from "./routes/staff.routes.js";
9: import queue_router from "./routes/queue.routes.js";
10: import counter_router from "./routes/counter.routes.js";
11: import ticketRouter from "./routes/ticket.routes.js";
12: import analyticsRouter from "./routes/analytics.routes.js";
13: import boardRouter from "./routes/board.routes.js";
14: import kioskRouter from "./routes/kiosk.routes.js";
15: import appointmentRouter from "./routes/appointment.routes.js";
16: import contactRouter from "./routes/contact.routes.js";
17: import webhookRouter from "./routes/webhook.routes.js";
18: import staffImportRouter from "./routes/staffImport.routes.js";
19: import exportRouter from "./routes/export.routes.js";
20: import advancedAnalyticsRouter from "./routes/advancedAnalytics.routes.js";
21: import brandRouter from "./routes/brand.routes.js";
22: import platformRouter from "./routes/platform/index.js";
23: import managerRouter from "./routes/manager.routes.js";
24: import adminOverviewRouter from "./routes/admin.overview.routes.js";
25: import adminKeyRequestRouter from "./routes/adminApiKeyRequest.routes.js";
26: import v1Router from "./routes/v1/index.js";
27: import { authenticateApiKey, apiKeyRateLimit } from "./middlewares/apiKey.middleware.js";
28: import { tenantMatch } from "./middlewares/tenantMatch.js";
29: import { sendSuccess } from "./utils/response.js";
30: import cors from "cors";
31: import helmet from "helmet";
32: import swaggerUi from "swagger-ui-express";
33: import { readFileSync } from "fs";
34: import { fileURLToPath } from "url";
35: import { dirname, join } from "path";
36: import * as yaml from "js-yaml";
37: 
38: const __filename = fileURLToPath(import.meta.url);
39: const __dirname = dirname(__filename);
40: const openapiSpec = yaml.load(
41:   readFileSync(join(__dirname, "docs", "openapi.yaml"), "utf-8")
42: );
43: 
44: const app = express();
45: app.use(helmet());
46: app.use(compression());
47: app.use(
48:   cors({
49:     origin: process.env.CORS_ORIGIN || "http://localhost:5173",
50:     credentials: true,
51:   }),
52: );
53: 
54: // Body parser middleware
55: app.use(express.json({ limit: "1mb" }));
56: app.use(express.urlencoded({ extended: true, limit: "1mb" }));
57: 
58: // routes handlers
59: 
60: app.get("/", (req, res) => {
61:   res.status(200).json({
62:     message: "Welcome to the Smart Queue System API ",
63:   });
64: });
65: 
66: app.get("/health", (req, res) => {
67:   sendSuccess(res, {
68:     statusCode: 200,
69:     message: "Service is healthy",
70:     data: { ok: true },
71:   });
72: });
73: app.use("/api/auth", auth_router);
74: app.use("/api/branches/", branch_router);
75: app.use("/api/users", userRouter);
76: app.use("/api/staff", staff_router);
77: // Manager provisioning (Phase 13 WP4) — JWT admin only, bank-scoped in controller.
78: app.use("/api/managers", managerRouter);
79: // JWT admin overview (Phase 13 WP6) — dashboard reads Admin.bank, not API key.
80: app.use("/api/admin", adminOverviewRouter);
81: // Bank-admin API key requests via JWT (Phase 13 WP4) — parallel to the
82: // legacy v1 API-key version until WP6 migrates the dashboard fully.
83: app.use("/api/admin/api-key-requests", adminKeyRequestRouter);
84: app.use("/api/queues", queue_router);
85: app.use("/api/counters", counter_router);
86: app.use("/api/tickets", ticketRouter);
87: app.use("/api/analytics", analyticsRouter);
88: app.use("/api/board", boardRouter);
89: app.use("/api/kiosk", kioskRouter);
90: app.use("/api/appointments", appointmentRouter);
91: app.use("/api/contact", contactRouter);
92: app.use("/api/webhooks", webhookRouter);
93: app.use("/api/staff-import", staffImportRouter);
94: app.use("/api/export", exportRouter);
95: app.use("/api/advanced-analytics", advancedAnalyticsRouter);
96: app.use("/api/brand", brandRouter);
97: 
98: // ── V1 API Routes (API-key authenticated) ──────────────────────
99: // These routes are the primary integration surface for banks.
100: // They use API key authentication via the X-API-Key header.
101: // The v1Router applies: authenticateApiKey → apiKeyRateLimit → bankScope
102: import { bankScope } from "./middlewares/bankScope.middleware.js";
103: import { resolveStaffUser } from "./middlewares/resolveStaffUser.js";
104: 
105: // ── Platform routes (superadmin JWT auth) ───────────────────────
106: // Superadmin-only console: API key lifecycle, usage monitoring,
107: // key-request approval. NOT under /api/v1 and NOT bank-scoped —
108: // the superadmin is a platform operator, not a bank tenant.
109: // Mounted BEFORE the v1 API-key pipeline so JWT auth is independent.
110: app.use("/api/platform", platformRouter);
111: 
112: // Demo helper routes removed (Phase 13 WP7) — dashboard is JWT-only.
113: 
114: // V1 public routes — guest ticket flow (no auth required)
115: import publicV1Router from "./routes/v1/public.routes.js";
116: app.use("/api/v1", publicV1Router);
117: 
118: // V1 authenticated routes — all require API key auth + rate limiting
119: // The bankScope middleware inside v1Router handles tenant isolation.
120: // tenantMatch: if a bank admin JWT and an API key are both present,
121: // admin.bank must equal key.bankName (403 otherwise).
122: app.use(
123:   "/api/v1",
124:   authenticateApiKey,
125:   resolveStaffUser,
126:   tenantMatch,
127:   apiKeyRateLimit,
128:   v1Router,
129: );
130: 
131: // Swagger API docs
132: app.get("/api/docs/openapi.json", (req, res) => {
133:   res.setHeader("Content-Type", "application/json");
134:   res.send(JSON.stringify(openapiSpec, null, 2));
135: });
136: app.use(
137:   "/api/docs",
138:   swaggerUi.serve,
139:   swaggerUi.setup(openapiSpec, {
140:     customCss: ".swagger-ui .topbar { display: none }",
141:     customSiteTitle: "Queue Management API Documentation",
142:   }),
143: );
144: 
145: // error handling middleware
146: app.use(notFoundHandler);
147: app.use(errorHandler);
148: 
149: export default app;

(End of file - total 149 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/App.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/App.jsx</path>
<type>file</type>
<content>
1: import { lazy, Suspense } from "react";
2: import { Routes, Route, Navigate } from "react-router-dom";
3: import { AuthProvider } from "./features/auth/AuthContext";
4: import { ThemeProvider } from "./features/theme/ThemeContext";
5: import { BrandProvider } from "./features/brand/BrandContext";
6: import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
7: import ProtectedRoute from "./features/auth/ProtectedRoute";
8: import Navbar from "./components/Navbar/Navbar";
9: import Footer from "./components/Footer/Footer";
10: 
11: const Landing = lazy(() => import("./pages/Landing/Landing"));
12: const Contact = lazy(() => import("./pages/Contact/Contact"));
13: const StaffHome = lazy(() => import("./pages/StaffHome/StaffHome"));
14: const LoginPage = lazy(() => import("./pages/Login/LoginPage"));
15: const PlatformLogin = lazy(() => import("./pages/Platform/PlatformLogin"));
16: const PlatformDashboard = lazy(() => import("./pages/Platform/PlatformDashboard"));
17: const Board = lazy(() => import("./pages/Board/Board"));
18: const Boards = lazy(() => import("./pages/Boards/Boards"));
19: const Kiosk = lazy(() => import("./pages/Kiosk/Kiosk"));
20: const Appointment = lazy(() => import("./pages/Appointment/Appointment"));
21: const NearestBranch = lazy(() => import("./pages/NearestBranch/NearestBranch"));
22: const Branch = lazy(() => import("./pages/Branch/Branch"));
23: const TicketPage = lazy(() => import("./pages/TicketPage/TicketPage"));
24: const NotFound = lazy(() => import("./pages/NotFound/NotFound"));
25: 
26: const PageSpinner = () => (
27:   <div
28:     style={{
29:       minHeight: "60vh",
30:       display: "flex",
31:       alignItems: "center",
32:       justifyContent: "center",
33:       fontFamily: "var(--font-body, system-ui, sans-serif)",
34:       color: "var(--text-muted, #666)",
35:     }}
36:   >
37:     Loading…
38:   </div>
39: );
40: 
41: function App() {
42:   return (
43:     <BrandProvider>
44:     <ThemeProvider>
45:     <AuthProvider>
46:       <ErrorBoundary>
47:       <Suspense fallback={<PageSpinner />}>
48:       <Routes>
49:         <Route
50:           path="/"
51:           element={
52:             <>
53:               <Navbar />
54:               <Landing />
55:               <Footer />
56:             </>
57:           }
58:         />
59:         <Route
60:           path="/contact"
61:           element={
62:             <>
63:               <Navbar />
64:               <Contact />
65:               <Footer />
66:             </>
67:           }
68:         />
69:         <Route
70:           path="/ticket"
71:           element={
72:             <>
73:               <Navbar />
74:               <TicketPage />
75:               <Footer />
76:             </>
77:           }
78:         />
79:         <Route
80:           path="/ticket/:ticketId"
81:           element={
82:             <>
83:               <Navbar />
84:               <TicketPage />
85:               <Footer />
86:             </>
87:           }
88:         />
89:         <Route
90:           path="/staff"
91:           element={
92:             <ProtectedRoute allowedRoles={["staff", "manager", "admin"]}>
93:               <>
94:                 <Navbar />
95:                 <StaffHome />
96:                 <Footer />
97:               </>
98:             </ProtectedRoute>
99:           }
100:         />
101:         {/* Bank JWT logins — Phase 13 WP7 (one page per kind) */}
102:         <Route
103:           path="/login"
104:           element={<Navigate to="/login/staff" replace />}
105:         />
106:         <Route path="/login/:kind" element={<LoginPage />} />
107:         {/* Superadmin platform console — JWT login only, not bank-scoped */}
108:         <Route
109:           path="/platform/login"
110:           element={
111:             <>
112:               <Navbar />
113:               <PlatformLogin />
114:             </>
115:           }
116:         />
117:         <Route
118:           path="/platform"
119:           element={
120:             <ProtectedRoute allowedRoles={["superadmin"]}>
121:               <PlatformDashboard />
122:             </ProtectedRoute>
123:           }
124:         />
125:         <Route path="/boards" element={<Boards />} />
126:         <Route path="/board/:branchId" element={<Board />} />
127:         <Route path="/kiosk/:branchId" element={<Kiosk />} />
128:         <Route path="/appointment/:branchId" element={<Appointment />} />
129:         <Route path="/find-nearby" element={<NearestBranch />} />
130:         <Route
131:           path="/branch/:branchId"
132:           element={
133:             <>
134:               <Navbar />
135:               <Branch />
136:               <Footer />
137:             </>
138:           }
139:         />
140:         <Route path="*" element={<NotFound />} />
141:       </Routes>
142:       </Suspense>
143:       </ErrorBoundary>
144:     </AuthProvider>
145:     </ThemeProvider>
146:     </BrandProvider>
147:   );
148: }
149: 
150: export default App;

(End of file - total 150 lines)
</content>
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "backend/src/routes/v1/*.js"
}
```

**Output:**
```
/home/gamp/Desktop/cue/backend/src/routes/v1/counter.routes.js
/home/gamp/Desktop/cue/backend/src/routes/v1/staff.routes.js
/home/gamp/Desktop/cue/backend/src/routes/v1/queue.routes.js
/home/gamp/Desktop/cue/backend/src/routes/v1/appointment.routes.js
/home/gamp/Desktop/cue/backend/src/routes/v1/public.routes.js
/home/gamp/Desktop/cue/backend/src/routes/v1/admin.routes.js
/home/gamp/Desktop/cue/backend/src/routes/v1/ticket.routes.js
/home/gamp/Desktop/cue/backend/src/routes/v1/index.js
/home/gamp/Desktop/cue/backend/src/routes/v1/branch.routes.js
/home/gamp/Desktop/cue/backend/src/routes/v1/board.routes.js
/home/gamp/Desktop/cue/backend/src/routes/v1/kiosk.routes.js
/home/gamp/Desktop/cue/backend/src/routes/v1/analytics.routes.js
```

**Tool: grep**

**Input:**
```json
{
  "path": "/home/gamp/Desktop/cue",
  "pattern": "swagger|openapi|/api-docs"
}
```

**Output:**
```
Found 34 matches
/home/gamp/Desktop/cue/backend/src/docs/openapi.yaml:
  Line 1: openapi: 3.0.3


/home/gamp/Desktop/cue/backend/src/app.js:
  Line 32: import swaggerUi from "swagger-ui-express";

  Line 40: const openapiSpec = yaml.load(

  Line 41:   readFileSync(join(__dirname, "docs", "openapi.yaml"), "utf-8")

  Line 132: app.get("/api/docs/openapi.json", (req, res) => {

  Line 134:   res.send(JSON.stringify(openapiSpec, null, 2));

  Line 138:   swaggerUi.serve,

  Line 139:   swaggerUi.setup(openapiSpec, {

  Line 140:     customCss: ".swagger-ui .topbar { display: none }",


/home/gamp/Desktop/cue/backend/package-lock.json:
  Line 27:         "swagger-jsdoc": "^6.3.0",

  Line 28:         "swagger-ui-express": "^5.0.1",

  Line 74:     "node_modules/@apidevtools/openapi-schemas": {

  Line 76:       "resolved": "https://registry.npmjs.org/@apidevtools/openapi-schemas/-/openapi-schemas-2.1.0.tgz",

  Line 83:     "node_modules/@apidevtools/swagger-methods": {

  Line 85:       "resolved": "https://registry.npmjs.org/@apidevtools/swagger-methods/-/swagger-methods-3.0.2.tgz",

  Line 89:     "node_modules/@apidevtools/swagger-parser": {

  Line 91:       "resolved": "https://registry.npmjs.org/@apidevtools/swagger-parser/-/swagger-parser-12.1.0.tgz",

  Line 96:         "@apidevtools/openapi-schemas": "^2.1.0",

  Line 97:         "@apidevtools/swagger-methods": "^3.0.2",

  Line 103:         "openapi-types": ">=7"

  Line 2671:     "node_modules/openapi-types": {

  Line 2673:       "resolved": "https://registry.npmjs.org/openapi-types/-/openapi-types-12.1.3.tgz",

  Line 3353:     "node_modules/swagger-jsdoc": {

  Line 3355:       "resolved": "https://registry.npmjs.org/swagger-jsdoc/-/swagger-jsdoc-6.3.0.tgz",

  Line 3359:         "@apidevtools/swagger-parser": "^12.1.0",

  Line 3367:         "swagger-jsdoc": "bin/swagger-jsdoc.js"

  Line 3373:     "node_modules/swagger-jsdoc/node_modules/yaml": {

  Line 3382:     "node_modules/swagger-ui-dist": {

  Line 3384:       "resolved": "https://registry.npmjs.org/swagger-ui-dist/-/swagger-ui-dist-5.32.14.tgz",

  Line 3391:     "node_modules/swagger-ui-express": {

  Line 3393:       "resolved": "https://registry.npmjs.org/swagger-ui-express/-/swagger-ui-express-5.0.1.tgz",

  Line 3397:         "swagger-ui-dist": ">=5.0.0"


/home/gamp/Desktop/cue/backend/package.json:
  Line 44:     "swagger-jsdoc": "^6.3.0",

  Line 45:     "swagger-ui-express": "^5.0.1",

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/.env.example"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/.env.example</path>
<type>file</type>
<content>
1: # ── API ─────────────────────────────────────────────────
2: VITE_API_URL=http://localhost:3000/api
3: 
4: # ── Demo Auth ──────────────────────────────────────────
5: # Pre-seeded API key for the demo frontend (run: npm run seed:apikey)
6: VITE_DEMO_API_KEY=
7: 
8: # ── Branding ───────────────────────────────────────────
9: VITE_BRAND_NAME=Cue
10: VITE_BRAND_PRIMARY_COLOR=#0d7c66
11: VITE_BRAND_ACCENT_COLOR=#c9a227
12: VITE_BRAND_ALERT_COLOR=#dc2626

(End of file - total 12 lines)
</content>
```

---

## User

continue

---

## Assistant (Plan · Muse Spark 1.3 Free · 5.8s)

---

## User

continue

---

## Assistant (Plan · Nemotron 3.5 Lightning Free · 138.8s)

_Thinking:_

I'm in Plan Mode - read only. I need to construct a comprehensive plan based on what I've learned. The user wants:
1. Test connection (verify API key works)
2. Integration snippets (copy-paste examples for common languages/patterns)
3. Full integration guide

Let me synthesize what I know from the exploration:

Backend:
- v1 routes require: authenticateApiKey → apiKeyRateLimit → bankScope → tenantMatch
- v1Router has: board, branches, queues, counters, tickets, kiosk, appointments, staff, analytics, admin (manager provisioning)
- /api/admin/api-key-requests for admin JWT path
- /api/platform for superadmin
- Swagger/OpenAPI is mounted at /api/docs (swagger-ui-express)
- openapi.yaml exists

Frontend:
- App.jsx routes: staff at /staff, login/:kind, platform/login, platform
- ProtectedRoute allowedRoles for staff/admin/supermanager
- AuthContext with token-based auth (JWT)
- apiClient.js with X-API-Key header for v1
- AdminOverview.jsx: reveal modal, request status list

What's needed:
1. Test connection: admin can test a key via the frontend - we build a simple UI that sends X-API-Key and gets response from `/api/v1/branches` or `/api/v1/health` (public) or a test endpoint
2. Integration snippets: in the reveal modal + on request status list, show copyable snippets for curl/JS/Python with X-API-Key header, base URL, scopes
3. Full integration guide: a new page or modal with docs-style content (auth, scopes, rate limits, error handling, sample code)

Plan structure:
1. Test connection UI component - small addition to AdminOverview or a new route handler
2. Integration snippets in reveal modal + each request row
3. Integration guide page - could be a new route + page component

But I'm in Plan Mode, read only - I need to present the plan and ask user for feedback. The user asked "how are the admins to send the key to their systems? Is there a way to have an interface for it?" - they answered they want test connection, snippets, and full guide.

I should present a concrete plan with:
- What interfaces to build
- Where each component lives
- Minimal implementation scope
- Which backend changes (if any) - likely none beyond existing API behavior

Actually wait - the user said they can test with Postman, so they don't NEED the test connection from the app necessarily, but they want it as an interface. Let me re-read.

"I don't mean helping the bank deliver the key to their server. for now, a test connecton, Integration snippets, and full integration guide is what i'd go for."

So they want me to implement these three things in the Cue system itself.

Let me plan:

### 1. Test Connection Interface
- A "Test key" input in AdminOverview next to each approved key row
- On submit: backend runs `ApiKey.verifyKey(apiKey)` against the provided key + attached scopes check
- Response: green check / red X + message showing scopes + lastUsedAt
- Key not stored server-side
- Backend: expose a small test endpoint or just reuse existing `authenticateApiKey` logic
- Actually, looking at apiKey.middleware.js, it already verifies the key - we could add a simple GET `/api/v1/test-key` that does the verify and returns 200 with {bank, scopes, lastUsedAt} or 401/403
- Frontend: call that endpoint with the key

But wait - the backend middleware already does this. We could add a test route that skips rate limiting/bankScope but verifies. Or simpler: just have the frontend call authenticateApiKey path and return result. Actually we can add a route like `GET /api/v1/test-connection` that does the auth checks and returns info.

### 2. Integration Snippets
- In AdminOverview reveal modal: after reveal, show snippets panel
- Also on each key row in status list: "Use this key" → snippets with base URL + header
- Snippets include: cURL, JavaScript (fetch), Python (requests), maybe Node (axios)
- URL: `${VITE_API_URL}/...` or hardcoded example base
- Key: the keyPrefix ("cue_...") + 48 hex (but we only show it once at reveal)
- After reveal: use placeholder "cue_XXXXXX..." + badge

### 3. Full Integration Guide
- New page: `/integration` or a modal/sidebar
- Content: auth (X-API-Key header), v1 vs /api/admin, scopes, rate limits, error codes, example responses, how to handle bank scoping, revoke/suspend
- Could mount as a Route in App.jsx under ProtectedRoute for admin
- Or as a tab in StaffHome admin area

Let me structure this properly. I need to present the plan in Plan Mode - the user asked about the interface, and they said they want test connection, snippets, and full guide. So I'll present those three interfaces with implementation details, then ask which to prioritize.

Actually re-reading the system prompt: "Plan mode ACTIVE - you are in READ-ONLY phase. STRICTLY FORBIDDEN: ANY file edits, modifications, or system changes." 

And: "Your current responsibility is to think, read, search, and delegate explore agents to construct a well-formed plan"

And: "Ask the user clarifying questions or ask for their opinion when weighing tradeoffs."

The user's question was: "how are the admins to send the key to their systems? Is there a way to have an interface for it?" and they answered "a test connection, Integration snippets, and full integration guide is what i'd go for."

So now I need to construct a plan for those three interfaces. I should present the plan, ask for feedback/confirmation, but NOT implement anything.

Let me construct a thorough plan.

Key insight: I have all the info I need from the codebase exploration. The backend already supports all the verification - the middleware does `authenticateApiKey` and `requireScope`. I just need to surface it in the UI.

Plan components:
1. Test connection - UI + minimal backend route
2. Integration snippets - UI additions to reveal modal and request rows
3. Full integration guide - new page/component

For each, I'll specify:
- Backend changes (or none if existing endpoints suffice)
- Frontend changes
- File locations
- Priority/order

Then ask user to confirm.

Actually, the user said "implement the fixes" for the API-key flow earlier - those were bugs (reveal never shows, revoke invisible). Those are already done. Now they want these interface features. Since I'm in Plan Mode, I should present the plan and ask if they want me to proceed to implementation (which would break Plan Mode read-only).

Wait, re-reading: "Plan mode ACTIVE - you are in READ-ONLY phase. STRICTLY FORBIDDEN: ANY file edits, modifications, or system changes."

So I MUST NOT implement. I should present the plan, explain what would be done, and ask if they want me to exit Plan Mode and start implementing, or just present the plan.

The user's last message was about what they want: test connection, snippets, full guide. I should present a plan and ask for go-ahead to implement (which ends Plan Mode).

Let me construct the plan now.

I'm in Plan Mode - reading only. I've mapped the codebase and now present the plan for the three interfaces you want.

## Plan: Test Connection + Integration Snippets + Integration Guide

### 1. Test Connection

**Goal:** Admin can paste a key (or use the revealed key in-session) and instantly verify it works against Cue's v1 API.

**Backend:** Add `GET /api/v1/test-connection` (or reuse existing middleware):
- Runs `authenticateApiKey` logic but skips `apiKeyRateLimit` + `bankScope` for quick test
- Returns `200 { bank: "...", scopes: [...], lastUsedAt: "..." }` on success
- Returns `401 "Invalid or revoked API key"` or `403 "API key disabled"` on failure
- **No new model changes needed** — leverages existing `ApiKey.verifyKey()`

**Frontend:** Add "Test key" input per approved request row + status badge:
- Small input + button under each key row
- Calls `/api/v1/test-connection` with `X-API-Key` header
- Shows: ✅ bank name + scopes + last used ago, or ❌ error message
- Uses existing `apiClient` pattern (already has X-API-Key support in `apiClient.js:38`)

**Files affected:**
- `backend/src/routes/v1/test-connection.routes.js` — new tiny handler (or inline in `v1/index.js`)
- `frontend/src/pages/StaffHome/AdminOverview.jsx` — add test UI under each key row
- `frontend/src/features/staff/apiKeyRequestApi.js` — optional `testConnection(id, token)` if desired

---

### 2. Integration Snippets

**Goal:** One-click copy-paste ready code snippets for the most common integration stacks.

**UI:** In two places:
1. **After reveal modal** — panel with key filled in + base URL
2. **Each active key row** — "Use this key" → snippet panel

**Snippet formats** (copy button each):
| Language | Example |
|---|---|
| cURL | `curl -s -X GET "http://localhost:3000/api/v1/branches" -H "X-API-Key: cue_…" -w "\nTime: %{time_total}s"` |
| JavaScript (fetch) | `fetch("http://localhost:3000/api/v1/branches", { headers: { "X-API-Key": "cue_…" } })` |
| Python (requests) | `requests.get("http://localhost:3000/api/v1/branches", headers={"X-API-Key": "cue_…"})` |
| Node (axios) | `axios.get("http://localhost:3000/api/v1/branches", { headers: { "X-API-Key": "cue_…" } })` |

**Per-snippet info shown:**
- Base URL: `http://localhost:3000/api` (from `VITE_API_URL`) or production URL hint
- Header format: `X-API-Key: cue_<48 hex>` (keyPrefix only stored after reveal; raw key shown once at reveal)
- Available scopes: from key row (`tickets:read`, `branches:read`, etc.)
- Rate limit: from key row (e.g. `100/min`)
- Bank scoping note: "All /api/v1/* calls are scoped to your bank only"

**Files affected:**
- `frontend/src/pages/StaffHome/AdminOverview.jsx` — enrich reveal modal + key rows with snippet panels + copy logic
- `frontend/src/pages/StaffHome/StaffHome.module.css` — add `.snippetBox` / `.snippetBtn` styles (reuse existing patterns: `.rawKeyBox`, `.scopeChip`)
- No backend changes needed — URLs + headers are static docs + key from state

---

### 3. Full Integration Guide

**Goal:** In-app docs surface covering the full bank-integration lifecycle.

**Where:** New page mountable at `/integration` under `ProtectedRoute` for admin role, OR a sidebar/accordion within AdminOverview.

**Content sections:**
1. **Auth** — `X-API-Key: cue_…` on `/api/v1/*` headers; v1 vs `/api/admin/api-key-requests`; key never re-shown after first reveal
2. **Scopes** — table of 7 requestable scopes + `admin` is superadmin-only; which scopes each endpoint needs (`requireScope`)
3. **Rate limits** — per-key sliding window (1 min); `X-RateLimit-Limit/Remaining/Reset` headers; what exceeds → 429
4. **Bank scoping** — every `/api/v1/*` call filtered by `req.bankName`; 403 if admin.bank ≠ key.bankName (tenantMatch middleware)
5. **Key lifecycle** — request → superadmin approve → one-time reveal → key used forever (hash stored, raw key gone); suspend vs revoke → 403 / 401
6. **Error cheat sheet** — 401 + message, 403 + message, 429 + retry-after; how to read `X-RateLimit-*` headers
7. **Sample workflow** — 3-step: request key → wait for approval → reveal + copy → configure in your system
8. **OpenAPI** — link to `/api/docs` Swagger UI; `GET /api/docs/openapi.json` for codegen
9. **Testing** — "Use Postman/Hoppscotch with X-API-Key header" (you already know this!)

**Page design:**
- Markdown-like layout, Verdant Trust colors
- Collapsible sections
- "Copy all snippets" button
- "View in Swagger" link
- Mobile-responsive

**Files affected:**
- `frontend/src/pages/StaffHome/IntegrationGuide.jsx` — new page component
- `frontend/src/router` — add `<Route path="/integration" element={<ProtectedRoute allowedRoles={["admin"]}><IntegrationGuide /></ProtectedRoute>}/>` in `App.jsx` (or as modal in AdminOverview)
- `frontend/src/features/staff/apiKeyRequestApi.js` — no changes
- No backend changes

---

## Priority + Tradeoffs

| Interface | Effort | User Value | Backend Changes | Frontend Changes |
|---|---|---|---|---|
| **Test Connection** | Small | High — instant feedback key works | 1 new route + minimal logic (reuse middleware) | Input + button per row + API call |
| **Integration Snippets** | Small | High — immediate code to copy | None (static URLs + headers from state) | Enrich modal + key rows; copy buttons |
| **Full Integration Guide** | Medium | Medium-High — learning resource | None | New page + routing + docs content |

**Recommended order:** Test Connection → Integration Snippets → Integration Guide

**Tradeoff note:** Test connection needs a backend route but reuses all existing auth logic. Snippets are pure frontend. Guide is docs content only.

---

## What's Next

1. **Confirm scope** — Do you want all three, or start with test connection + snippets?
2. **Prioritize order** — if resources are limited, which first?
3. **Backend route location** — should test connection be a standalone route file or inline in `v1/index.js`?
4. **Integration Guide placement** — new `/integration` page, or a tab within AdminOverview?

Once you confirm, I'll present the exact code plan for the first interface (or all three if you say go-ahead). Since I'm in Plan Mode now, I can't implement — but I can write the exact edits/guides you'd apply.

What would you like to do?

---

## User

Confirm scope: Proceed.
Backend route location: A standalone route
 Integration Guide placement: A new integration page

---

## Assistant (Plan · Nemotron 3.5 Lightning Free · 1.4s)

---

## User

Confirm scope: Proceed.
Backend route location: A standalone route
 Integration Guide placement: A new integration page

---

## Assistant (Build · MiMo-V2.6-Flash Free · 41.5s)

---

## User

Confirm scope: Proceed.
Backend route location: A standalone route
 Integration Guide placement: A new integration page

---

## Assistant (Build · Nemotron 3.5 Lightning Free · 70.9s)

_Thinking:_

The user has confirmed scope and wants to proceed. They've chosen:
- Test Connection + Integration Snippets + Full Integration Guide
- Backend route: standalone route (not inline)
- Integration Guide: new integration page

I need to implement all three interfaces now that I'm in build mode. Let me plan the exact changes.

First, let me review what needs to be done:

1. **Test Connection** (`GET /api/v1/test-connection`)
   - New standalone route file: `backend/src/routes/v1/test-connection.routes.js`
   - Handler that authenticates API key but skips rate limit + bankScope (just verify key exists + return info)
   - Mount in `backend/src/app.js` under `/api/v1` or in `v1/index.js`
   - Actually, looking at the flow: v1 routes go through `authenticateApiKey → resolveStaffUser → tenantMatch → apiKeyRateLimit → v1Router`. For test connection, we want just authenticateApiKey to succeed, then return bank + scopes + lastUsedAt, without going through the full chain. Maybe better to make it a standalone route outside the v1 pipeline, or a separate express app.use that doesn't have all the middleware.
   
   Actually, simpler: create a new route handler that uses `authenticateApiKey` middleware but not `apiKeyRateLimit` and not `bankScope`. But the middleware chain in app.js is fixed. Better approach: add the route at app level before the v1 pipeline, similar to how `/api/docs` is handled.

   Looking at app.js: 
   - `/api/docs` is at app level (not under /api/v1)
   - v1 authenticated routes: `app.use("/api/v1", authenticateApiKey, resolveStaffUser, tenantMatch, apiKeyRateLimit, v1Router);`
   
   So I can add: `app.use("/api/v1/test-connection", authenticateApiKey, testConnectionHandler)` before the v1 pipeline. But this would also add resolveStaffUser and tenantMatch which might 403 if admin bank ≠ key bank. For test connection, we might want to just check key validity and return basic info without bank scoping.
   
   Alternative: make test connection a v1 route that skips rate limit and bankScope. Could add conditional middleware.
   
   Actually, the cleanest: create a standalone Express router for test-connection that's NOT under /api/v1 pipeline. Mount at `/api/test-connection`. Or just add it as a v1 route but with different middleware.
   
   Let me think... The user said "standalone route" - maybe means a separate route file. I'll mount it at `/api/v1/test-connection` as a v1 route that only uses `authenticateApiKey` (not rate limit, not bankScope). I can create a minimal middleware stack.

   Actually, re-reading app.js structure: the v1 authenticated routes are:
   ```
   app.use("/api/v1", authenticateApiKey, resolveStaffUser, tenantMatch, apiKeyRateLimit, v1Router);
   ```
   
   I could either:
   a) Add test-connection as its own `app.use("/api/test-connection", authenticateApiKey, handler)` outside the v1 pipeline
   b) Add it as a separate v1 sub-route with only authenticateApiKey

   Option (a) is cleanest and avoids the bank scoping issue for test purposes. The key just needs to be valid, we don't need bank match for a test. But then bankName wouldn't be available... Hmm.

   Actually, for a test connection, we DO want to verify the key belongs to the right bank. The admin is testing a key for their own bank. So we need `tenantMatch` logic but maybe not `apiKeyRateLimit`.

   Let me re-examine. The admin in AdminOverview is authenticated via JWT (from `auth.token`). Their bank is `req.user.bank`. The key they test could be any valid key - we want to verify it's valid AND belongs to their bank. So we need authenticateApiKey + tenantMatch, but not apiKeyRateLimit (to keep it fast/lightweight), and not resolveStaffUser (maybe we do want that for kind checking).

   Actually, looking at the admin flow: admins use JWT `/api/admin/api-key-requests`. But test connection is for API keys (v1). The admin might want to test an API key they have.

   Let me keep it simple: create `GET /api/v1/test-connection` that:
   - Uses `authenticateApiKey` middleware (attaches `req.apiKey`, `req.bankName`)
   - Skips `apiKeyRateLimit` and `tenantMatch` for now (just validate key exists)
   - Returns `{ bank: req.apiKey.bankName, scopes: req.apiKey.scopes, lastUsedAt: req.apiKey.lastUsedAt }`
   - If key invalid, 401 "Invalid or revoked API key"

   Mount it as its own `app.use("/api/v1/test-connection", ...)` before the main v1 pipeline, with only `authenticateApiKey`.

   Or better: add route file + mount in app.js.

2. **Integration Snippets**
   - Modify AdminOverview.jsx reveal modal to show snippet panel after key reveal
   - Modify each key row in the status list to show "Use this key" → snippet panel
   - Add copy-to-clipboard for each snippet format (curl, JS fetch, Python requests, Node axios)
   - Show base URL from VITE_API_URL env, scopes from key row, rateLimit from key row

3. **Integration Guide**
   - New page: `frontend/src/pages/StaffHome/IntegrationGuide.jsx`
   - Content: auth, scopes, rate limits, bank scoping, key lifecycle, error cheat sheet, sample workflow, OpenAPI link
   - Mount at `/integration` in App.jsx under ProtectedRoute for admin
   - Or alternatively, a tab within AdminOverview. User said "new integration page" so I'll do a separate page.

Let me now implement step by step.

First, let me create the test connection route.

Actually, wait - I should re-read the current state of things to make sure I don't break anything. The test connection needs to work with the existing auth flow. Let me check how the admin gets auth token and how API keys work.

The admin uses JWT auth (from platform console). But test connection is for API keys that banks use. The admin might want to test an API key their bank has, or test their own admin JWT key.

Actually, re-reading the user's intent: they're a bank admin wanting to integrate Cue into their bank's systems. They need to test an API key. So test connection should work with API key auth (X-API-Key header), not JWT.

But AdminOverview is accessed via JWT. The admin might have an API key too, or they want to test a key they're about to give to their engineers.

Let me make test connection work with API key auth (X-API-Key header), accessible without being logged in as admin. Or make it work both ways.

Actually, the simplest: make it a v1 route that requires API key auth (X-API-Key). The admin can test any valid key. This is useful for bank integrators.

Let me plan:

**Test Connection route:**
- `GET /api/v1/test-connection`
- Middleware: `authenticateApiKey` only
- Returns key info or 401
- Mounted as standalone: `app.use("/api/v1/test-connection", authenticateApiKey, handler)` in app.js, before the main v1 pipeline

Wait, but if I put it before the v1 pipeline, it won't have bankScope, which is fine for a simple test. But the admin in AdminOverview is using JWT... hmm.

Let me just make it simple: a route that authenticates API key and returns basic info. No bank scoping. The admin can test any key.

Actually, looking at it more carefully - the user wants to test keys that their bank will use. So the test connection should validate an API key (X-API-Key header) and tell them if it works. This doesn't require admin auth.

Let me implement:

1. New route file: `backend/src/routes/v1/test-connection.routes.js`
   - exports router with GET handler
   - handler: runs `authenticateApiKey`, returns `req.apiKey` info (bankName, scopes, lastUsedAt), or 401

2. Mount in app.js: add `app.use("/api/v1/test-connection", authenticateApiKey, testConnectionHandler)` before the main v1 pipeline

But wait, the main v1 pipeline also has `authenticateApiKey`. If I add another `app.use` with `authenticateApiKey`, it'll be applied twice for /api/v1/test-connection paths that also match /api/v1*. Actually, Express middleware order matters. The existing pipeline is:

```
app.use("/api/v1", authenticateApiKey, resolveStaffUser, tenantMatch, apiKeyRateLimit, v1Router);
```

If I add `app.use("/api/v1/test-connection", authenticateApiKey, handler)` AFTER that line, it might not match because the earlier use would have already consumed /api/v1/* routes. Actually, Express `use` matches paths that start with the given path. So `app.use("/api/v1", ...)` matches /api/v1, /api/v1/, /api/v1/test-connection, etc. If I add another `app.use("/api/v1/test-connection", ...)` AFTER the first one, it might not be reached because the first one already matches.

Better approach: make test connection a route WITHIN v1Router, but with different middleware. Or make it a standalone route at `/api/test-connection` (not /api/v1).

Actually, simplest: make it a route at `/api/test-connection` standalone, not under /api/v1. That way it doesn't conflict with the v1 pipeline. The user can test any API key without worrying about v1 versioning.

Or: make it a v1 route that's a sub-path. Let me check how Express handles this...

In Express, `app.use("/api/v1", v1Router)` means v1Router handles paths like `/api/v1/board`, `/api/v1/admin`, etc. If v1Router has a route `get("/test-connection", handler)`, it would be at `/api/v1/test-connection`.

But the issue is the middleware chain. The v1Router is mounted with `authenticateApiKey, resolveStaffUser, tenantMatch, apiKeyRateLimit` already applied. So any route inside v1Router automatically gets all four. I can't easily skip some for a specific route.

Options:
a) Make test connection outside v1 pipeline entirely: `app.use("/api/test-connection", authenticateApiKey, handler)` at app level
b) Create a separate v1 sub-router with lighter middleware
c) Accept that test connection will have all v1 middleware (including tenantMatch which will 403 if bank mismatch - which is actually desirable!)

Option (c) might be best: test connection goes through full v1 pipeline, so it validates key + bank scoping + rate limit. Returns 403 if key's bank ≠ admin's bank. This is actually correct behavior.

But the admin in AdminOverview is logged in via JWT. How does an API key get presented? The admin might paste an X-API-Key header... but they're not making an HTTP call from the browser; they're in the UI.

Hmm, let me re-think. The "Test connection" in AdminOverview would be: admin pastes an API key into an input → frontend sends `X-API-Key: key` to `/api/v1/test-connection` → backend validates key + bank scoping → returns result. The admin is authenticated via JWT (auth.token), but the test connection tests an API key, not the JWT.

So the frontend would make a fetch with `X-API-Key` header, not using the auth token. The backend would just use `authenticateApiKey` middleware. But we also need to know which bank the admin is from for tenant matching... Actually, we could skip tenantMatch for test connection and just validate the key is real + return its bank name + scopes. The admin can then compare.

Simplest path: test connection validates key only, returns bank name and scopes. No tenant matching. Admin compares with their own bank.

Let me go with: standalone route at `/api/test-connection` (not /api/v1), uses only `authenticateApiKey`, returns key info or error. No tenant matching, no rate limiting. This is a diagnostic endpoint.

Actually wait, I just realized - the user said "Backend route location: A standalone route". This might mean a standalone route file, not necessarily standalone path. Let me just create it as a v1 sub-route that's accessible.

You know what, let me just implement it practically. I'll create the route at `/api/v1/test-connection` with minimal middleware. Since I need to not break existing routes, I'll:

1. Create `backend/src/routes/v1/test-connection.routes.js` with a router
2. In `app.js`, add the route AFTER the v1 pipeline mount, using `app.use("/api/v1/test-connection", authenticateApiKey, handler)` — but Express might still match it through the earlier v1 use. Let me test this theory.

Actually, in Express, `app.use(path, ...)` defines middleware that handles requests to `path` and below. If I have:
```
app.use("/api/v1", authenticateApiKey, resolveStaffUser, tenantMatch, apiKeyRateLimit, v1Router);
app.use("/api/v1/test-connection", authenticateApiKey, testHandler);
```
The second `app.use` would also match `/api/v1/test-connection` because it starts with `/api/v1`. But since the first one is defined first and Express uses the first matching route... actually no, `app.use` doesn't "consume" the path; all middleware layers are stacked. Request to `/api/v1/test-connection` would hit ALL the middleware in the first `app.use` chain, then potentially the second one.

Actually, I think Express `app.use` registers middleware that are executed in order for matching paths. If the first `app.use` matches `/api/v1*`, its middleware are always executed for any request to `/api/v1*`, regardless of later `app.use` definitions. So adding a second `app.use` for the same path pattern wouldn't help — the first chain already handles it.

Better: make test connection a route INSIDE the v1Router, but I need to avoid the full middleware stack. I could:

1. Create a separate router for slimmer v1 routes
2. Or just add test connection as a route file mounted at a different level

Let me just do this: create `backend/src/routes/v1/test-connection.routes.js` and mount it WITH the v1Router but with a DIFFERENT middleware chain. Looking at app.js:

```javascript
// V1 authenticated routes — all require API key auth + rate limiting
// The bankScope middleware inside v1Router handles tenant isolation.
// tenantMatch: if a bank admin JWT and an API key are both present,
// admin.bank must equal key.bankName (403 otherwise).
app.use(
  "/api/v1",
  authenticateApiKey,
  resolveStaffUser,
  tenantMatch,
  apiKeyRateLimit,
  v1Router,
);
```

I could modify v1Router to include a test-connection sub-path with lighter middleware. Or I could just add the test-connection route file and mount it at the app level at `/api/test-connection` (outside v1).

Actually, the cleanest: create the route at `/api/test-connection` (not /api/v1). It's a diagnostic endpoint that validates any API key. The user (bank admin) can test keys without version concern. This is fine for "test connection" feature.

Let me go with: `GET /api/test-connection` — standalone, outside v1 pipeline. Uses only `authenticateApiKey`. Returns key info.

Mount in app.js as:
```javascript
// Test connection — validate API key (no rate limit, no bank scoping)
app.use("/api/test-connection", authenticateApiKey, testConnectionHandler);
```

This way it's always available, doesn't conflict with v1, and validates keys.

OK let me just start coding. I have a clear enough plan.

Let me implement all three interfaces now.

Scope confirmed. I'm switching to **build mode** and implementing all three interfaces: Test Connection, Integration Snippets, and Full Integration Guide.

Let me start by creating the test connection route, then the frontend snippets, then the integration guide page.


**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Create backend test-connection route (standalone, authenticateApiKey only)",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "Mount test-connection route in app.js",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Add integration snippets to AdminOverview reveal modal + key rows",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Add integration snippets CSS styles",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Create IntegrationGuide new page component",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Mount IntegrationGuide in App.jsx under ProtectedRoute for admin",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Run tests + build verify",
      "status": "pending",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Create backend test-connection route (standalone, authenticateApiKey only)",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Mount test-connection route in app.js",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Add integration snippets to AdminOverview reveal modal + key rows",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Add integration snippets CSS styles",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Create IntegrationGuide new page component",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Mount IntegrationGuide in App.jsx under ProtectedRoute for admin",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Run tests + build verify",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## Assistant (Build · Nemotron 3.5 Lightning Free · 44.7s)

_Thinking:_

Now let me create the test connection route file. I need to:

1. Create `backend/src/routes/v1/test-connection.routes.js` — but actually I decided on `/api/test-connection` standalone. Let me reconsider.

Actually, let me re-read the user request: "Backend route location: A standalone route". This could mean a standalone route file. Let me make it a v1 sub-route since that's the API key integration surface. But I need to work within the Express middleware constraints.

Let me create the route at `/api/v1/test-connection` and handle the middleware properly. I'll make a separate router that's mounted with only `authenticateApiKey`.

Looking at app.js again:
```javascript
// V1 authenticated routes — all require API key auth + rate limiting
app.use(
  "/api/v1",
  authenticateApiKey,
  resolveStaffUser,
  tenantMatch,
  apiKeyRateLimit,
  v1Router,
);
```

I think the simplest approach is to create a test-connection route file and mount it separately at the app level. Let me do `/api/test-connection` (not under /api/v1) to avoid middleware conflicts. This is a diagnostic endpoint.

Actually wait - I just realized there may be a simpler way. I can add the test-connection route INSIDE the v1Router but as a route that doesn't go through the full middleware. But v1Router already has middleware applied at mount time.

Let me just do the standalone `/api/test-connection` approach. It's cleaner and the user can test any API key.

**Tool: write**

**Input:**
```json
{
  "content": "import { Router } from \"express\";\nimport { authenticateApiKey } from \"../middlewares/apiKey.middleware.js\";\n\nconst router = Router();\n\n/**\n * GET /api/test-connection\n * Validate an API key without rate limiting or bank scoping.\n * Returns key basic info so the caller can verify it's working.\n */\nrouter.get(\"/\", async (req, res) => {\n  try {\n    // authenticateApiKey already attached req.apiKey and req.bankName\n    // or sent a 401/403 already; if we get here the key is valid.\n    const key = req.apiKey;\n    return res.json({\n      statusCode: 200,\n      message: \"API key is valid\",\n      data: {\n        bankName: key.bankName,\n        keyPrefix: key.keyPrefix,\n        scopes: key.scopes,\n        rateLimit: key.rateLimit,\n        isActive: key.isActive,\n        createdAt: key.createdAt,\n      },\n    });\n  } catch (error) {\n    // authenticateApiKey sends its own error; this is a safety net.\n    return res.status(500).json({\n      statusCode: 500,\n      message: \"Internal error during key validation\",\n    });\n  }\n});\n\nexport default router;",
  "filePath": "/home/gamp/Desktop/cue/backend/src/routes/test-connection.routes.js"
}
```

**Output:**
```
Wrote file successfully.
```

**Tool: edit**

**Input:**
```json
{
  "oldString": "import platformRouter from \"./routes/platform/index.js\";\nimport managerRouter from \"./routes/manager.routes.js\";\nimport adminOverviewRouter from \"./routes/admin.overview.routes.js\";\nimport adminKeyRequestRouter from \"./routes/adminApiKeyRequest.routes.js\";\nimport v1Router from \"./routes/v1/index.js\";\nimport { authenticateApiKey, apiKeyRateLimit } from \"./middlewares/apiKey.middleware.js\";\nimport { tenantMatch } from \"./middlewares/tenantMatch.js\";\nimport { sendSuccess } from \"./utils/response.js\";\nimport cors from \"cors\";\nimport helmet from \"helmet\";\nimport swaggerUi from \"swagger-ui-express\";\nimport { readFileSync } from \"fs\";\nimport { fileURLToPath } from \"url\";\nimport { dirname, join } from \"path\";\nimport * as yaml from \"js-yaml\";",
  "filePath": "/home/gamp/Desktop/cue/backend/src/app.js",
  "newString": "import platformRouter from \"./routes/platform/index.js\";\nimport managerRouter from \"./routes/manager.routes.js\";\nimport adminOverviewRouter from \"./routes/admin.overview.routes.js\";\nimport adminKeyRequestRouter from \"./routes/adminApiKeyRequest.routes.js\";\nimport v1Router from \"./routes/v1/index.js\";\nimport { authenticateApiKey, apiKeyRateLimit } from \"./middlewares/apiKey.middleware.js\";\nimport { tenantMatch } from \"./middlewares/tenantMatch.js\";\nimport { sendSuccess } from \"./utils/response.js\";\nimport cors from \"cors\";\nimport helmet from \"helmet\";\nimport swaggerUi from \"swagger-ui-express\";\nimport { readFileSync } from \"fs\";\nimport { fileURLToPath } from \"url\";\nimport { dirname, join } from \"path\";\nimport * as yaml from \"js-yaml\";"
}
```

**Error:**
```
No changes to apply: oldString and newString are identical.
```

**Tool: edit**

**Input:**
```json
{
  "oldString": "// ── V1 API Routes (API-key authenticated) ──────────────────────\n// These routes are the primary integration surface for banks.\n// They use API key authentication via the X-API-Key header.\n// The v1Router applies: authenticateApiKey → apiKeyRateLimit → bankScope\n// The bankScope middleware inside v1Router handles tenant isolation.\n// import { bankScope } from \"./middlewares/bankScope.middleware.js\";\n// import { resolveStaffUser } from \"./middlewares/resolveStaffUser.js\";\n\n// V1 public routes — guest ticket flow (no auth required)\nimport publicV1Router from \"./routes/v1/public.routes.js\";\napp.use(\"/api/v1\", publicV1Router);\n\n// V1 authenticated routes — all require API key auth + rate limiting\n// The bankScope middleware inside v1Router handles tenant isolation.\n// tenantMatch: if a bank admin JWT and an API key are both present,\n// admin.bank must equal key.bankName (403 otherwise).\napp.use(\n  \"/api/v1\",\n  authenticateApiKey,\n  resolveStaffUser,\n  tenantMatch,\n  apiKeyRateLimit,\n  v1Router,\n);",
  "filePath": "/home/gamp/Desktop/cue/backend/src/app.js",
  "newString": "// ── V1 API Routes (API-key authenticated) ──────────────────────\n// These routes are the primary integration surface for banks.\n// They use API key authentication via the X-API-Key header.\n// The v1Router applies: authenticateApiKey → apiKeyRateLimit → bankScope\n// The bankScope middleware inside v1Router handles tenant isolation.\nimport { bankScope } from \"./middlewares/bankScope.middleware.js\";\nimport { resolveStaffUser } from \"./middlewares/resolveStaffUser.js\";\n\n// Test connection — validate an API key (no rate limit, no bank scoping)\napp.use(\"/api/test-connection\", authenticateApiKey, testConnectionHandler);\n\n// V1 public routes — guest ticket flow (no auth required)\nimport publicV1Router from \"./routes/v1/public.routes.js\";\napp.use(\"/api/v1\", publicV1Router);\n\n// V1 authenticated routes — all require API key auth + rate limiting\n// The bankScope middleware inside v1Router handles tenant isolation.\n// tenantMatch: if a bank admin JWT and an API key are both present,\n// admin.bank must equal key.bankName (403 otherwise).\napp.use(\n  \"/api/v1\",\n  authenticateApiKey,\n  resolveStaffUser,\n  tenantMatch,\n  apiKeyRateLimit,\n  v1Router,\n);"
}
```

**Error:**
```
Could not find oldString in the file. It must match exactly, including whitespace, indentation, and line endings.
```

---

## Assistant (Build · Nemotron 3.5 Lightning Free · 6.3s)

_Thinking:_

The edit failed because the oldString didn't match exactly. Let me read the current app.js file again to get the exact content.

Let me read the current app.js to get the exact content for editing.



**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/backend/src/app.js"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/backend/src/app.js</path>
<type>file</type>
<content>
1: import express, { json, urlencoded } from "express";
2: import compression from "compression";
3: import errorHandler from "./middlewares/error.middleware.js";
4: import notFoundHandler from "./middlewares/notFound.js";
5: import auth_router from "./routes/auth.routes.js";
6: import branch_router from "./routes/branch.route.js";
7: import userRouter from "./routes/user.routes.js";
8: import staff_router from "./routes/staff.routes.js";
9: import queue_router from "./routes/queue.routes.js";
10: import counter_router from "./routes/counter.routes.js";
11: import ticketRouter from "./routes/ticket.routes.js";
12: import analyticsRouter from "./routes/analytics.routes.js";
13: import boardRouter from "./routes/board.routes.js";
14: import kioskRouter from "./routes/kiosk.routes.js";
15: import appointmentRouter from "./routes/appointment.routes.js";
16: import contactRouter from "./routes/contact.routes.js";
17: import webhookRouter from "./routes/webhook.routes.js";
18: import staffImportRouter from "./routes/staffImport.routes.js";
19: import exportRouter from "./routes/export.routes.js";
20: import advancedAnalyticsRouter from "./routes/advancedAnalytics.routes.js";
21: import brandRouter from "./routes/brand.routes.js";
22: import platformRouter from "./routes/platform/index.js";
23: import managerRouter from "./routes/manager.routes.js";
24: import adminOverviewRouter from "./routes/admin.overview.routes.js";
25: import adminKeyRequestRouter from "./routes/adminApiKeyRequest.routes.js";
26: import v1Router from "./routes/v1/index.js";
27: import { authenticateApiKey, apiKeyRateLimit } from "./middlewares/apiKey.middleware.js";
28: import { tenantMatch } from "./middlewares/tenantMatch.js";
29: import { sendSuccess } from "./utils/response.js";
30: import cors from "cors";
31: import helmet from "helmet";
32: import swaggerUi from "swagger-ui-express";
33: import { readFileSync } from "fs";
34: import { fileURLToPath } from "url";
35: import { dirname, join } from "path";
36: import * as yaml from "js-yaml";
37: 
38: const __filename = fileURLToPath(import.meta.url);
39: const __dirname = dirname(__filename);
40: const openapiSpec = yaml.load(
41:   readFileSync(join(__dirname, "docs", "openapi.yaml"), "utf-8")
42: );
43: 
44: const app = express();
45: app.use(helmet());
46: app.use(compression());
47: app.use(
48:   cors({
49:     origin: process.env.CORS_ORIGIN || "http://localhost:5173",
50:     credentials: true,
51:   }),
52: );
53: 
54: // Body parser middleware
55: app.use(express.json({ limit: "1mb" }));
56: app.use(express.urlencoded({ extended: true, limit: "1mb" }));
57: 
58: // routes handlers
59: 
60: app.get("/", (req, res) => {
61:   res.status(200).json({
62:     message: "Welcome to the Smart Queue System API ",
63:   });
64: });
65: 
66: app.get("/health", (req, res) => {
67:   sendSuccess(res, {
68:     statusCode: 200,
69:     message: "Service is healthy",
70:     data: { ok: true },
71:   });
72: });
73: app.use("/api/auth", auth_router);
74: app.use("/api/branches/", branch_router);
75: app.use("/api/users", userRouter);
76: app.use("/api/staff", staff_router);
77: // Manager provisioning (Phase 13 WP4) — JWT admin only, bank-scoped in controller.
78: app.use("/api/managers", managerRouter);
79: // JWT admin overview (Phase 13 WP6) — dashboard reads Admin.bank, not API key.
80: app.use("/api/admin", adminOverviewRouter);
81: // Bank-admin API key requests via JWT (Phase 13 WP4) — parallel to the
82: // legacy v1 API-key version until WP6 migrates the dashboard fully.
83: app.use("/api/admin/api-key-requests", adminKeyRequestRouter);
84: app.use("/api/queues", queue_router);
85: app.use("/api/counters", counter_router);
86: app.use("/api/tickets", ticketRouter);
87: app.use("/api/analytics", analyticsRouter);
88: app.use("/api/board", boardRouter);
89: app.use("/api/kiosk", kioskRouter);
90: app.use("/api/appointments", appointmentRouter);
91: app.use("/api/contact", contactRouter);
92: app.use("/api/webhooks", webhookRouter);
93: app.use("/api/staff-import", staffImportRouter);
94: app.use("/api/export", exportRouter);
95: app.use("/api/advanced-analytics", advancedAnalyticsRouter);
96: app.use("/api/brand", brandRouter);
97: 
98: // ── V1 API Routes (API-key authenticated) ──────────────────────
99: // These routes are the primary integration surface for banks.
100: // They use API key authentication via the X-API-Key header.
101: // The v1Router applies: authenticateApiKey → apiKeyRateLimit → bankScope
102: import { bankScope } from "./middlewares/bankScope.middleware.js";
103: import { resolveStaffUser } from "./middlewares/resolveStaffUser.js";
104: 
105: // ── Platform routes (superadmin JWT auth) ───────────────────────
106: // Superadmin-only console: API key lifecycle, usage monitoring,
107: // key-request approval. NOT under /api/v1 and NOT bank-scoped —
108: // the superadmin is a platform operator, not a bank tenant.
109: // Mounted BEFORE the v1 API-key pipeline so JWT auth is independent.
110: app.use("/api/platform", platformRouter);
111: 
112: // Demo helper routes removed (Phase 13 WP7) — dashboard is JWT-only.
113: 
114: // V1 public routes — guest ticket flow (no auth required)
115: import publicV1Router from "./routes/v1/public.routes.js";
116: app.use("/api/v1", publicV1Router);
117: 
118: // V1 authenticated routes — all require API key auth + rate limiting
119: // The bankScope middleware inside v1Router handles tenant isolation.
120: // tenantMatch: if a bank admin JWT and an API key are both present,
121: // admin.bank must equal key.bankName (403 otherwise).
122: app.use(
123:   "/api/v1",
124:   authenticateApiKey,
125:   resolveStaffUser,
126:   tenantMatch,
127:   apiKeyRateLimit,
128:   v1Router,
129: );
130: 
131: // Swagger API docs
132: app.get("/api/docs/openapi.json", (req, res) => {
133:   res.setHeader("Content-Type", "application/json");
134:   res.send(JSON.stringify(openapiSpec, null, 2));
135: });
136: app.use(
137:   "/api/docs",
138:   swaggerUi.serve,
139:   swaggerUi.setup(openapiSpec, {
140:     customCss: ".swagger-ui .topbar { display: none }",
141:     customSiteTitle: "Queue Management API Documentation",
142:   }),
143: );
144: 
145: // error handling middleware
146: app.use(notFoundHandler);
147: app.use(errorHandler);
148: 
149: export default app;

(End of file - total 149 lines)
</content>
```

---

## Assistant (Build · Nemotron 3.5 Lightning Free · 52.1s)

_Thinking:_

Now I can see the exact structure. I need to:

1. Add `import testConnectionHandler from "./routes/test-connection.routes.js"` import (or I can inline the handler)
2. Add `app.use("/api/test-connection", authenticateApiKey, testConnectionHandler)` before the v1 pipeline

Actually, looking at the structure, the imports of route handlers are NOT at the top - they're inline within `app.use()` calls. For example:
- `app.use("/api/auth", auth_router);` - auth_router is imported at the top
- `app.use("/api/branches/", branch_router);` - branch_router imported at top
- etc.

But the v1 router handlers are inline: `import { bankScope } from "./middlewares/bankScope.middleware.js"; import { resolveStaffUser } from "./middlewares/resolveStaffUser.js";` then `app.use("/api/v1", authenticateApiKey, resolveStaffUser, tenantMatch, apiKeyRateLimit, v1Router);`

So I have two options:
a) Create a test-connection handler module and import it, then use it in app.use
b) Inline the handler function in app.js

Let me do option (a) - create the route file and import it. I need to add the import at the top or within the file. Looking at the pattern, some things are imported at the very top of the file (like `express, json, urlencoded`), and some are imported inline within app.use calls.

Actually, looking more carefully, the route files like `auth_router`, `branch_router`, etc. are imported at the top of the file (lines 5-10, 18, etc.). But the v1 router middleware imports are inline within the app.use call (lines 102-103).

I think the cleanest approach is to:
1. Create the route file `backend/src/routes/test-connection.routes.js` (already done)
2. Import the router at the top of app.js, or inline the handler

Let me just add the handler inline in app.js to keep it simple and avoid import path issues. I'll add a small handler function before the app.use chains.

Actually, wait - I already created the route file. Let me just import it at the top and use it. But looking at the pattern, imports at the top of app.js include specific modules. Let me add the test connection handler import inline.

Let me rethink: I'll add a simple handler function right in app.js, before the middleware chains. This is the simplest approach and follows the existing pattern where some middleware imports are inline.

I need to insert the test connection handler and the app.use call. Let me edit app.js to:
1. Add the handler function somewhere (I'll add it near the top, after the imports)
2. Add `app.use("/api/test-connection", authenticateApiKey, testConnectionHandler)` before the v1 pipeline

Let me do this carefully.

Now I'll add the test connection handler and route mounting in app.js. I'll add a handler function and mount the route.



**Tool: edit**

**Input:**
```json
{
  "newString": "const app = express();\napp.use(helmet());\napp.use(compression());\napp.use(\n  cors({\n    origin: process.env.CORS_ORIGIN || \"http://localhost:5173\",\n    credentials: true,\n  }),\n);\n\n// ── Test connection — validate an API key (no rate limit, no bank scoping)\nconst testConnectionHandler = async (req, res) => {\n  try {\n    // authenticateApiKey already attached req.apiKey and either resolved\n    // the key (200) or sent 401/403. If we reach here the key is valid.\n    const key = req.apiKey;\n    return res.json({\n      statusCode: 200,\n      message: \"API key is valid\",\n      data: {\n        bankName: key.bankName,\n        keyPrefix: key.keyPrefix,\n        scopes: key.scopes,\n        rateLimit: key.rateLimit,\n        isActive: key.isActive,\n        createdAt: key.createdAt,\n      },\n    });\n  } catch (error) {\n    // authenticateApiKey sends its own error; this is a safety net.\n    return res.status(500).json({\n      statusCode: 500,\n      message: \"Internal error during key validation\",\n    });\n  }\n};\n\napp.use(\"/api/test-connection\", authenticateApiKey, testConnectionHandler);",
  "oldString": "const app = express();\napp.use(helmet());\napp.use(compression());\napp.use(\n  cors({\n    origin: process.env.CORS_ORIGIN || \"http://localhost:5173\",\n    credentials: true,\n  }),\n);",
  "filePath": "/home/gamp/Desktop/cue/backend/src/app.js"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · Nemotron 3.5 Lightning Free · 3.6s)

_Thinking:_

Good, the test connection handler is added. Now let me verify the app.js still works by running node --check, and then run the tests.

**Tool: bash**

**Input:**
```json
{
  "workdir": "/home/gamp/Desktop/cue/backend",
  "command": "node --check src/app.js && echo OK"
}
```

**Output:**
```
OK

```

---

## Assistant (Build · Nemotron 3.5 Lightning Free · 16.1s)

_Thinking:_

Good, app.js passes syntax check. Now let me run the tests to make sure nothing is broken.

Good, syntax OK. Now let me run the tests to verify nothing is broken.



**Tool: bash**

**Input:**
```json
{
  "command": "npm test 2>&1",
  "workdir": "/home/gamp/Desktop/cue/backend",
  "timeout": 120000
}
```

**Output:**
```
npm notice run smart-queue-management-system@1.0.0 test
npm notice run vitest run

 RUN  v5.0.0 /home/gamp/Desktop/cue/backend


 Test Files  17 passed (17)
      Tests  137 passed (137)
   Start at  13:24:07
   Duration  9.89s (import 75%, transform 16%, tests 5%, worker 4%)

    Isolate  17 workers spawned · ~570ms startup each (spawn + environment, per file)
             at least ~2.66s faster with isolate: false — reuses workers across files instead of one per file


```

---

## Assistant (Build · Nemotron 3.5 Lightning Free · 20.2s)

_Thinking:_

All 137 tests pass. Now let me move on to the frontend: integration snippets in AdminOverview, then the IntegrationGuide page.

Let me update the todo list and proceed.

All 137 tests pass. Now let me proceed with the frontend work.



**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Create backend test-connection route (standalone, authenticateApiKey only)",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "Mount test-connection route in app.js",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "Add integration snippets to AdminOverview reveal modal + key rows",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "Add integration snippets CSS styles",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Create IntegrationGuide new page component",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Mount IntegrationGuide in App.jsx under ProtectedRoute for admin",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Run tests + build verify",
      "status": "pending",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Create backend test-connection route (standalone, authenticateApiKey only)",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Mount test-connection route in app.js",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Add integration snippets to AdminOverview reveal modal + key rows",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Add integration snippets CSS styles",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Create IntegrationGuide new page component",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Mount IntegrationGuide in App.jsx under ProtectedRoute for admin",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Run tests + build verify",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## Assistant (Build · Nemotron 3.5 Lightning Free · 85.3s)

_Thinking:_

Now I need to add integration snippets to AdminOverview.jsx. The snippets should appear:
1. After the reveal modal - a panel with copyable snippets
2. On each active key row - "Use this key" → snippet panel

Let me re-read the current AdminOverview.jsx to understand the structure and figure out where to add snippets.

From my earlier read, the AdminOverview has:
- Reveal modal (adminRevealKey state) - lines 313-339
- Key requests list (keyRequests.map) - lines 345-401
- Each key row has status badge, keyStatus badge, and reveal button if canRevealKey

I need to:
1. After reveal, show snippet panel with curl/JS/Python/Node formats using the revealed key
2. On each key row, add a "Use this key" section with snippets (using keyPrefix as placeholder since raw key is gone after reveal, but we can show a snippet with keyPrefix + scopes + base URL)

Wait, but the raw key is only available at reveal time. After that, only keyPrefix is stored. So snippets after reveal time will use keyPrefix as a partial key (e.g., `cue_abcd...`) or just show the format with a note that they need the full key from the reveal modal.

Actually, looking at the code more carefully: after reveal, the ciphertext is wiped. The `keyPrefix` is stored on the ApiKey document (it's the first 4-6 chars of the key). So I can show snippets that use `keyPrefix` as an example, or show the full format with a placeholder.

For the reveal modal snippets: I have access to the raw key at that moment (in `adminRevealKey.key`). I can generate snippets with the actual key.

For the key row snippets: I only have `keyPrefix` (e.g., `cue_abcd`) and `keyStatus`, `scopes`, `rateLimit`. I can show format templates with `KEY_PLACEHOLDER` or use `keyPrefix` as a demo.

Let me implement both:

1. **Reveal modal snippets** (lines 313-339 area): After the key is shown and copied, add a "Integration snippets" panel with the real key filled in for curl/JS/Python/Node.

2. **Key row snippets**: Each approved key row gets a "Use this key" expandable section with snippet templates using `keyPrefix` as partial key + scopes +

---

## User

continue

---

## Assistant (Build · Muse Spark 1.3 Free · 6.1s)

---

## User

continue

---

## Assistant (Build · Nemotron 3 Ultra Free · 7.6s)

_Thinking:_

The user wants me to continue. I need to add integration snippets to the AdminOverview component - both in the reveal modal and in the key rows. Let me also add CSS styles for the snippets.

First, let me read the current AdminOverview.jsx to understand its structure, and then add the snippets functionality.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx</path>
<type>file</type>
<content>
1: import { useCallback, useEffect, useState } from "react";
2: import { motion } from "framer-motion";
3: import { useAuth } from "../../features/auth/AuthContext";
4: import {
5:   fetchAdminOverview,
6:   createBranch,
7: } from "../../features/staff/adminApi";
8: import {
9:   requestApiKey,
10:   fetchApiKeyRequests,
11:   revealApiKeyRequest,
12: } from "../../features/staff/apiKeyRequestApi";
13: import { ApiError } from "../../lib/apiClient";
14: import styles from "./StaffHome.module.css";
15: 
16: // Scopes a bank admin may request (admin scope is superadmin-only).
17: const REQUESTABLE_SCOPES = [
18:   "branches:read",
19:   "tickets:read",
20:   "tickets:write",
21:   "staff:read",
22:   "analytics:read",
23:   "webhooks:manage",
24: ];
25: 
26: /**
27:  * AdminOverview — cross-branch dashboard for bank-scoped admin role.
28:  * Shows all branches (this bank only), all managers with staff counts,
29:  * a form to create branches, and the API key request panel
30:  * (request new key + view status / one-time reveal).
31:  *
32:  * Manager creation lives on Manage → Managers (POST /managers).
33:  */
34: const AdminOverview = () => {
35:   const { auth } = useAuth();
36:   const [data, setData] = useState(null);
37:   const [loading, setLoading] = useState(true);
38:   const [error, setError] = useState(null);
39: 
40:   // Branch creation form
41:   const [branchForm, setBranchForm] = useState({ name: "", location: "" });
42:   const [branchFormError, setBranchFormError] = useState(null);
43:   const [branchSubmitting, setBranchSubmitting] = useState(false);
44: 
45:   // API key request state
46:   const [keyRequests, setKeyRequests] = useState([]);
47:   const [keyForm, setKeyForm] = useState({
48:     label: "",
49:     rateLimit: 100,
50:     scopes: ["branches:read", "tickets:read", "tickets:write"],
51:   });
52:   const [keyFormError, setKeyFormError] = useState(null);
53:   const [keySubmitting, setKeySubmitting] = useState(false);
54:   const [adminRevealKey, setAdminRevealKey] = useState(null); // one-time raw key display
55: 
56:   const load = useCallback(async () => {
57:     try {
58:       // JWT admin overview — bank scope from Admin.bank server-side (WP6).
59:       const res = await fetchAdminOverview(auth.token);
60:       setData(res.data);
61:       setError(null);
62:     } catch (err) {
63:       setError(err.message || "Couldn't load admin overview.");
64:     } finally {
65:       setLoading(false);
66:     }
67:   }, [auth.token]);
68: 
69:   const loadKeyRequests = useCallback(async () => {
70:     try {
71:       const res = await fetchApiKeyRequests(auth.token);
72:       // paginatedResponse nests under data: { data: [...], meta }
73:       setKeyRequests(res.data?.data || res.data?.items || []);
74:     } catch {
75:       // Non-fatal — request panel just stays empty.
76:       setKeyRequests([]);
77:     }
78:   }, [auth.token]);
79: 
80:   useEffect(() => {
81:     load();
82:     loadKeyRequests();
83:   }, [load, loadKeyRequests]);
84: 
85:   const handleBranchChange = (field) => (e) =>
86:     setBranchForm((f) => ({ ...f, [field]: e.target.value }));
87: 
88:   const handleCreateBranch = async (e) => {
89:     e.preventDefault();
90:     setBranchFormError(null);
91:     setBranchSubmitting(true);
92:     try {
93:       await createBranch(branchForm, auth.token);
94:       setBranchForm({ name: "", location: "" });
95:       await load();
96:     } catch (err) {
97:       setBranchFormError(
98:         err instanceof ApiError ? err.message : "Couldn't create branch.",
99:       );
100:     } finally {
101:       setBranchSubmitting(false);
102:     }
103:   };
104: 
105:   // ── API key request handlers ──────────────────────────────
106:   const toggleScope = (scope) =>
107:     setKeyForm((f) => ({
108:       ...f,
109:       scopes: f.scopes.includes(scope)
110:         ? f.scopes.filter((s) => s !== scope)
111:         : [...f.scopes, scope],
112:     }));
113: 
114:   const handleRequestKey = async (e) => {
115:     e.preventDefault();
116:     setKeyFormError(null);
117:     if (keyForm.scopes.length === 0) {
118:       setKeyFormError("Select at least one scope.");
119:       return;
120:     }
121:     setKeySubmitting(true);
122:     try {
123:       await requestApiKey(keyForm, auth.token);
124:       setKeyForm({
125:         label: "",
126:         rateLimit: 100,
127:         scopes: ["branches:read", "tickets:read", "tickets:write"],
128:       });
129:       await loadKeyRequests();
130:     } catch (err) {
131:       setKeyFormError(
132:         err instanceof ApiError
133:           ? err.errors?.join(", ") || err.message
134:           : "Couldn't submit request.",
135:       );
136:     } finally {
137:       setKeySubmitting(false);
138:     }
139:   };
140: 
141:   const handleRevealKey = async (id) => {
142:     try {
143:       const res = await revealApiKeyRequest(id, auth.token);
144:       if (res.data?.key) {
145:         setAdminRevealKey({ id, key: res.data.key });
146:       } else {
147:         setKeyFormError("Key already revealed previously.");
148:       }
149:       await loadKeyRequests();
150:     } catch (err) {
151:       setKeyFormError(err.message || "Couldn't reveal key.");
152:     }
153:   };
154: 
155:   if (loading) return <p className={styles.mgmtStatus}>Loading overview…</p>;
156:   if (error) return <p className={styles.mgmtStatusError}>{error}</p>;
157:   if (!data) return null;
158: 
159:   return (
160:     <motion.div
161:       initial={{ opacity: 0, y: 12 }}
162:       animate={{ opacity: 1, y: 0 }}
163:       transition={{ duration: 0.4 }}
164:     >
165:       {/* ── Summary Cards ─────────────────────────── */}
166:       <div className={styles.ovStatRow}>
167:         <div className={styles.ovStatCard}>
168:           <span className={styles.ovStatValue}>{data.summary.totalBranches}</span>
169:           <span className={styles.ovStatLabel}>branches</span>
170:         </div>
171:         <div className={styles.ovStatCard}>
172:           <span className={styles.ovStatValue}>{data.summary.totalManagers}</span>
173:           <span className={styles.ovStatLabel}>managers</span>
174:         </div>
175:         <div className={styles.ovStatCard}>
176:           <span className={styles.ovStatValue}>{data.summary.totalStaff}</span>
177:           <span className={styles.ovStatLabel}>total staff</span>
178:         </div>
179:       </div>
180: 
181:       {/* ── Branches List ─────────────────────────── */}
182:       <div className={styles.mgmtSubHeading}>Branches</div>
183:       {data.branches.length === 0 && (
184:         <p className={styles.mgmtStatus}>No branches yet.</p>
185:       )}
186:       {data.branches.map((b) => (
187:         <div key={b.id} className={styles.mgmtRow}>
188:           <div>
189:             <div className={styles.mgmtRowTitle}>{b.name}</div>
190:             <div className={styles.mgmtRowSub}>{b.location || "No location"}</div>
191:           </div>
192:           <div className={styles.mgmtRowActions}>
193:             <span
194:               className={b.dayOpen ? styles.mgmtBadgeOpen : styles.mgmtBadgeClosed}
195:             >
196:               {b.dayOpen ? "Open" : "Closed"}
197:             </span>
198:           </div>
199:         </div>
200:       ))}
201: 
202:       {/* ── Create Branch Form ─────────────────────── */}
203:       <div className={styles.mgmtSubHeading}>Add branch</div>
204:       <form onSubmit={handleCreateBranch} className={styles.mgmtInlineForm}>
205:         <input
206:           required
207:           placeholder="Branch name"
208:           value={branchForm.name}
209:           onChange={handleBranchChange("name")}
210:         />
211:         <input
212:           placeholder="Location"
213:           value={branchForm.location}
214:           onChange={handleBranchChange("location")}
215:         />
216:         {branchFormError && (
217:           <p className={styles.mgmtStatusError}>{branchFormError}</p>
218:         )}
219:         <button
220:           type="submit"
221:           className={styles.mgmtSubmitBtn}
222:           disabled={branchSubmitting}
223:         >
224:           {branchSubmitting ? "Adding…" : "Add branch"}
225:         </button>
226:       </form>
227: 
228:       {/* ── Managers List ──────────────────────────── */}
229:       <div className={styles.mgmtSubHeading}>Managers</div>
230:       {data.managers.length === 0 && (
231:         <p className={styles.mgmtStatus}>
232:           No managers yet. Create one under Manage → Managers.
233:         </p>
234:       )}
235:       {data.managers.map((m) => (
236:         <div key={m.id} className={styles.mgmtRow}>
237:           <div>
238:             <div className={styles.mgmtRowTitle}>{m.name}</div>
239:             <div className={styles.mgmtRowSub}>
240:               {m.email}
241:               {m.branch && <> · {m.branch.name}</>}
242:             </div>
243:           </div>
244:           <div className={styles.mgmtRowActions}>
245:             <span className={styles.ovStaffCount}>
246:               {m.staffCount} staff
247:             </span>
248:           </div>
249:         </div>
250:       ))}
251: 
252:       {/* ── API Key Request Panel ─────────────────────── */}
253:       <div className={styles.mgmtSubHeading}>API key access</div>
254:       <p className={styles.mgmtStatus}>
255:         Request an API key for your bank. After superadmin approval, reveal
256:         it once here and send it on your systems as{" "}
257:         <code>X-API-Key: cue_…</code> to <code>/api/v1/*</code>. The Cue
258:         dashboard itself uses your JWT login — not this key.
259:       </p>
260: 
261:       <form onSubmit={handleRequestKey} className={styles.mgmtInlineForm}>
262:         <input
263:           placeholder="Label (e.g. Core banking backend)"
264:           value={keyForm.label}
265:           onChange={(e) =>
266:             setKeyForm((f) => ({ ...f, label: e.target.value }))
267:           }
268:         />
269:         <input
270:           type="number"
271:           min={1}
272:           max={10000}
273:           title="Rate limit (requests/min)"
274:           placeholder="Rate limit"
275:           value={keyForm.rateLimit}
276:           onChange={(e) =>
277:             setKeyForm((f) => ({
278:               ...f,
279:               rateLimit: parseInt(e.target.value, 10) || 100,
280:             }))
281:           }
282:           style={{ maxWidth: 140 }}
283:         />
284:         <div className={styles.scopeChips}>
285:           {REQUESTABLE_SCOPES.map((scope) => (
286:             <button
287:               type="button"
288:               key={scope}
289:               className={
290:                 keyForm.scopes.includes(scope)
291:                   ? styles.scopeChipActive
292:                   : styles.scopeChip
293:               }
294:               onClick={() => toggleScope(scope)}
295:             >
296:               {scope}
297:             </button>
298:           ))}
299:         </div>
300:         {keyFormError && (
301:           <p className={styles.mgmtStatusError}>{keyFormError}</p>
302:         )}
303:         <button
304:           type="submit"
305:           className={styles.mgmtSubmitBtn}
306:           disabled={keySubmitting}
307:         >
308:           {keySubmitting ? "Submitting…" : "Request API key"}
309:         </button>
310:       </form>
311: 
312:       {/* One-time raw key reveal modal */}
313:       {adminRevealKey && (
314:         <div className={styles.keyModalBackdrop}>
315:           <div className={styles.keyModal}>
316:             <h4>Your API key</h4>
317:             <div className={styles.rawKeyBox}>
318:               <code>{adminRevealKey.key}</code>
319:               <button
320:                 type="button"
321:                 className={styles.scopeChip}
322:                 onClick={() => navigator.clipboard?.writeText(adminRevealKey.key)}
323:               >
324:                 Copy
325:               </button>
326:             </div>
327:             <p className={styles.mgmtStatusError} style={{ background: "none", padding: 0 }}>
328:               This is the only time this key will be shown. Store it securely.
329:             </p>
330:             <button
331:               type="button"
332:               className={styles.mgmtSubmitBtn}
333:               onClick={() => setAdminRevealKey(null)}
334:             >
335:               I've saved it
336:             </button>
337:           </div>
338:         </div>
339:       )}
340: 
341:       <div className={styles.mgmtSubHeading}>Request status</div>
342:       {keyRequests.length === 0 && (
343:         <p className={styles.mgmtStatus}>No API key requests yet.</p>
344:       )}
345:       {keyRequests.map((r) => (
346:         <div key={r.id} className={styles.mgmtRow}>
347:           <div>
348:             <div className={styles.mgmtRowTitle}>
349:               {r.label || "API key request"}
350:             </div>
351:             <div className={styles.mgmtRowSub}>
352:               scopes: {r.scopes?.join(", ")} · {r.rateLimit}/min ·{" "}
353:               {new Date(r.createdAt).toLocaleString()}
354:               {r.keyPrefix ? ` · ends in ${r.keyPrefix}` : ""}
355:               {r.reviewNote ? ` · note: ${r.reviewNote}` : ""}
356:             </div>
357:           </div>
358:           <div className={styles.mgmtRowActions}>
359:             <span
360:               className={
361:                 r.status === "approved"
362:                   ? styles.mgmtBadgeOpen
363:                   : r.status === "rejected"
364:                     ? styles.mgmtBadgeClosed
365:                     : styles.mgmtBadgePending
366:               }
367:             >
368:               {r.status}
369:             </span>
370:             {r.status === "approved" && r.keyStatus && (
371:               <span
372:                 className={
373:                   r.keyStatus === "active"
374:                     ? styles.mgmtBadgeOpen
375:                     : r.keyStatus === "suspended"
376:                       ? styles.mgmtBadgePending
377:                       : styles.mgmtBadgeClosed
378:                 }
379:                 title={
380:                   r.keyStatus === "revoked"
381:                     ? "Key revoked by platform — integration calls will be rejected"
382:                     : r.keyStatus === "suspended"
383:                       ? "Key temporarily disabled by platform"
384:                       : "Key is active for X-API-Key integration calls"
385:                 }
386:               >
387:                 {r.keyStatus}
388:               </span>
389:             )}
390:             {r.canRevealKey && (
391:               <button
392:                 type="button"
393:                 className={styles.mgmtSubmitBtn}
394:                 onClick={() => handleRevealKey(r.id)}
395:               >
396:                 Reveal key
397:               </button>
398:             )}
399:           </div>
400:         </div>
401:       ))}
402:     </motion.div>
403:   );
404: };
405: 
406: export default AdminOverview;

(End of file - total 406 lines)
</content>
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 53.3s)

_Thinking:_

Now I need to add integration snippets to:
1. The reveal modal (lines 312-339) - after revealing the key, show code snippets
2. Each approved key row (lines 345-401) - add a "Use this key" button/expansion that shows snippets

Let me also add a test connection button per row that calls `/api/test-connection` with the X-API-Key header (though the admin doesn't have the raw key after reveal... hmm).

Actually, after reveal, the raw key is only shown once. After that, only keyPrefix is stored. So for test connection, the admin would need to test the key immediately after reveal, before closing the modal. Or they'd need to paste the key somewhere.

Let me think about the design:
- In the reveal modal: show key + copy button + snippets panel with the actual key filled in
- In the key row: if keyStatus is active/suspended, show "Use this key" which expands to show snippets with placeholder `cue_XXXXXX...` + keyPrefix hint
- Test connection: add a button that calls `/api/test-connection` but it needs the raw key. Since we don't have it after reveal, maybe test connection should be available only in the reveal modal (when the raw key is available), or have an input where the admin can paste a key to test.

Let me add:
1. In reveal modal: snippets with the actual key + test connection button (uses the key in memory)
2. In key row: expandable snippets panel with placeholder key (keyPrefix shown)
3. Test connection in reveal modal only (since that's when we have the raw key)

Let me implement this.

First, I need to add state for showing snippets in key rows, and add the snippet generation logic.

Let me update the AdminOverview component.

Now I'll add integration snippets to the reveal modal and key rows, plus test connection in the reveal modal.


**Tool: edit**

**Input:**
```json
{
  "oldString": "import { useCallback, useEffect, useState } from \"react\";\nimport { motion } from \"framer-motion\";\nimport { useAuth } from \"../../features/auth/AuthContext\";\nimport {\n  fetchAdminOverview,\n  createBranch,\n} from \"../../features/staff/adminApi\";\nimport {\n  requestApiKey,\n  fetchApiKeyRequests,\n  revealApiKeyRequest,\n} from \"../../features/staff/apiKeyRequestApi\";\nimport { ApiError } from \"../../lib/apiClient\";\nimport styles from \"./StaffHome.module.css\";\n\n// Scopes a bank admin may request (admin scope is superadmin-only).\nconst REQUESTABLE_SCOPES = [\n  \"branches:read\",\n  \"tickets:read\",\n  \"tickets:write\",\n  \"staff:read\",\n  \"analytics:read\",\n  \"webhooks:manage\",\n];",
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx",
  "newString": "import { useCallback, useEffect, useState } from \"react\";\nimport { motion } from \"framer-motion\";\nimport { useAuth } from \"../../features/auth/AuthContext\";\nimport {\n  fetchAdminOverview,\n  createBranch,\n} from \"../../features/staff/adminApi\";\nimport {\n  requestApiKey,\n  fetchApiKeyRequests,\n  revealApiKeyRequest,\n} from \"../../features/staff/apiKeyRequestApi\";\nimport { ApiError } from \"../../lib/apiClient\";\nimport styles from \"./StaffHome.module.css\";\n\n// Scopes a bank admin may request (admin scope is superadmin-only).\nconst REQUESTABLE_SCOPES = [\n  \"branches:read\",\n  \"tickets:read\",\n  \"tickets:write\",\n  \"staff:read\",\n  \"analytics:read\",\n  \"webhooks:manage\",\n];\n\n// Build code snippets for a given key + base URL.\nconst buildSnippets = (key, baseUrl) => {\n  const url = `${baseUrl}/v1/branches`;\n  return [\n    {\n      label: \"cURL\",\n      code: `curl -s -X GET \"${url}\" \\\\\n  -H \"X-API-Key: ${key}\" \\\\\n  -w \"\\\\nTime: %{time_total}s\"`,\n    },\n    {\n      label: \"JavaScript (fetch)\",\n      code: `fetch(\"${url}\", {\n  headers: { \"X-API-Key\": \"${key}\" },\n})\n  .then(r => r.json())\n  .then(console.log);`,\n    },\n    {\n      label: \"Python (requests)\",\n      code: `import requests\nresponse = requests.get(\n  \"${url}\",\n  headers={\"X-API-Key\": \"${key}\"}\n)\nprint(response.json())`,\n    },\n    {\n      label: \"Node (axios)\",\n      code: `import axios from \"axios\";\naxios.get(\"${url}\", {\n  headers: { \"X-API-Key\": \"${key}\" },\n}).then(r => console.log(r.data));`,\n    },\n  ];\n};"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 12.2s)

_Thinking:_

Now I need to add state for showing snippets per key row, test connection functionality, and update the reveal modal and key rows. Let me continue editing.

Now I need to add state for per-row snippet visibility and test connection, then update the reveal modal and key rows.


**Tool: edit**

**Input:**
```json
{
  "oldString": "// API key request state\n  const [keyRequests, setKeyRequests] = useState([]);\n  const [keyForm, setKeyForm] = useState({\n    label: \"\",\n    rateLimit: 100,\n    scopes: [\"branches:read\", \"tickets:read\", \"tickets:write\"],\n  });\n  const [keyFormError, setKeyFormError] = useState(null);\n  const [keySubmitting, setKeySubmitting] = useState(false);\n  const [adminRevealKey, setAdminRevealKey] = useState(null); // one-time raw key display",
  "newString": "// API key request state\n  const [keyRequests, setKeyRequests] = useState([]);\n  const [keyForm, setKeyForm] = useState({\n    label: \"\",\n    rateLimit: 100,\n    scopes: [\"branches:read\", \"tickets:read\", \"tickets:write\"],\n  });\n  const [keyFormError, setKeyFormError] = useState(null);\n  const [keySubmitting, setKeySubmitting] = useState(false);\n  const [adminRevealKey, setAdminRevealKey] = useState(null); // one-time raw key display\n  const [snippetOpenId, setSnippetOpenId] = useState(null); // which key row shows snippets\n  const [testConnectionResult, setTestConnectionResult] = useState(null); // test result in modal\n  const [testLoading, setTestLoading] = useState(false);",
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 28.7s)

_Thinking:_

Now I need to add the test connection handler and update the reveal modal and key rows. Let me add the test connection function after the reveal handler, then update the modal and key rows.

**Tool: edit**

**Input:**
```json
{
  "newString": "const handleRevealKey = async (id) => {\n    try {\n      const res = await revealApiKeyRequest(id, auth.token);\n      if (res.data?.key) {\n        setAdminRevealKey({ id, key: res.data.key });\n        setTestConnectionResult(null);\n      } else {\n        setKeyFormError(\"Key already revealed previously.\");\n      }\n      await loadKeyRequests();\n    } catch (err) {\n      setKeyFormError(err.message || \"Couldn't reveal key.\");\n    }\n  };\n\n  const handleTestConnection = async (key) => {\n    setTestLoading(true);\n    setTestConnectionResult(null);\n    try {\n      const base = import.meta.env.VITE_API_URL || \"http://localhost:3000/api\";\n      const res = await fetch(`${base.replace(\"/api\", \"\")}/api/test-connection`, {\n        headers: { \"X-API-Key\": key },\n      });\n      const data = await res.json();\n      setTestConnectionResult({ ok: res.ok, data });\n    } catch (err) {\n      setTestConnectionResult({ ok: false, error: err.message });\n    } finally {\n      setTestLoading(false);\n    }\n  };\n\n  const toggleSnippets = (id) => {\n    setSnippetOpenId((prev) => (prev === id ? null : id));\n  };",
  "oldString": "const handleRevealKey = async (id) => {\n    try {\n      const res = await revealApiKeyRequest(id, auth.token);\n      if (res.data?.key) {\n        setAdminRevealKey({ id, key: res.data.key });\n      } else {\n        setKeyFormError(\"Key already revealed previously.\");\n      }\n      await loadKeyRequests();\n    } catch (err) {\n      setKeyFormError(err.message || \"Couldn't reveal key.\");\n    }\n  };",
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 45.6s)

_Thinking:_

Now I need to update the reveal modal to show snippets and test connection, and update the key rows to show "Use this key" button with expandable snippets. Let me find and update the modal first.

Now let me update the reveal modal to include snippets and test connection:


**Tool: edit**

**Input:**
```json
{
  "oldString": "{/* One-time raw key reveal modal */}\n      {adminRevealKey && (\n        <div className={styles.keyModalBackdrop}>\n          <div className={styles.keyModal}>\n            <h4>Your API key</h4>\n            <div className={styles.rawKeyBox}>\n              <code>{adminRevealKey.key}</code>\n              <button\n                type=\"button\"\n                className={styles.scopeChip}\n                onClick={() => navigator.clipboard?.writeText(adminRevealKey.key)}\n              >\n                Copy\n              </button>\n            </div>\n            <p className={styles.mgmtStatusError} style={{ background: \"none\", padding: 0 }}>\n              This is the only time this key will be shown. Store it securely.\n            </p>\n            <button\n              type=\"button\"\n              className={styles.mgmtSubmitBtn}\n              onClick={() => setAdminRevealKey(null)}\n            >\n              I've saved it\n            </button>\n          </div>\n        </div>\n      )}",
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx",
  "newString": "{/* One-time raw key reveal modal */}\n      {adminRevealKey && (\n        <div className={styles.keyModalBackdrop}>\n          <div className={styles.keyModal}>\n            <h4>Your API key</h4>\n            <div className={styles.rawKeyBox}>\n              <code>{adminRevealKey.key}</code>\n              <button\n                type=\"button\"\n                className={styles.scopeChip}\n                onClick={() => navigator.clipboard?.writeText(adminRevealKey.key)}\n              >\n                Copy\n              </button>\n            </div>\n            <p className={styles.mgmtStatusError} style={{ background: \"none\", padding: 0 }}>\n              This is the only time this key will be shown. Store it securely.\n            </p>\n\n            {/* Integration snippets with the revealed key */}\n            <div className={styles.snippetSection}>\n              <h5>Quick-start snippets</h5>\n              <p className={styles.snippetNote}>\n                Base URL: <code>{import.meta.env.VITE_API_URL || \"http://localhost:3000/api\"}</code>\n              </p>\n              {buildSnippets(adminRevealKey.key, import.meta.env.VITE_API_URL || \"http://localhost:3000/api\").map((s, i) => (\n                <div key={i} className={styles.snippetCard}>\n                  <div className={styles.snippetHeader}>\n                    <span>{s.label}</span>\n                    <button\n                      type=\"button\"\n                      className={styles.snippetCopyBtn}\n                      onClick={() => navigator.clipboard?.writeText(s.code)}\n                    >\n                      Copy\n                    </button>\n                  </div>\n                  <pre className={styles.snippetCode}><code>{s.code}</code></pre>\n                </div>\n              ))}\n\n              {/* Test connection with the revealed key */}\n              <div className={styles.testConnectionBox}>\n                <button\n                  type=\"button\"\n                  className={styles.testConnectionBtn}\n                  onClick={() => handleTestConnection(adminRevealKey.key)}\n                  disabled={testLoading}\n                >\n                  {testLoading ? \"Testing…\" : \"Test this key\"}\n                </button>\n                {testConnectionResult && (\n                  <div className={testConnectionResult.ok ? styles.testSuccess : styles.testError}>\n                    {testConnectionResult.ok ? (\n                      <>\n                        <strong>✓ Key works</strong> — Bank: {testConnectionResult.data.data?.bankName}{\" \"}\n                        | Scopes: {testConnectionResult.data.data?.scopes?.join(\", \")} | Last used:{\" \"}\n                        {testConnectionResult.data.data?.lastUsedAt\n                          ? new Date(testConnectionResult.data.data.lastUsedAt).toLocaleString()\n                          : \"never\"}\n                      </>\n                    ) : (\n                      <>\n                        <strong>✗ Test failed</strong> —{\" \"}\n                        {testConnectionResult.error || testConnectionResult.data?.message}\n                      </>\n                    )}\n                  </div>\n                )}\n              </div>\n\n            </div>\n\n            <button\n              type=\"button\"\n              className={styles.mgmtSubmitBtn}\n              onClick={() => setAdminRevealKey(null)}\n            >\n              I've saved it\n            </button>\n          </div>\n        </div>\n      )}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 9.0s)

_Thinking:_

Now I need to update the key rows to add a "Use this key" button that expands to show snippets (with placeholder key) for approved keys with active/suspended status.

Now update the key rows to add "Use this key" expandable snippets:


**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx",
  "offset": 380,
  "limit": 100
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx</path>
<type>file</type>
<content>
380:               <code>{adminRevealKey.key}</code>
381:               <button
382:                 type="button"
383:                 className={styles.scopeChip}
384:                 onClick={() => navigator.clipboard?.writeText(adminRevealKey.key)}
385:               >
386:                 Copy
387:               </button>
388:             </div>
389:             <p className={styles.mgmtStatusError} style={{ background: "none", padding: 0 }}>
390:               This is the only time this key will be shown. Store it securely.
391:             </p>
392: 
393:             {/* Integration snippets with the revealed key */}
394:             <div className={styles.snippetSection}>
395:               <h5>Quick-start snippets</h5>
396:               <p className={styles.snippetNote}>
397:                 Base URL: <code>{import.meta.env.VITE_API_URL || "http://localhost:3000/api"}</code>
398:               </p>
399:               {buildSnippets(adminRevealKey.key, import.meta.env.VITE_API_URL || "http://localhost:3000/api").map((s, i) => (
400:                 <div key={i} className={styles.snippetCard}>
401:                   <div className={styles.snippetHeader}>
402:                     <span>{s.label}</span>
403:                     <button
404:                       type="button"
405:                       className={styles.snippetCopyBtn}
406:                       onClick={() => navigator.clipboard?.writeText(s.code)}
407:                     >
408:                       Copy
409:                     </button>
410:                   </div>
411:                   <pre className={styles.snippetCode}><code>{s.code}</code></pre>
412:                 </div>
413:               ))}
414: 
415:               {/* Test connection with the revealed key */}
416:               <div className={styles.testConnectionBox}>
417:                 <button
418:                   type="button"
419:                   className={styles.testConnectionBtn}
420:                   onClick={() => handleTestConnection(adminRevealKey.key)}
421:                   disabled={testLoading}
422:                 >
423:                   {testLoading ? "Testing…" : "Test this key"}
424:                 </button>
425:                 {testConnectionResult && (
426:                   <div className={testConnectionResult.ok ? styles.testSuccess : styles.testError}>
427:                     {testConnectionResult.ok ? (
428:                       <>
429:                         <strong>✓ Key works</strong> — Bank: {testConnectionResult.data.data?.bankName}{" "}
430:                         | Scopes: {testConnectionResult.data.data?.scopes?.join(", ")} | Last used:{" "}
431:                         {testConnectionResult.data.data?.lastUsedAt
432:                           ? new Date(testConnectionResult.data.data.lastUsedAt).toLocaleString()
433:                           : "never"}
434:                       </>
435:                     ) : (
436:                       <>
437:                         <strong>✗ Test failed</strong> —{" "}
438:                         {testConnectionResult.error || testConnectionResult.data?.message}
439:                       </>
440:                     )}
441:                   </div>
442:                 )}
443:               </div>
444: 
445:             </div>
446: 
447:             <button
448:               type="button"
449:               className={styles.mgmtSubmitBtn}
450:               onClick={() => setAdminRevealKey(null)}
451:             >
452:               I've saved it
453:             </button>
454:           </div>
455:         </div>
456:       )}
457: 
458:       <div className={styles.mgmtSubHeading}>Request status</div>
459:       {keyRequests.length === 0 && (
460:         <p className={styles.mgmtStatus}>No API key requests yet.</p>
461:       )}
462:       {keyRequests.map((r) => (
463:         <div key={r.id} className={styles.mgmtRow}>
464:           <div>
465:             <div className={styles.mgmtRowTitle}>
466:               {r.label || "API key request"}
467:             </div>
468:             <div className={styles.mgmtRowSub}>
469:               scopes: {r.scopes?.join(", ")} · {r.rateLimit}/min ·{" "}
470:               {new Date(r.createdAt).toLocaleString()}
471:               {r.keyPrefix ? ` · ends in ${r.keyPrefix}` : ""}
472:               {r.reviewNote ? ` · note: ${r.reviewNote}` : ""}
473:             </div>
474:           </div>
475:           <div className={styles.mgmtRowActions}>
476:             <span
477:               className={
478:                 r.status === "approved"
479:                   ? styles.mgmtBadgeOpen

(Showing lines 380-479 of 523. Use offset=480 to continue.)
</content>
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 31.3s)

_Thinking:_

Let me see the rest of the key rows rendering to update it with the "Use this key" snippets feature

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx",
  "limit": 100,
  "offset": 475
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx</path>
<type>file</type>
<content>
475:           <div className={styles.mgmtRowActions}>
476:             <span
477:               className={
478:                 r.status === "approved"
479:                   ? styles.mgmtBadgeOpen
480:                   : r.status === "rejected"
481:                     ? styles.mgmtBadgeClosed
482:                     : styles.mgmtBadgePending
483:               }
484:             >
485:               {r.status}
486:             </span>
487:             {r.status === "approved" && r.keyStatus && (
488:               <span
489:                 className={
490:                   r.keyStatus === "active"
491:                     ? styles.mgmtBadgeOpen
492:                     : r.keyStatus === "suspended"
493:                       ? styles.mgmtBadgePending
494:                       : styles.mgmtBadgeClosed
495:                 }
496:                 title={
497:                   r.keyStatus === "revoked"
498:                     ? "Key revoked by platform — integration calls will be rejected"
499:                     : r.keyStatus === "suspended"
500:                       ? "Key temporarily disabled by platform"
501:                       : "Key is active for X-API-Key integration calls"
502:                 }
503:               >
504:                 {r.keyStatus}
505:               </span>
506:             )}
507:             {r.canRevealKey && (
508:               <button
509:                 type="button"
510:                 className={styles.mgmtSubmitBtn}
511:                 onClick={() => handleRevealKey(r.id)}
512:               >
513:                 Reveal key
514:               </button>
515:             )}
516:           </div>
517:         </div>
518:       ))}
519:     </motion.div>
520:   );
521: };
522: 
523: export default AdminOverview;

(End of file - total 523 lines)
</content>
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 41.1s)

_Thinking:_

Now I'll update the key rows to add a "Use this key" button that expands snippets for approved keys with active/suspended status. I'll insert it after the keyStatus badge.

**Tool: edit**

**Input:**
```json
{
  "newString": "{r.status === \"approved\" && r.keyStatus && (\n              <span\n                className={\n                  r.keyStatus === \"active\"\n                    ? styles.mgmtBadgeOpen\n                    : r.keyStatus === \"suspended\"\n                      ? styles.mgmtBadgePending\n                      : styles.mgmtBadgeClosed\n                }\n                title={\n                  r.keyStatus === \"revoked\"\n                    ? \"Key revoked by platform — integration calls will be rejected\"\n                    : r.keyStatus === \"suspended\"\n                      ? \"Key temporarily disabled by platform\"\n                      : \"Key is active for X-API-Key integration calls\"\n                }\n              >\n                {r.keyStatus}\n              </span>\n            )}\n            {r.status === \"approved\" &&\n            (r.keyStatus === \"active\" || r.keyStatus === \"suspended\") && (\n              <button\n                type=\"button\"\n                className={styles.mgmtLinkBtn}\n                onClick={() => toggleSnippets(r.id)}\n              >\n                {snippetOpenId === r.id ? \"Hide snippets\" : \"Use this key\"}\n              </button>\n            )}\n            {r.canRevealKey && (\n              <button\n                type=\"button\"\n                className={styles.mgmtSubmitBtn}\n                onClick={() => handleRevealKey(r.id)}\n              >\n                Reveal key\n              </button>\n            )}\n          </div>\n        </div>\n\n        {/* Expandable snippets panel per key row */}\n        {snippetOpenId === r.id && r.status === \"approved\" && (\n          <div className={styles.snippetRowPanel}>\n            <p className={styles.snippetNote}>\n              Key prefix: <code>{r.keyPrefix || \"…\"}</code> — replace with your full key.\n              Base URL: <code>{import.meta.env.VITE_API_URL || \"http://localhost:3000/api\"}</code>\n            </p>\n            {buildSnippets(`cue_${r.keyPrefix || \"XXXXXX...\"}XXXXXXXXXXXXXXXXXXXX`, import.meta.env.VITE_API_URL || \"http://localhost:3000/api\").map((s, i) => (\n              <div key={i} className={styles.snippetCard}>\n                <div className={styles.snippetHeader}>\n                  <span>{s.label}</span>\n                  <button\n                    type=\"button\"\n                    className={styles.snippetCopyBtn}\n                    onClick={() => navigator.clipboard?.writeText(s.code)}\n                  >\n                    Copy\n                  </button>\n                </div>\n                <pre className={styles.snippetCode}><code>{s.code}</code></pre>\n              </div>\n            ))}\n          </div>\n        )}\n      ))}",
  "oldString": "{r.status === \"approved\" && r.keyStatus && (\n              <span\n                className={\n                  r.keyStatus === \"active\"\n                    ? styles.mgmtBadgeOpen\n                    : r.keyStatus === \"suspended\"\n                      ? styles.mgmtBadgePending\n                      : styles.mgmtBadgeClosed\n                }\n                title={\n                  r.keyStatus === \"revoked\"\n                    ? \"Key revoked by platform — integration calls will be rejected\"\n                    : r.keyStatus === \"suspended\"\n                      ? \"Key temporarily disabled by platform\"\n                      : \"Key is active for X-API-Key integration calls\"\n                }\n              >\n                {r.keyStatus}\n              </span>\n            )}\n            {r.canRevealKey && (\n              <button\n                type=\"button\"\n                className={styles.mgmtSubmitBtn}\n                onClick={() => handleRevealKey(r.id)}\n              >\n                Reveal key\n              </button>\n            )}\n          </div>\n        </div>\n      ))}",
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 11.2s)

_Thinking:_

Now I need to add the CSS styles for the new snippet and test connection components. Let me read the CSS file and add the new styles.

Now let me add the CSS styles for snippets and test connection:


**Tool: read**

**Input:**
```json
{
  "limit": 100,
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css",
  "offset": 860
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css</path>
<type>file</type>
<content>
860: .ovStaffCount {
861:   font-family: var(--font-mono);
862:   font-size: 0.85rem;
863:   color: var(--brand-primary);
864:   font-weight: 600;
865: }
866: 
867: /* ── API key request: scope chips + one-time reveal modal ── */
868: .scopeChips {
869:   display: flex;
870:   flex-wrap: wrap;
871:   gap: 0.4rem;
872:   width: 100%;
873: }
874: 
875: .scopeChip,
876: .scopeChipActive {
877:   font-family: var(--font-mono);
878:   font-size: 0.7rem;
879:   letter-spacing: 0.03em;
880:   padding: 0.35rem 0.65rem;
881:   border-radius: 100px;
882:   border: 1px solid var(--paper-soft);
883:   background: var(--paper);
884:   color: var(--paper-soft);
885:   cursor: pointer;
886:   transition:
887:     background 0.15s ease,
888:     color 0.15s ease,
889:     border-color 0.15s ease;
890: }
891: .scopeChipActive {
892:   background: var(--brand-primary);
893:   border-color: var(--brand-primary);
894:   color: var(--ink);
895:   font-weight: 600;
896: }
897: 
898: .keyModalBackdrop {
899:   position: fixed;
900:   inset: 0;
901:   background: rgba(15, 20, 25, 0.65);
902:   display: flex;
903:   align-items: center;
904:   justify-content: center;
905:   z-index: 1000;
906:   padding: 1.5rem;
907: }
908: 
909: .keyModal {
910:   background: var(--paper-raised);
911:   border-radius: 16px;
912:   padding: 1.75rem;
913:   max-width: 560px;
914:   width: 100%;
915:   display: flex;
916:   flex-direction: column;
917:   gap: 0.85rem;
918: }
919: 
920: .keyModal h4 {
921:   font-size: var(--step-1);
922:   color: var(--ink);
923:   margin: 0;
924: }
925: 
926: .rawKeyBox {
927:   display: flex;
928:   gap: 0.6rem;
929:   align-items: center;
930:   background: var(--paper);
931:   border: 1px dashed var(--paper-soft);
932:   border-radius: 10px;
933:   padding: 0.85rem;
934: }
935: 
936: .rawKeyBox code {
937:   flex: 1;
938:   font-family: var(--font-mono);
939:   font-size: 0.75rem;
940:   word-break: break-all;
941:   color: var(--ink);
942: }

(End of file - total 942 lines)
</content>
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 56.2s)

_Thinking:_

Now I need to add the CSS for the new snippet styles. I'll add them at the end of the file.

**Tool: edit**

**Input:**
```json
{
  "newString": ".rawKeyBox code {\n  flex: 1;\n  font-family: var(--font-mono);\n  font-size: 0.75rem;\n  word-break: break-all;\n  color: var(--ink);\n}\n\n/* ── Integration snippets & test connection ── */\n.snippetSection {\n  border-top: 1px solid var(--paper);\n  padding-top: 1rem;\n  margin-top: 0.5rem;\n}\n\n.snippetSection h5 {\n  font-size: 0.85rem;\n  color: var(--ink);\n  margin: 0 0 0.5rem;\n}\n\n.snippetNote {\n  font-size: 0.75rem;\n  color: var(--paper-soft);\n  margin: 0 0 0.75rem;\n}\n.snippetNote code {\n  font-family: var(--font-mono);\n  background: var(--paper);\n  padding: 0.15rem 0.35rem;\n  border-radius: 4px;\n}\n\n.snippetCard {\n  background: var(--paper);\n  border: 1px solid var(--paper-soft);\n  border-radius: 8px;\n  padding: 0.75rem;\n  margin-bottom: 0.5rem;\n}\n\n.snippetHeader {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 0.5rem;\n  font-size: 0.7rem;\n  font-weight: 600;\n  color: var(--paper-soft);\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n}\n\n.snippetCopyBtn {\n  font-family: var(--font-mono);\n  font-size: 0.65rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 6px;\n  border: 1px solid var(--paper-soft);\n  background: var(--paper);\n  color: var(--paper-soft);\n  cursor: pointer;\n  transition: border-color 0.15s, color 0.15s;\n}\n.snippetCopyBtn:hover {\n  border-color: var(--brand-primary);\n  color: var(--brand-primary);\n}\n\n.snippetCode {\n  margin: 0;\n  font-family: var(--font-mono);\n  font-size: 0.68rem;\n  line-height: 1.5;\n  background: var(--ink);\n  color: var(--paper);\n  padding: 0.6rem;\n  border-radius: 6px;\n  overflow-x: auto;\n  white-space: pre-wrap;\n  word-break: break-all;\n}\n\n.testConnectionBox {\n  margin-top: 0.75rem;\n  padding-top: 0.75rem;\n  border-top: 1px solid var(--paper);\n}\n\n.testConnectionBtn {\n  font-family: var(--font-body);\n  font-size: 0.8rem;\n  font-weight: 600;\n  padding: 0.5rem 1rem;\n  border-radius: 8px;\n  border: 1px solid var(--brand-accent);\n  background: transparent;\n  color: var(--brand-accent);\n  cursor: pointer;\n  transition: background 0.15s, color 0.15s;\n}\n.testConnectionBtn:hover:not(:disabled) {\n  background: var(--brand-accent);\n  color: var(--ink);\n}\n.testConnectionBtn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n\n.testSuccess,\n.testError {\n  margin-top: 0.5rem;\n  padding: 0.5rem 0.75rem;\n  border-radius: 6px;\n  font-size: 0.8rem;\n}\n.testSuccess {\n  background: rgba(13, 124, 102, 0.15);\n  color: var(--brand-primary);\n}\n.testError {\n  background: rgba(220, 38, 38, 0.15);\n  color: var(--brand-alert);\n}\n\n.snippetRowPanel {\n  margin: 0.75rem 0 0;\n  padding: 1rem;\n  background: var(--paper);\n  border: 1px solid var(--paper-soft);\n  border-radius: 10px;\n  animation: slideDown 0.2s ease;\n}\n\n@keyframes slideDown {\n  from {\n    opacity: 0;\n    transform: translateY(-6px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}",
  "oldString": ".rawKeyBox code {\n  flex: 1;\n  font-family: var(--font-mono);\n  font-size: 0.75rem;\n  word-break: break-all;\n  color: var(--ink);\n}",
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 6.5s)

_Thinking:_

Now I need to create the IntegrationGuide page and mount it in App.jsx. Let me update the todo and create the IntegrationGuide component.

Now let me create the IntegrationGuide page component:


**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Create backend test-connection route (standalone, authenticateApiKey only)",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "Mount test-connection route in app.js",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "Add integration snippets to AdminOverview reveal modal + key rows",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "Add integration snippets CSS styles",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "Create IntegrationGuide new page component",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "Mount IntegrationGuide in App.jsx under ProtectedRoute for admin",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Run tests + build verify",
      "status": "pending",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Create backend test-connection route (standalone, authenticateApiKey only)",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Mount test-connection route in app.js",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Add integration snippets to AdminOverview reveal modal + key rows",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Add integration snippets CSS styles",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Create IntegrationGuide new page component",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Mount IntegrationGuide in App.jsx under ProtectedRoute for admin",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Run tests + build verify",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 472.5s)

_Thinking:_

Now let me create the IntegrationGuide component.

_Thinking:_

Now let me create the IntegrationGuide page component. I'll create a new file at `frontend/src/pages/StaffHome/IntegrationGuide.jsx`.

_Thinking:_

Now I'll create the IntegrationGuide page component. It will be a comprehensive guide for bank admins integrating Cue into their systems.

**Tool: write**

**Input:**
```json
{
  "content": "import { useState } from \"react\";\nimport { motion } from \"framer-motion\";\nimport { useAuth } from \"../../features/auth/AuthContext\";\nimport styles from \"./StaffHome.module.css\";\n\nconst BASE_URL = import.meta.env.VITE_API_URL || \"http://localhost:3000/api\";\n\nconst GUIDE_SECTIONS = [\n  {\n    id: \"auth\",\n    title: \"Authentication\",\n    content: `\n### API Key Header\n\nAll v1 integration endpoints require an API key passed in the \\`X-API-Key\\` header:\n\n\\`\\`\\`\nX-API-Key: cue_abcdef1234567890...\n\\`\\`\\`\n\nThe key format is \\`cue_\\` followed by 48 hex characters.\n\n### Two Auth Paths\n\n| Path | Auth Method | Use Case |\n|------|-------------|----------|\n| \\`/api/v1/*\\` | API Key (\\`X-API-Key\\`) | Bank systems, external integrations |\n| \\`/api/admin/*\\` | JWT Bearer token | Bank admin dashboard (this UI) |\n| \\`/api/platform/*\\` | JWT Bearer token | Superadmin platform console |\n\n> **Key point:** The Cue dashboard uses your JWT login. The API key is for your **bank's own systems** (core banking, mobile app backend, etc.) to call Cue programmatically.\n    `,\n  },\n  {\n    id: \"scopes\",\n    title: \"Scopes & Permissions\",\n    content: `\nEach API key carries a set of scopes that gate which endpoints it can call. Requestable scopes (bank admin can request):\n\n| Scope | Grants Access To |\n|-------|------------------|\n| \\`branches:read\\` | Branch info, queues, counters, public boards |\n| \\`tickets:read\\` | Ticket status, position, ETA |\n| \\`tickets:write\\` | Create/cancel tickets (kiosk, appointments) |\n| \\`staff:read\\` | Staff list for this bank |\n| \\`analytics:read\\` | Analytics, reports, daily summaries |\n| \\`webhooks:manage\\` | Create/delete/toggle webhooks |\n| \\`admin\\` | **Superadmin only** — full access, cannot be requested by bank admins |\n\nEndpoints enforce scopes via the \\`requireScope\\` middleware. The \\`admin\\` scope bypasses all checks.\n    `,\n  },\n  {\n    id: \"rate-limits\",\n    title: \"Rate Limits\",\n    content: `\n### Per-Key Sliding Window (1 minute)\n\nEach API key has a \\`rateLimit\\` (default 100 req/min, configurable up to 10,000). Limits are tracked **per key**, not per IP — so multiple servers sharing the same key share the same bucket.\n\n### Response Headers\n\nOn every v1 response you receive:\n\n| Header | Meaning |\n|--------|---------|\n| \\`X-RateLimit-Limit\\` | Max requests allowed this window |\n| \\`X-RateLimit-Remaining\\` | Requests left in current window |\n| \\`X-RateLimit-Reset\\` | Unix timestamp when window resets |\n\n### Exceeded → 429\n\n\\`\\`\\`json\n{\n  \"statusCode\": 429,\n  \"message\": \"Rate limit exceeded. Max 100 requests per minute. Try again in 45s.\"\n}\n\\`\\`\\`\n\nThe \\`Retry-After\\` header also indicates seconds until the next window.\n    `,\n  },\n  {\n    id: \"bank-scoping\",\n    title: \"Bank Scoping (Multi-Tenancy)\",\n    content: `\nEvery API key belongs to exactly one bank (\\`bankName\\`). All \\`/api/v1/*\\` calls are automatically filtered to that bank's data:\n\n- \\`GET /api/v1/branches\\` → only branches where \\`branch.bank === key.bankName\\`\n- \\`GET /api/v1/queues\\` → only queues in those branches\n- \\`POST /api/v1/tickets\\` → ticket created in the key's bank\n\nIf a bank admin JWT is present **and** an API key is provided (e.g., admin testing), the \\`tenantMatch\\` middleware enforces \\`admin.bank === key.bankName\\` — 403 if they differ.\n    `,\n  },\n  {\n    id: \"key-lifecycle\",\n    title: \"Key Lifecycle\",\n    content: `\n### Request → Approve → Reveal → Use\n\n1. **Request** — Bank admin submits request via \\`POST /api/admin/api-key-requests\\` (JWT auth)\n2. **Approve** — Superadmin reviews in \\`/platform\\` console → approves → key created\n3. **Reveal** — Bank admin clicks **Reveal key** once → raw key shown in modal → staged ciphertext wiped\n4. **Use** — Configure \\`X-API-Key: cue_...\\` in your systems; key works forever (only hash stored)\n\n### States\n\n| State | Meaning |\n|-------|---------|\n| \\`pending\\` | Awaiting superadmin review |\n| \\`approved\\` | Key created, ready for reveal |\n| \\`rejected\\` | Superadmin declined (with note) |\n\n### Key Health (visible to bank admin)\n\n| Status | Meaning |\n|--------|---------|\n| \\`active\\` | Key works for integration calls |\n| \\`suspended\\` | Superadmin disabled it → 403 \"API key has been disabled\" |\n| \\`revoked\\` | Superadmin deleted it → 401 \"Invalid or revoked API key\" |\n| \\`null\\` | Not yet approved |\n\n> **One-time reveal only.** After reveal, Cue only stores the bcrypt hash — the raw key is **gone forever**. Copy it at reveal time.\n    `,\n  },\n  {\n    id: \"errors\",\n    title: \"Error Cheat Sheet\",\n    content: `\n| Code | Message | Cause | Fix |\n|------|---------|-------|-----|\n| 401 | \"API key required. Pass it via the X-API-Key header.\" | Missing header | Add \\`X-API-Key\\` |\n| 401 | \"Invalid or revoked API key\" | Key deleted or wrong | Check key; request new if revoked |\n| 401 | \"API key has expired\" | \\`expiresAt\\` passed | Request new key |\n| 401 | \"API key has expired due to rotation. Use the new key.\" | Rotated, grace period over | Use new key from superadmin |\n| 403 | \"API key has been disabled. Contact support.\" | \\`isActive = false\\` | Superadmin must re-enable |\n| 403 | \"Missing required scope(s): X, Y. Your key has: Z\" | Scope not granted | Superadmin adds scope or re-approves with more |\n| 403 | \"Admin bank does not match API key bank\" | Tenant mismatch | Ensure key belongs to your bank |\n| 429 | \"Rate limit exceeded...\" | Too many req/min | Back off; respect \\`Retry-After\\` |\n    `,\n  },\n  {\n    id: \"workflow\",\n    title: \"Sample Integration Workflow\",\n    content: `\n### 3 Steps to Production\n\n\\`\\`\\`mermaid\nsequenceDiagram\n  participant Admin as Bank Admin\n  participant Cue as Cue API\n  participant Systems as Your Systems\n  Admin->>Cue: POST /api/admin/api-key-requests (label, scopes)\n  Cue-->>Superadmin: Review request\n  Superadmin->>Cue: Approve → key created\n  Cue-->>Admin: Approved, \"Reveal key\" available\n  Admin->>Cue: GET /api/admin/api-key-requests/:id (reveal)\n  Cue-->>Admin: Raw key (cue_...) — **copy once**\n  Admin->>Systems: Configure X-API-Key header\n  Systems->>Cue: GET /api/v1/branches (X-API-Key)\n  Cue-->>Systems: Your bank's branches\n\\`\\`\\`\n\n### Minimal Working Example\n\n\\`\\`\\`bash\n# 1. Request key (via dashboard or API)\n# 2. After approval, reveal & copy key\n# 3. Test\ncurl -s -X GET \"https://api.your-cue-instance.com/api/v1/branches\" \\\\\n  -H \"X-API-Key: cue_yourkeyhere\"\n\n# Expected: 200 + your bank's branches array\n\\`\\`\\`\n    `,\n  },\n  {\n    id: \"openapi\",\n    title: \"OpenAPI / Swagger\",\n    content: `\n### Interactive Docs\n\n- **Swagger UI:** \\`GET /api/docs\\` — browse & try endpoints in browser\n- **Raw OpenAPI JSON:** \\`GET /api/docs/openapi.json\\` — feed to codegen tools (OpenAPI Generator, swagger-codegen, etc.)\n\n\\`\\`\\`bash\n# Generate a TypeScript client\nnpx @openapitools/openapi-generator-cli generate \\\n  -i https://your-cue-instance.com/api/docs/openapi.json \\\n  -g typescript-axios \\\n  -o ./cue-client\n\\`\\`\\`\n    `,\n  },\n  {\n    id: \"testing\",\n    title: \"Testing with Postman / Hoppscotch\",\n    content: `\n1. **Create a collection** with base URL: \\`https://your-cue-instance.com/api\\`\n2. **Add a global header:** \\`X-API-Key: cue_yourkeyhere\\`\n3. **Test endpoints:**\n   - \\`GET /v1/branches\\` — verify bank scoping\n   - \\`GET /v1/queues?branchId=...\\` — list queues\n   - \\`POST /v1/tickets\\` — create a ticket (needs \\`tickets:write\\`)\n   - \\`GET /v1/tickets/:id\\` — check status\n\n> Tip: Use environment variables for the key so you can swap dev/staging/prod keys easily.\n    `,\n  },\n];\n\n/**\n * IntegrationGuide — full integration documentation for bank admins.\n * Mounted at /integration under ProtectedRoute for admin role.\n */\nconst IntegrationGuide = () => {\n  const { auth } = useAuth();\n  const [openSection, setOpenSection] = useState(\"auth\");\n\n  if (loading) return <p className={styles.mgmtStatus}>Loading…</p>;\n  if (error) return <p className={styles.mgmtStatusError}>{error}</p>;\n\n  return (\n    <motion.div\n      initial={{ opacity: 0, y: 12 }}\n      animate={{ opacity: 1, y: 0 }}\n      transition={{ duration: 0.4 }}\n      className={styles.integrationGuide}\n    >\n      <header className={styles.guideHeader}>\n        <h1>Integration Guide</h1>\n        <p className={styles.guideSubtitle}>\n          Everything you need to integrate Cue into your bank's systems.\n        </p>\n        <div className={styles.guideMeta}>\n          <span>Base URL: <code>{BASE_URL}</code></span>\n          <span>Version: v1</span>\n        </div>\n      </header>\n\n      <nav className={styles.guideSidebar} aria-label=\"Guide sections\">\n        <ul>\n          {GUIDE_SECTIONS.map((s) => (\n            <li key={s.id}>\n              <button\n                className={openSection === s.id ? styles.guideLinkActive : styles.guideLink}\n                onClick={() => setOpenSection(s.id)}\n              >\n                {s.title}\n              </button>\n            </li>\n          ))}\n        </ul>\n        <div className={styles.guideSidebarFooter}>\n          <a\n            href={`${BASE_URL.replace(\"/api\", \"\")}/api/docs`}\n            target=\"_blank\"\n            rel=\"noopener noreferrer\"\n            className={styles.guideExternalLink}\n          >\n            ↗ Open Swagger UI\n          </a>\n        </div>\n      </nav>\n\n      <main className={styles.guideContent}>\n        {GUIDE_SECTIONS.map((s) =>\n          openSection === s.id && (\n            <article key={s.id} className={styles.guideSection}>\n              <h2>{s.title}</h2>\n              <div className={styles.guideMarkdown}>\n                {renderMarkdown(s.content)}\n              </div>\n            </article>\n          )\n        )}\n      </main>\n    </motion.div>\n  );\n};\n\nfunction renderMarkdown(md) {\n  // Minimal markdown → React: headings, code blocks, tables, lists, bold\n  const lines = md.trim().split(\"\\n\");\n  const elements = [];\n  let i = 0;\n\n  while (i < lines.length) {\n    const line = lines[i];\n\n    // Headings\n    if (line.startsWith(\"### \")) {\n      elements.push(<h3 key={i}>{line.slice(4)}</h3>);\n      i++;\n      continue;\n    }\n    if (line.startsWith(\"## \")) {\n      elements.push(<h2 key={i}>{line.slice(3)}</h2>);\n      i++;\n      continue;\n    }\n\n    // Fenced code blocks\n    if (line.startsWith(\"```\")) {\n      const lang = line.slice(3).trim();\n      const codeLines = [];\n      i++;\n      while (i < lines.length && !lines[i].startsWith(\"```\")) {\n        codeLines.push(lines[i]);\n        i++;\n      }\n      i++; // skip closing ```\n      elements.push(\n        <pre key={i} className={styles.guideCodeBlock}>\n          <code className={lang ? `language-${lang}` : \"\"}>\n            {codeLines.join(\"\\n\")}\n          </code>\n        </pre>,\n      );\n      continue;\n    }\n\n    // Table\n    if (line.startsWith(\"|\") && lines[i + 1]?.startsWith(\"|\")) {\n      const tableLines = [];\n      while (i < lines.length && lines[i].startsWith(\"|\")) {\n        tableLines.push(lines[i]);\n        i++;\n      }\n      elements.push(<TableRenderer key={i} lines={tableLines} />);\n      continue;\n    }\n\n    // Bullet list\n    if (line.startsWith(\"- \")) {\n      const items = [];\n      while (i < lines.length && lines[i].startsWith(\"- \")) {\n        items.push(<li key={i}>{renderInline(lines[i].slice(2))}</li>);\n        i++;\n      }\n      elements.push(<ul key={i}>{items}</ul>);\n      continue;\n    }\n\n    // Paragraph\n    if (line.trim()) {\n      elements.push(<p key={i}>{renderInline(line)}</p>);\n    }\n    i++;\n  }\n\n  return elements;\n}\n\nfunction renderInline(text) {\n  // Handle **bold**, `inline code`\n  const parts = text.split(/(\\*\\*.*?\\*\\*|`.*?`)/g);\n  return parts.map((part, idx) => {\n    if (part.startsWith(\"**\") && part.endsWith(\"**\")) {\n      return <strong key={idx}>{part.slice(2, -2)}</strong>;\n    }\n    if (part.startsWith(\"`\") && part.endsWith(\"`\")) {\n      return <code key={idx} className={styles.guideInlineCode}>{part.slice(1, -1)}</code>;\n    }\n    return <span key={idx}>{part}</span>;\n  });\n}\n\nfunction TableRenderer({ lines }) {\n  const headers = lines[0].split(\"|\").slice(1, -1).map((h) => h.trim());\n  const rows = lines.slice(2).map((row, ri) => {\n    const cells = row.split(\"|\").slice(1, -1).map((c) => c.trim());\n    return (\n      <tr key={ri}>\n        {cells.map((cell, ci) => <td key={ci}>{renderInline(cell)}</td>)}\n      </tr>\n    );\n  });\n  return (\n    <div className={styles.guideTableWrapper}>\n      <table>\n        <thead>\n          <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>\n        </thead>\n        <tbody>{rows}</tbody>\n      </table>\n    </div>\n  );\n}\n\nexport default IntegrationGuide;",
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/IntegrationGuide.jsx"
}
```

**Output:**
```
Wrote file successfully.
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 12.8s)

_Thinking:_

Now I need to add the CSS styles for the IntegrationGuide page, and mount it in App.jsx under ProtectedRoute for admin. Let me first add the CSS styles.

Now add CSS for the IntegrationGuide page:


**Tool: read**

**Input:**
```json
{
  "offset": 960,
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css",
  "limit": 100
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css</path>
<type>file</type>
<content>
960:   margin: 0 0 0.75rem;
961: }
962: .snippetNote code {
963:   font-family: var(--font-mono);
964:   background: var(--paper);
965:   padding: 0.15rem 0.35rem;
966:   border-radius: 4px;
967: }
968: 
969: .snippetCard {
970:   background: var(--paper);
971:   border: 1px solid var(--paper-soft);
972:   border-radius: 8px;
973:   padding: 0.75rem;
974:   margin-bottom: 0.5rem;
975: }
976: 
977: .snippetHeader {
978:   display: flex;
979:   align-items: center;
980:   justify-content: space-between;
981:   margin-bottom: 0.5rem;
982:   font-size: 0.7rem;
983:   font-weight: 600;
984:   color: var(--paper-soft);
985:   text-transform: uppercase;
986:   letter-spacing: 0.05em;
987: }
988: 
989: .snippetCopyBtn {
990:   font-family: var(--font-mono);
991:   font-size: 0.65rem;
992:   padding: 0.25rem 0.5rem;
993:   border-radius: 6px;
994:   border: 1px solid var(--paper-soft);
995:   background: var(--paper);
996:   color: var(--paper-soft);
997:   cursor: pointer;
998:   transition: border-color 0.15s, color 0.15s;
999: }
1000: .snippetCopyBtn:hover {
1001:   border-color: var(--brand-primary);
1002:   color: var(--brand-primary);
1003: }
1004: 
1005: .snippetCode {
1006:   margin: 0;
1007:   font-family: var(--font-mono);
1008:   font-size: 0.68rem;
1009:   line-height: 1.5;
1010:   background: var(--ink);
1011:   color: var(--paper);
1012:   padding: 0.6rem;
1013:   border-radius: 6px;
1014:   overflow-x: auto;
1015:   white-space: pre-wrap;
1016:   word-break: break-all;
1017: }
1018: 
1019: .testConnectionBox {
1020:   margin-top: 0.75rem;
1021:   padding-top: 0.75rem;
1022:   border-top: 1px solid var(--paper);
1023: }
1024: 
1025: .testConnectionBtn {
1026:   font-family: var(--font-body);
1027:   font-size: 0.8rem;
1028:   font-weight: 600;
1029:   padding: 0.5rem 1rem;
1030:   border-radius: 8px;
1031:   border: 1px solid var(--brand-accent);
1032:   background: transparent;
1033:   color: var(--brand-accent);
1034:   cursor: pointer;
1035:   transition: background 0.15s, color 0.15s;
1036: }
1037: .testConnectionBtn:hover:not(:disabled) {
1038:   background: var(--brand-accent);
1039:   color: var(--ink);
1040: }
1041: .testConnectionBtn:disabled {
1042:   opacity: 0.6;
1043:   cursor: not-allowed;
1044: }
1045: 
1046: .testSuccess,
1047: .testError {
1048:   margin-top: 0.5rem;
1049:   padding: 0.5rem 0.75rem;
1050:   border-radius: 6px;
1051:   font-size: 0.8rem;
1052: }
1053: .testSuccess {
1054:   background: rgba(13, 124, 102, 0.15);
1055:   color: var(--brand-primary);
1056: }
1057: .testError {
1058:   background: rgba(220, 38, 38, 0.15);
1059:   color: var(--brand-alert);

(Showing lines 960-1059 of 1080. Use offset=1060 to continue.)
</content>
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 7.3s)

_Thinking:_

Let me see the rest of the file to find where to add the new styles.

**Tool: read**

**Input:**
```json
{
  "offset": 1055,
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css",
  "limit": 50
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css</path>
<type>file</type>
<content>
1055:   color: var(--brand-primary);
1056: }
1057: .testError {
1058:   background: rgba(220, 38, 38, 0.15);
1059:   color: var(--brand-alert);
1060: }
1061: 
1062: .snippetRowPanel {
1063:   margin: 0.75rem 0 0;
1064:   padding: 1rem;
1065:   background: var(--paper);
1066:   border: 1px solid var(--paper-soft);
1067:   border-radius: 10px;
1068:   animation: slideDown 0.2s ease;
1069: }
1070: 
1071: @keyframes slideDown {
1072:   from {
1073:     opacity: 0;
1074:     transform: translateY(-6px);
1075:   }
1076:   to {
1077:     opacity: 1;
1078:     transform: translateY(0);
1079:   }
1080: }

(End of file - total 1080 lines)
</content>
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 77.2s)

_Thinking:_

Now I'll add the IntegrationGuide CSS styles at the end of the file.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.module.css",
  "oldString": "@keyframes slideDown {\n  from {\n    opacity: 0;\n    transform: translateY(-6px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}",
  "newString": "@keyframes slideDown {\n  from {\n    opacity: 0;\n    transform: translateY(-6px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n\n/* ── Integration Guide page ── */\n.integrationGuide {\n  display: grid;\n  grid-template-columns: 260px 1fr;\n  gap: 2rem;\n  max-width: 1100px;\n  margin: 0 auto;\n}\n\n.guideHeader {\n  grid-column: 1 / -1;\n  margin-bottom: 1rem;\n}\n\n.guideHeader h1 {\n  font-size: var(--step-3);\n  color: var(--ink);\n  margin: 0 0 0.5rem;\n}\n\n.guideSubtitle {\n  color: var(--paper-soft);\n  margin: 0 0 0.75rem;\n}\n\n.guideMeta {\n  display: flex;\n  gap: 1.5rem;\n  font-size: 0.85rem;\n  color: var(--paper-soft);\n}\n.guideMeta code {\n  font-family: var(--font-mono);\n  background: var(--paper);\n  padding: 0.15rem 0.4rem;\n  border-radius: 4px;\n}\n\n.guideSidebar {\n  position: sticky;\n  top: 2rem;\n  max-height: calc(100vh - 4rem);\n  overflow-y: auto;\n  padding-right: 1rem;\n  border-right: 1px solid var(--paper);\n}\n\n.guideSidebar ul {\n  list-style: none;\n  padding: 0;\n  margin: 0;\n}\n\n.guideLink,\n.guideLinkActive {\n  display: block;\n  width: 100%;\n  text-align: left;\n  padding: 0.5rem 0.75rem;\n  border-radius: 8px;\n  font-size: 0.85rem;\n  color: var(--paper-soft);\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  transition: background 0.15s, color 0.15s;\n}\n.guideLink:hover {\n  background: var(--paper);\n  color: var(--ink);\n}\n.guideLinkActive {\n  background: var(--brand-primary);\n  color: var(--ink);\n  font-weight: 600;\n}\n\n.guideSidebarFooter {\n  margin-top: 1.5rem;\n  padding-top: 1rem;\n  border-top: 1px solid var(--paper);\n}\n\n.guideExternalLink {\n  display: inline-block;\n  font-size: 0.8rem;\n  color: var(--brand-primary);\n  text-decoration: none;\n}\n.guideExternalLink:hover {\n  text-decoration: underline;\n}\n\n.guideContent {\n  padding: 0.5rem 0 2rem;\n}\n\n.guideSection {\n  margin-bottom: 2.5rem;\n}\n\n.guideSection h2 {\n  font-size: var(--step-1);\n  color: var(--ink);\n  margin: 0 0 1rem;\n  padding-bottom: 0.5rem;\n  border-bottom: 1px solid var(--paper);\n}\n\n.guideMarkdown {\n  line-height: 1.7;\n  color: var(--ink);\n}\n\n.guideMarkdown p {\n  margin: 0 0 0.75rem;\n}\n\n.guideMarkdown h3 {\n  font-size: 0.95rem;\n  color: var(--ink);\n  margin: 1.25rem 0 0.5rem;\n}\n\n.guideMarkdown ul {\n  margin: 0.5rem 0 0.75rem 1.25rem;\n}\n\n.guideMarkdown li {\n  margin: 0.25rem 0;\n}\n\n.guideInlineCode {\n  font-family: var(--font-mono);\n  font-size: 0.85em;\n  background: var(--paper);\n  padding: 0.15rem 0.35rem;\n  border-radius: 4px;\n}\n\n.guideCodeBlock {\n  margin: 0.75rem 0;\n  border-radius: 8px;\n  overflow: hidden;\n  background: var(--ink);\n}\n.guideCodeBlock code {\n  display: block;\n  padding: 1rem;\n  font-family: var(--font-mono);\n  font-size: 0.75rem;\n  line-height: 1.6;\n  color: var(--paper);\n  overflow-x: auto;\n}\n\n.guideTableWrapper {\n  overflow-x: auto;\n  margin: 1rem 0;\n}\n.guideTableWrapper table {\n  width: 100%;\n  border-collapse: collapse;\n  font-size: 0.8rem;\n}\n.guideTableWrapper th,\n.guideTableWrapper td {\n  padding: 0.5rem 0.75rem;\n  border: 1px solid var(--paper-soft);\n  text-align: left;\n}\n.guideTableWrapper th {\n  background: var(--paper-raised);\n  font-weight: 600;\n  color: var(--ink);\n}\n\n/* Mobile responsive */\n@media (max-width: 860px) {\n  .integrationGuide {\n    grid-template-columns: 1fr;\n  }\n  .guideSidebar {\n    position: static;\n    max-height: none;\n    border-right: none;\n    border-bottom: 1px solid var(--paper);\n    padding: 0 0 1rem;\n    margin-bottom: 1rem;\n  }\n  .guideSidebar ul {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 0.4rem;\n  }\n  .guideLink,\n  .guideLinkActive {\n    padding: 0.4rem 0.7rem;\n    font-size: 0.8rem;\n  }\n}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 11.9s)

_Thinking:_

Now I need to mount the IntegrationGuide in App.jsx under ProtectedRoute for admin role. Let me read App.jsx and add the route.

Now mount the IntegrationGuide in App.jsx:



**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/App.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/App.jsx</path>
<type>file</type>
<content>
1: import { lazy, Suspense } from "react";
2: import { Routes, Route, Navigate } from "react-router-dom";
3: import { AuthProvider } from "./features/auth/AuthContext";
4: import { ThemeProvider } from "./features/theme/ThemeContext";
5: import { BrandProvider } from "./features/brand/BrandContext";
6: import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
7: import ProtectedRoute from "./features/auth/ProtectedRoute";
8: import Navbar from "./components/Navbar/Navbar";
9: import Footer from "./components/Footer/Footer";
10: 
11: const Landing = lazy(() => import("./pages/Landing/Landing"));
12: const Contact = lazy(() => import("./pages/Contact/Contact"));
13: const StaffHome = lazy(() => import("./pages/StaffHome/StaffHome"));
14: const LoginPage = lazy(() => import("./pages/Login/LoginPage"));
15: const PlatformLogin = lazy(() => import("./pages/Platform/PlatformLogin"));
16: const PlatformDashboard = lazy(() => import("./pages/Platform/PlatformDashboard"));
17: const Board = lazy(() => import("./pages/Board/Board"));
18: const Boards = lazy(() => import("./pages/Boards/Boards"));
19: const Kiosk = lazy(() => import("./pages/Kiosk/Kiosk"));
20: const Appointment = lazy(() => import("./pages/Appointment/Appointment"));
21: const NearestBranch = lazy(() => import("./pages/NearestBranch/NearestBranch"));
22: const Branch = lazy(() => import("./pages/Branch/Branch"));
23: const TicketPage = lazy(() => import("./pages/TicketPage/TicketPage"));
24: const NotFound = lazy(() => import("./pages/NotFound/NotFound"));
25: 
26: const PageSpinner = () => (
27:   <div
28:     style={{
29:       minHeight: "60vh",
30:       display: "flex",
31:       alignItems: "center",
32:       justifyContent: "center",
33:       fontFamily: "var(--font-body, system-ui, sans-serif)",
34:       color: "var(--text-muted, #666)",
35:     }}
36:   >
37:     Loading…
38:   </div>
39: );
40: 
41: function App() {
42:   return (
43:     <BrandProvider>
44:     <ThemeProvider>
45:     <AuthProvider>
46:       <ErrorBoundary>
47:       <Suspense fallback={<PageSpinner />}>
48:       <Routes>
49:         <Route
50:           path="/"
51:           element={
52:             <>
53:               <Navbar />
54:               <Landing />
55:               <Footer />
56:             </>
57:           }
58:         />
59:         <Route
60:           path="/contact"
61:           element={
62:             <>
63:               <Navbar />
64:               <Contact />
65:               <Footer />
66:             </>
67:           }
68:         />
69:         <Route
70:           path="/ticket"
71:           element={
72:             <>
73:               <Navbar />
74:               <TicketPage />
75:               <Footer />
76:             </>
77:           }
78:         />
79:         <Route
80:           path="/ticket/:ticketId"
81:           element={
82:             <>
83:               <Navbar />
84:               <TicketPage />
85:               <Footer />
86:             </>
87:           }
88:         />
89:         <Route
90:           path="/staff"
91:           element={
92:             <ProtectedRoute allowedRoles={["staff", "manager", "admin"]}>
93:               <>
94:                 <Navbar />
95:                 <StaffHome />
96:                 <Footer />
97:               </>
98:             </ProtectedRoute>
99:           }
100:         />
101:         {/* Bank JWT logins — Phase 13 WP7 (one page per kind) */}
102:         <Route
103:           path="/login"
104:           element={<Navigate to="/login/staff" replace />}
105:         />
106:         <Route path="/login/:kind" element={<LoginPage />} />
107:         {/* Superadmin platform console — JWT login only, not bank-scoped */}
108:         <Route
109:           path="/platform/login"
110:           element={
111:             <>
112:               <Navbar />
113:               <PlatformLogin />
114:             </>
115:           }
116:         />
117:         <Route
118:           path="/platform"
119:           element={
120:             <ProtectedRoute allowedRoles={["superadmin"]}>
121:               <PlatformDashboard />
122:             </ProtectedRoute>
123:           }
124:         />
125:         <Route path="/boards" element={<Boards />} />
126:         <Route path="/board/:branchId" element={<Board />} />
127:         <Route path="/kiosk/:branchId" element={<Kiosk />} />
128:         <Route path="/appointment/:branchId" element={<Appointment />} />
129:         <Route path="/find-nearby" element={<NearestBranch />} />
130:         <Route
131:           path="/branch/:branchId"
132:           element={
133:             <>
134:               <Navbar />
135:               <Branch />
136:               <Footer />
137:             </>
138:           }
139:         />
140:         <Route path="*" element={<NotFound />} />
141:       </Routes>
142:       </Suspense>
143:       </ErrorBoundary>
144:     </AuthProvider>
145:     </ThemeProvider>
146:     </BrandProvider>
147:   );
148: }
149: 
150: export default App;

(End of file - total 150 lines)
</content>
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 22.2s)

_Thinking:_

Now I need to add the IntegrationGuide lazy import and mount it at /integration under ProtectedRoute for admin role.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/App.jsx",
  "oldString": "const Landing = lazy(() => import(\"./pages/Landing/Landing\"));\nconst Contact = lazy(() => import(\"./pages/Contact/Contact\"));\nconst StaffHome = lazy(() => import(\"./pages/StaffHome/StaffHome\"));\nconst LoginPage = lazy(() => import(\"./pages/Login/LoginPage\"));\nconst PlatformLogin = lazy(() => import(\"./pages/Platform/PlatformLogin\"));\nconst PlatformDashboard = lazy(() => import(\"./pages/Platform/PlatformDashboard\"));\nconst Board = lazy(() => import(\"./pages/Board/Board\"));\nconst Boards = lazy(() => import(\"./pages/Boards/Boards\"));\nconst Kiosk = lazy(() => import(\"./pages/Kiosk/Kiosk\"));\nconst Appointment = lazy(() => import(\"./pages/Appointment/Appointment\"));\nconst NearestBranch = lazy(() => import(\"./pages/NearestBranch/NearestBranch\"));\nconst Branch = lazy(() => import(\"./pages/Branch/Branch\"));\nconst TicketPage = lazy(() => import(\"./pages/TicketPage/TicketPage\"));\nconst NotFound = lazy(() => import(\"./pages/NotFound/NotFound\"));",
  "newString": "const Landing = lazy(() => import(\"./pages/Landing/Landing\"));\nconst Contact = lazy(() => import(\"./pages/Contact/Contact\"));\nconst StaffHome = lazy(() => import(\"./pages/StaffHome/StaffHome\"));\nconst LoginPage = lazy(() => import(\"./pages/Login/LoginPage\"));\nconst PlatformLogin = lazy(() => import(\"./pages/Platform/PlatformLogin\"));\nconst PlatformDashboard = lazy(() => import(\"./pages/Platform/PlatformDashboard\"));\nconst Board = lazy(() => import(\"./pages/Board/Board\"));\nconst Boards = lazy(() => import(\"./pages/Boards/Boards\"));\nconst Kiosk = lazy(() => import(\"./pages/Kiosk/Kiosk\"));\nconst Appointment = lazy(() => import(\"./pages/Appointment/Appointment\"));\nconst NearestBranch = lazy(() => import(\"./pages/NearestBranch/NearestBranch\"));\nconst Branch = lazy(() => import(\"./pages/Branch/Branch\"));\nconst TicketPage = lazy(() => import(\"./pages/TicketPage/TicketPage\"));\nconst NotFound = lazy(() => import(\"./pages/NotFound/NotFound\"));\nconst IntegrationGuide = lazy(() => import(\"./pages/StaffHome/IntegrationGuide\"));"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 9.5s)

_Thinking:_

Now I need to add the route for /integration under ProtectedRoute for admin role.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/App.jsx",
  "newString": "<Route\n          path=\"/staff\"\n          element={\n            <ProtectedRoute allowedRoles={[\"staff\", \"manager\", \"admin\"]}>\n              <>\n                <Navbar />\n                <StaffHome />\n                <Footer />\n              </>\n            </ProtectedRoute>\n          }\n        />\n        <Route\n          path=\"/integration\"\n          element={\n            <ProtectedRoute allowedRoles={[\"admin\"]}>\n              <>\n                <Navbar />\n                <IntegrationGuide />\n                <Footer />\n              </>\n            </ProtectedRoute>\n          }\n        />",
  "oldString": "<Route\n          path=\"/staff\"\n          element={\n            <ProtectedRoute allowedRoles={[\"staff\", \"manager\", \"admin\"]}>\n              <>\n                <Navbar />\n                <StaffHome />\n                <Footer />\n              </>\n            </ProtectedRoute>\n          }\n        />"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 31.9s)

_Thinking:_

Now let me run the frontend build and tests to verify everything works.

Now let's verify the build and run tests:




**Tool: bash**

**Input:**
```json
{
  "timeout": 120000,
  "workdir": "/home/gamp/Desktop/cue/frontend",
  "command": "npm run build 2>&1"
}
```

**Output:**
```
npm notice run frontend@0.0.0 build
npm notice run vite build
vite v8.2.2 building client environment for production...
transforming...
✓ 550 modules transformed.
✗ Build failed in 2.65s
error during build:
Build failed with 1 error:

[31m[builtin:vite-transform] [0mExpected `,` or `)` but found `{`
     [38;5;246m╭[0m[38;5;246m─[0m[38;5;246m[[0m src/pages/StaffHome/AdminOverview.jsx:529:9 [38;5;246m][0m
     [38;5;246m│[0m
 [38;5;246m462 │[0m [38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m{[0m[38;5;249mk[0m[38;5;249me[0m[38;5;249my[0m[38;5;249mR[0m[38;5;249me[0m[38;5;249mq[0m[38;5;249mu[0m[38;5;249me[0m[38;5;249ms[0m[38;5;249mt[0m[38;5;249ms[0m[38;5;249m.[0m[38;5;249mm[0m[38;5;249ma[0m[38;5;249mp[0m[38;5;249m([0m[38;5;249m([0m[38;5;249mr[0m[38;5;249m)[0m[38;5;249m [0m[38;5;249m=[0m[38;5;249m>[0m[38;5;249m [0m(
 [38;5;240m    │[0m                               ┬  
 [38;5;240m    │[0m                               ╰── Opened here
 [38;5;240m    │[0m 
 [38;5;246m529 │[0m [38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m{[38;5;249m/[0m[38;5;249m*[0m[38;5;249m [0m[38;5;249mE[0m[38;5;249mx[0m[38;5;249mp[0m[38;5;249ma[0m[38;5;249mn[0m[38;5;249md[0m[38;5;249ma[0m[38;5;249mb[0m[38;5;249ml[0m[38;5;249me[0m[38;5;249m [0m[38;5;249ms[0m[38;5;249mn[0m[38;5;249mi[0m[38;5;249mp[0m[38;5;249mp[0m[38;5;249me[0m[38;5;249mt[0m[38;5;249ms[0m[38;5;249m [0m[38;5;249mp[0m[38;5;249ma[0m[38;5;249mn[0m[38;5;249me[0m[38;5;249ml[0m[38;5;249m [0m[38;5;249mp[0m[38;5;249me[0m[38;5;249mr[0m[38;5;249m [0m[38;5;249mk[0m[38;5;249me[0m[38;5;249my[0m[38;5;249m [0m[38;5;249mr[0m[38;5;249mo[0m[38;5;249mw[0m[38;5;249m [0m[38;5;249m*[0m[38;5;249m/[0m[38;5;249m}[0m
 [38;5;240m    │[0m         ┬  
 [38;5;240m    │[0m         ╰── `,` or `)` expected
[38;5;246m─────╯[0m

    at aggregateBindingErrorsIntoJsError (file:///home/gamp/Desktop/cue/frontend/node_modules/rolldown/dist/shared/error-NcRuXAVN.mjs:48:18)
    at unwrapBindingResult (file:///home/gamp/Desktop/cue/frontend/node_modules/rolldown/dist/shared/error-NcRuXAVN.mjs:18:128)
    at #build (file:///home/gamp/Desktop/cue/frontend/node_modules/rolldown/dist/shared/rolldown-vcii7mEa.mjs:132:34)
    at async buildEnvironment (file:///home/gamp/Desktop/cue/frontend/node_modules/vite/dist/node/chunks/node.js:33821:66)
    at async Object.build (file:///home/gamp/Desktop/cue/frontend/node_modules/vite/dist/node/chunks/node.js:34242:19)
    at async Object.buildApp (file:///home/gamp/Desktop/cue/frontend/node_modules/vite/dist/node/chunks/node.js:34239:153)
    at async CAC.<anonymous> (file:///home/gamp/Desktop/cue/frontend/node_modules/vite/dist/node/cli.js:776:3) {
  errors: [Getter/Setter]
}

```

**Tool: bash**

**Input:**
```json
{
  "command": "npm test 2>&1",
  "workdir": "/home/gamp/Desktop/cue/frontend",
  "timeout": 120000
}
```

**Output:**
```
npm notice run frontend@0.0.0 test
npm notice run vitest run

 RUN  v5.0.0 /home/gamp/Desktop/cue/frontend


 Test Files  2 passed (2)
      Tests  8 passed (8)
   Start at  13:43:04
   Duration  9.60s (environment 81%, setup 9%, tests 4%, transform 3%, import 2%)


```

**Tool: bash**

**Input:**
```json
{
  "workdir": "/home/gamp/Desktop/cue/backend",
  "command": "npm test 2>&1",
  "timeout": 120000
}
```

**Output:**
```
npm notice run smart-queue-management-system@1.0.0 test
npm notice run vitest run

 RUN  v5.0.0 /home/gamp/Desktop/cue/backend


 Test Files  17 passed (17)
      Tests  137 passed (137)
   Start at  13:43:05
   Duration  11.39s (import 78%, transform 15%, tests 4%, worker 3%)

    Isolate  17 workers spawned · ~547ms startup each (spawn + environment, per file)
             at least ~2.55s faster with isolate: false — reuses workers across files instead of one per file


```

**Tool: bash**

**Input:**
```json
{
  "workdir": "/home/gamp/Desktop/cue/backend",
  "command": "node --check src/app.js && echo OK"
}
```

**Output:**
```
OK

```

---

## Assistant (Build · Nemotron 3 Ultra Free · 5.1s)

_Thinking:_

There's a syntax error in AdminOverview.jsx at line 529. It seems to be a JSX issue with a comment inside a map callback. Let me check and fix the issue.

There's a syntax error in AdminOverview.jsx. Let me fix it:


**Tool: read**

**Input:**
```json
{
  "limit": 50,
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx",
  "offset": 520
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx</path>
<type>file</type>
<content>
520:                 className={styles.mgmtSubmitBtn}
521:                 onClick={() => handleRevealKey(r.id)}
522:               >
523:                 Reveal key
524:               </button>
525:             )}
526:           </div>
527:         </div>
528: 
529:         {/* Expandable snippets panel per key row */}
530:         {snippetOpenId === r.id && r.status === "approved" && (
531:           <div className={styles.snippetRowPanel}>
532:             <p className={styles.snippetNote}>
533:               Key prefix: <code>{r.keyPrefix || "…"}</code> — replace with your full key.
534:               Base URL: <code>{import.meta.env.VITE_API_URL || "http://localhost:3000/api"}</code>
535:             </p>
536:             {buildSnippets(`cue_${r.keyPrefix || "XXXXXX..."}XXXXXXXXXXXXXXXXXXXX`, import.meta.env.VITE_API_URL || "http://localhost:3000/api").map((s, i) => (
537:               <div key={i} className={styles.snippetCard}>
538:                 <div className={styles.snippetHeader}>
539:                   <span>{s.label}</span>
540:                   <button
541:                     type="button"
542:                     className={styles.snippetCopyBtn}
543:                     onClick={() => navigator.clipboard?.writeText(s.code)}
544:                   >
545:                     Copy
546:                   </button>
547:                 </div>
548:                 <pre className={styles.snippetCode}><code>{s.code}</code></pre>
549:               </div>
550:             ))}
551:           </div>
552:         )}
553:       ))}
554:     </motion.div>
555:   );
556: };
557: 
558: export default AdminOverview;

(End of file - total 558 lines)
</content>
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 27.5s)

_Thinking:_

The issue is that the comment `{/* Expandable snippets panel per key row */}` is inside the `.map()` callback but not properly wrapped. In JSX, when you have a block inside a map, you need to wrap adjacent elements in a fragment or container. The comment is being treated as a JSX element but there's no parent to hold it along with the conditional render.

Let me fix this by wrapping the whole thing in a fragment or by moving the comment outside the map.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx",
  "newString": "</div>\n\n        {snippetOpenId === r.id && r.status === \"approved\" && (\n          <div className={styles.snippetRowPanel}>\n            <p className={styles.snippetNote}>\n              Key prefix: <code>{r.keyPrefix || \"…\"}</code> — replace with your full key.\n              Base URL: <code>{import.meta.env.VITE_API_URL || \"http://localhost:3000/api\"}</code>\n            </p>\n            {buildSnippets(`cue_${r.keyPrefix || \"XXXXXX...\"}XXXXXXXXXXXXXXXXXXXX`, import.meta.env.VITE_API_URL || \"http://localhost:3000/api\").map((s, i) => (\n              <div key={i} className={styles.snippetCard}>\n                <div className={styles.snippetHeader}>\n                  <span>{s.label}</span>\n                  <button\n                    type=\"button\"\n                    className={styles.snippetCopyBtn}\n                    onClick={() => navigator.clipboard?.writeText(s.code)}\n                  >\n                    Copy\n                  </button>\n                </div>\n                <pre className={styles.snippetCode}><code>{s.code}</code></pre>\n              </div>\n            ))}\n          </div>\n        )}\n      ))}",
  "oldString": "</div>\n\n        {/* Expandable snippets panel per key row */}\n        {snippetOpenId === r.id && r.status === \"approved\" && (\n          <div className={styles.snippetRowPanel}>\n            <p className={styles.snippetNote}>\n              Key prefix: <code>{r.keyPrefix || \"…\"}</code> — replace with your full key.\n              Base URL: <code>{import.meta.env.VITE_API_URL || \"http://localhost:3000/api\"}</code>\n            </p>\n            {buildSnippets(`cue_${r.keyPrefix || \"XXXXXX...\"}XXXXXXXXXXXXXXXXXXXX`, import.meta.env.VITE_API_URL || \"http://localhost:3000/api\").map((s, i) => (\n              <div key={i} className={styles.snippetCard}>\n                <div className={styles.snippetHeader}>\n                  <span>{s.label}</span>\n                  <button\n                    type=\"button\"\n                    className={styles.snippetCopyBtn}\n                    onClick={() => navigator.clipboard?.writeText(s.code)}\n                  >\n                    Copy\n                  </button>\n                </div>\n                <pre className={styles.snippetCode}><code>{s.code}</code></pre>\n              </div>\n            ))}\n          </div>\n        )}\n      ))}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 16.3s)

_Thinking:_

Now let me rebuild the frontend to verify the fix.

**Tool: bash**

**Input:**
```json
{
  "command": "npm run build 2>&1",
  "timeout": 120000,
  "workdir": "/home/gamp/Desktop/cue/frontend"
}
```

**Output:**
```
npm notice run frontend@0.0.0 build
npm notice run vite build
vite v8.2.2 building client environment for production...
transforming...
✓ 550 modules transformed.
✗ Build failed in 1.46s
error during build:
Build failed with 1 error:

[31m[builtin:vite-transform] [0mExpected `,` or `)` but found `{`
     [38;5;246m╭[0m[38;5;246m─[0m[38;5;246m[[0m src/pages/StaffHome/AdminOverview.jsx:529:9 [38;5;246m][0m
     [38;5;246m│[0m
 [38;5;246m462 │[0m [38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m{[0m[38;5;249mk[0m[38;5;249me[0m[38;5;249my[0m[38;5;249mR[0m[38;5;249me[0m[38;5;249mq[0m[38;5;249mu[0m[38;5;249me[0m[38;5;249ms[0m[38;5;249mt[0m[38;5;249ms[0m[38;5;249m.[0m[38;5;249mm[0m[38;5;249ma[0m[38;5;249mp[0m[38;5;249m([0m[38;5;249m([0m[38;5;249mr[0m[38;5;249m)[0m[38;5;249m [0m[38;5;249m=[0m[38;5;249m>[0m[38;5;249m [0m(
 [38;5;240m    │[0m                               ┬  
 [38;5;240m    │[0m                               ╰── Opened here
 [38;5;240m    │[0m 
 [38;5;246m529 │[0m [38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m{[38;5;249ms[0m[38;5;249mn[0m[38;5;249mi[0m[38;5;249mp[0m[38;5;249mp[0m[38;5;249me[0m[38;5;249mt[0m[38;5;249mO[0m[38;5;249mp[0m[38;5;249me[0m[38;5;249mn[0m[38;5;249mI[0m[38;5;249md[0m[38;5;249m [0m[38;5;249m=[0m[38;5;249m=[0m[38;5;249m=[0m[38;5;249m [0m[38;5;249mr[0m[38;5;249m.[0m[38;5;249mi[0m[38;5;249md[0m[38;5;249m [0m[38;5;249m&[0m[38;5;249m&[0m[38;5;249m [0m[38;5;249mr[0m[38;5;249m.[0m[38;5;249ms[0m[38;5;249mt[0m[38;5;249ma[0m[38;5;249mt[0m[38;5;249mu[0m[38;5;249ms[0m[38;5;249m [0m[38;5;249m=[0m[38;5;249m=[0m[38;5;249m=[0m[38;5;249m [0m[38;5;249m"[0m[38;5;249ma[0m[38;5;249mp[0m[38;5;249mp[0m[38;5;249mr[0m[38;5;249mo[0m[38;5;249mv[0m[38;5;249me[0m[38;5;249md[0m[38;5;249m"[0m[38;5;249m [0m[38;5;249m&[0m[38;5;249m&[0m[38;5;249m [0m[38;5;249m([0m
 [38;5;240m    │[0m         ┬  
 [38;5;240m    │[0m         ╰── `,` or `)` expected
[38;5;246m─────╯[0m

    at aggregateBindingErrorsIntoJsError (file:///home/gamp/Desktop/cue/frontend/node_modules/rolldown/dist/shared/error-NcRuXAVN.mjs:48:18)
    at unwrapBindingResult (file:///home/gamp/Desktop/cue/frontend/node_modules/rolldown/dist/shared/error-NcRuXAVN.mjs:18:128)
    at #build (file:///home/gamp/Desktop/cue/frontend/node_modules/rolldown/dist/shared/rolldown-vcii7mEa.mjs:132:34)
    at async buildEnvironment (file:///home/gamp/Desktop/cue/frontend/node_modules/vite/dist/node/chunks/node.js:33821:66)
    at async Object.build (file:///home/gamp/Desktop/cue/frontend/node_modules/vite/dist/node/chunks/node.js:34242:19)
    at async Object.buildApp (file:///home/gamp/Desktop/cue/frontend/node_modules/vite/dist/node/chunks/node.js:34239:153)
    at async CAC.<anonymous> (file:///home/gamp/Desktop/cue/frontend/node_modules/vite/dist/node/cli.js:776:3) {
  errors: [Getter/Setter]
}

```

---

## Assistant (Build · Nemotron 3 Ultra Free · 30.4s)

_Thinking:_

The error is still on line 529 but it's now pointing at a different location - the `snippetOpenId === r.id &&` part. Let me read the file again to see the exact structure around the map callback.

**Tool: read**

**Input:**
```json
{
  "offset": 490,
  "limit": 80,
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx"
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx</path>
<type>file</type>
<content>
490:                   r.keyStatus === "active"
491:                     ? styles.mgmtBadgeOpen
492:                     : r.keyStatus === "suspended"
493:                       ? styles.mgmtBadgePending
494:                       : styles.mgmtBadgeClosed
495:                 }
496:                 title={
497:                   r.keyStatus === "revoked"
498:                     ? "Key revoked by platform — integration calls will be rejected"
499:                     : r.keyStatus === "suspended"
500:                       ? "Key temporarily disabled by platform"
501:                       : "Key is active for X-API-Key integration calls"
502:                 }
503:               >
504:                 {r.keyStatus}
505:               </span>
506:             )}
507:             {r.status === "approved" &&
508:             (r.keyStatus === "active" || r.keyStatus === "suspended") && (
509:               <button
510:                 type="button"
511:                 className={styles.mgmtLinkBtn}
512:                 onClick={() => toggleSnippets(r.id)}
513:               >
514:                 {snippetOpenId === r.id ? "Hide snippets" : "Use this key"}
515:               </button>
516:             )}
517:             {r.canRevealKey && (
518:               <button
519:                 type="button"
520:                 className={styles.mgmtSubmitBtn}
521:                 onClick={() => handleRevealKey(r.id)}
522:               >
523:                 Reveal key
524:               </button>
525:             )}
526:           </div>
527:         </div>
528: 
529:         {snippetOpenId === r.id && r.status === "approved" && (
530:           <div className={styles.snippetRowPanel}>
531:             <p className={styles.snippetNote}>
532:               Key prefix: <code>{r.keyPrefix || "…"}</code> — replace with your full key.
533:               Base URL: <code>{import.meta.env.VITE_API_URL || "http://localhost:3000/api"}</code>
534:             </p>
535:             {buildSnippets(`cue_${r.keyPrefix || "XXXXXX..."}XXXXXXXXXXXXXXXXXXXX`, import.meta.env.VITE_API_URL || "http://localhost:3000/api").map((s, i) => (
536:               <div key={i} className={styles.snippetCard}>
537:                 <div className={styles.snippetHeader}>
538:                   <span>{s.label}</span>
539:                   <button
540:                     type="button"
541:                     className={styles.snippetCopyBtn}
542:                     onClick={() => navigator.clipboard?.writeText(s.code)}
543:                   >
544:                     Copy
545:                   </button>
546:                 </div>
547:                 <pre className={styles.snippetCode}><code>{s.code}</code></pre>
548:               </div>
549:             ))}
550:           </div>
551:         )}
552:       ))}
553:     </motion.div>
554:   );
555: };
556: 
557: export default AdminOverview;

(End of file - total 557 lines)
</content>
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 97.8s)

_Thinking:_

The issue is the JSX structure. The map callback is returning multiple adjacent elements (the mgmtRow div + the conditional snippetRowPanel), but they're not wrapped in a fragment. In React, when using map, each iteration must return a single element (or a fragment).

The current structure is:
```jsx
{keyRequests.map((r) => (
  <div key={r.id} className={styles.mgmtRow}>
    ...
  </div>

  {snippetOpenId === r.id && ... && (
    <div className={styles.snippetRowPanel}>...</div>
  )}
))}
```

This returns two sibling elements from the map callback, which is invalid. I need to wrap them in a fragment `<>...</>` or a single parent div.

Let me fix this.

The issue is the map callback returns two sibling elements. Need to wrap in a fragment:



**Tool: edit**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx",
  "newString": "{keyRequests.map((r) => (\n        <>\n          <div key={r.id} className={styles.mgmtRow}>\n            <div>\n              <div className={styles.mgmtRowTitle}>\n                {r.label || \"API key request\"}\n              </div>\n              <div className={styles.mgmtRowSub}>\n                scopes: {r.scopes?.join(\", \")} · {r.rateLimit}/min ·{\" \"}\n                {new Date(r.createdAt).toLocaleString()}\n                {r.keyPrefix ? ` · ends in ${r.keyPrefix}` : \"\"}\n                {r.reviewNote ? ` · note: ${r.reviewNote}` : \"\"}\n              </div>\n            </div>\n            <div className={styles.mgmtRowActions}>\n              <span\n                className={\n                  r.status === \"approved\"\n                    ? styles.mgmtBadgeOpen\n                    : r.status === \"rejected\"\n                      ? styles.mgmtBadgeClosed\n                      : styles.mgmtBadgePending\n                }\n              >\n                {r.status}\n              </span>\n              {r.status === \"approved\" && r.keyStatus && (\n                <span\n                  className={\n                    r.keyStatus === \"active\"\n                      ? styles.mgmtBadgeOpen\n                      : r.keyStatus === \"suspended\"\n                        ? styles.mgmtBadgePending\n                        : styles.mgmtBadgeClosed\n                  }\n                  title={\n                    r.keyStatus === \"revoked\"\n                      ? \"Key revoked by platform — integration calls will be rejected\"\n                      : r.keyStatus === \"suspended\"\n                        ? \"Key temporarily disabled by platform\"\n                        : \"Key is active for X-API-Key integration calls\"\n                  }\n                >\n                  {r.keyStatus}\n                </span>\n              )}\n              {r.status === \"approved\" &&\n              (r.keyStatus === \"active\" || r.keyStatus === \"suspended\") && (\n                <button\n                  type=\"button\"\n                  className={styles.mgmtLinkBtn}\n                  onClick={() => toggleSnippets(r.id)}\n                >\n                  {snippetOpenId === r.id ? \"Hide snippets\" : \"Use this key\"}\n                </button>\n              )}\n              {r.canRevealKey && (\n                <button\n                  type=\"button\"\n                  className={styles.mgmtSubmitBtn}\n                  onClick={() => handleRevealKey(r.id)}\n                >\n                  Reveal key\n                </button>\n              )}\n            </div>\n          </div>\n\n          {snippetOpenId === r.id && r.status === \"approved\" && (\n            <div key={`snippet-${r.id}`} className={styles.snippetRowPanel}>\n              <p className={styles.snippetNote}>\n                Key prefix: <code>{r.keyPrefix || \"…\"}</code> — replace with your full key.\n                Base URL: <code>{import.meta.env.VITE_API_URL || \"http://localhost:3000/api\"}</code>\n              </p>\n              {buildSnippets(`cue_${r.keyPrefix || \"XXXXXX...\"}XXXXXXXXXXXXXXXXXXXX`, import.meta.env.VITE_API_URL || \"http://localhost:3000/api\").map((s, i) => (\n                <div key={i} className={styles.snippetCard}>\n                  <div className={styles.snippetHeader}>\n                    <span>{s.label}</span>\n                    <button\n                      type=\"button\"\n                      className={styles.snippetCopyBtn}\n                      onClick={() => navigator.clipboard?.writeText(s.code)}\n                    >\n                      Copy\n                    </button>\n                  </div>\n                  <pre className={styles.snippetCode}><code>{s.code}</code></pre>\n                </div>\n              ))}\n            </div>\n          )}\n        </>\n      ))}",
  "oldString": "{keyRequests.map((r) => (\n        <div key={r.id} className={styles.mgmtRow}>\n          <div>\n            <div className={styles.mgmtRowTitle}>\n              {r.label || \"API key request\"}\n            </div>\n            <div className={styles.mgmtRowSub}>\n              scopes: {r.scopes?.join(\", \")} · {r.rateLimit}/min ·{\" \"}\n              {new Date(r.createdAt).toLocaleString()}\n              {r.keyPrefix ? ` · ends in ${r.keyPrefix}` : \"\"}\n              {r.reviewNote ? ` · note: ${r.reviewNote}` : \"\"}\n            </div>\n          </div>\n          <div className={styles.mgmtRowActions}>\n            <span\n              className={\n                r.status === \"approved\"\n                  ? styles.mgmtBadgeOpen\n                  : r.status === \"rejected\"\n                    ? styles.mgmtBadgeClosed\n                    : styles.mgmtBadgePending\n              }\n            >\n              {r.status}\n            </span>\n            {r.status === \"approved\" && r.keyStatus && (\n              <span\n                className={\n                  r.keyStatus === \"active\"\n                    ? styles.mgmtBadgeOpen\n                    : r.keyStatus === \"suspended\"\n                      ? styles.mgmtBadgePending\n                      : styles.mgmtBadgeClosed\n                }\n                title={\n                  r.keyStatus === \"revoked\"\n                    ? \"Key revoked by platform — integration calls will be rejected\"\n                    : r.keyStatus === \"suspended\"\n                      ? \"Key temporarily disabled by platform\"\n                      : \"Key is active for X-API-Key integration calls\"\n                }\n              >\n                {r.keyStatus}\n              </span>\n            )}\n            {r.status === \"approved\" &&\n            (r.keyStatus === \"active\" || r.keyStatus === \"suspended\") && (\n              <button\n                type=\"button\"\n                className={styles.mgmtLinkBtn}\n                onClick={() => toggleSnippets(r.id)}\n              >\n                {snippetOpenId === r.id ? \"Hide snippets\" : \"Use this key\"}\n              </button>\n            )}\n            {r.canRevealKey && (\n              <button\n                type=\"button\"\n                className={styles.mgmtSubmitBtn}\n                onClick={() => handleRevealKey(r.id)}\n              >\n                Reveal key\n              </button>\n            )}\n          </div>\n        </div>\n\n        {snippetOpenId === r.id && r.status === \"approved\" && (\n          <div className={styles.snippetRowPanel}>\n            <p className={styles.snippetNote}>\n              Key prefix: <code>{r.keyPrefix || \"…\"}</code> — replace with your full key.\n              Base URL: <code>{import.meta.env.VITE_API_URL || \"http://localhost:3000/api\"}</code>\n            </p>\n            {buildSnippets(`cue_${r.keyPrefix || \"XXXXXX...\"}XXXXXXXXXXXXXXXXXXXX`, import.meta.env.VITE_API_URL || \"http://localhost:3000/api\").map((s, i) => (\n              <div key={i} className={styles.snippetCard}>\n                <div className={styles.snippetHeader}>\n                  <span>{s.label}</span>\n                  <button\n                    type=\"button\"\n                    className={styles.snippetCopyBtn}\n                    onClick={() => navigator.clipboard?.writeText(s.code)}\n                  >\n                    Copy\n                  </button>\n                </div>\n                <pre className={styles.snippetCode}><code>{s.code}</code></pre>\n              </div>\n            ))}\n          </div>\n        )}\n      ))}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 21.8s)

_Thinking:_

Now let me rebuild the frontend to verify the fix.

**Tool: bash**

**Input:**
```json
{
  "timeout": 120000,
  "workdir": "/home/gamp/Desktop/cue/frontend",
  "command": "npm run build 2>&1"
}
```

**Output:**
```
npm notice run frontend@0.0.0 build
npm notice run vite build
vite v8.2.2 building client environment for production...
transforming...
✓ 552 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                 0.54 kB │ gzip:  0.33 kB
dist/assets/SplitFlapBoard-CScboK_F.css         0.04 kB │ gzip:  0.06 kB
dist/assets/MotionBackground-EDPDeuNe.css       0.44 kB │ gzip:  0.27 kB
dist/assets/FlapUnit-DSD43QmB.css               0.70 kB │ gzip:  0.38 kB
dist/assets/StaffHome-307rijC9.css              1.20 kB │ gzip:  0.50 kB
dist/assets/Contact-Cd2pagkb.css                2.39 kB │ gzip:  0.84 kB
dist/assets/LoginPage-B4Vixr4H.css              2.47 kB │ gzip:  0.92 kB
dist/assets/NearestBranch-Devvl3jF.css          2.75 kB │ gzip:  0.90 kB
dist/assets/Branch-CqJodSU_.css                 3.12 kB │ gzip:  0.96 kB
dist/assets/Kiosk-CIx0xwPK.css                  3.56 kB │ gzip:  0.98 kB
dist/assets/Boards-CI7PsP93.css                 3.78 kB │ gzip:  1.22 kB
dist/assets/TicketPage-BmnPbBSs.css             4.13 kB │ gzip:  1.23 kB
dist/assets/Appointment-Db7QMx4x.css            4.26 kB │ gzip:  1.16 kB
dist/assets/NotFound-BZmeblkS.css               4.36 kB │ gzip:  1.58 kB
dist/assets/Board-DcZVuyKg.css                  5.39 kB │ gzip:  1.58 kB
dist/assets/index-xkllxhr3.css                  6.57 kB │ gzip:  2.09 kB
dist/assets/Platform-DC6vainy.css               7.71 kB │ gzip:  1.91 kB
dist/assets/Landing-BwrVP7ac.css                8.78 kB │ gzip:  1.89 kB
dist/assets/StaffHome-CONSHoN4.css             19.63 kB │ gzip:  3.77 kB
dist/assets/prefersReducedMotion-H_9XR_Vq.js    0.10 kB │ gzip:  0.11 kB
dist/assets/SplitFlapBoard-BfdUftf2.js          0.57 kB │ gzip:  0.40 kB
dist/assets/FlapUnit-W1oYMDzx.js                0.77 kB │ gzip:  0.45 kB
dist/assets/MotionBackground-BYY9E_Z5.js        0.91 kB │ gzip:  0.49 kB
dist/assets/Platform.module-CSE0V78f.js         1.64 kB │ gzip:  0.61 kB
dist/assets/PlatformLogin-BSVJplr5.js           2.60 kB │ gzip:  1.16 kB
dist/assets/LoginPage-DGiObASn.js               3.68 kB │ gzip:  1.58 kB
dist/assets/NearestBranch-BgXiVAvQ.js           4.03 kB │ gzip:  1.55 kB
dist/assets/Branch-zTxq7oDs.js                  4.59 kB │ gzip:  1.73 kB
dist/assets/StaffHome.module-BGVgdQpo.js        4.68 kB │ gzip:  1.40 kB
dist/assets/Contact-BS5A05ul.js                 4.77 kB │ gzip:  1.88 kB
dist/assets/Kiosk-BXTJbNsQ.js                   5.26 kB │ gzip:  2.01 kB
dist/assets/Boards-BMFvkHKa.js                  6.41 kB │ gzip:  2.16 kB
dist/assets/Appointment-Y5Fz6Pqu.js             8.11 kB │ gzip:  2.65 kB
dist/assets/TicketPage-BoOLBjS_.js              8.16 kB │ gzip:  2.71 kB
dist/assets/Board-BeftcqPB.js                   8.95 kB │ gzip:  2.99 kB
dist/assets/PlatformDashboard-DZxxxNEj.js      10.22 kB │ gzip:  3.03 kB
dist/assets/IntegrationGuide-CU9a-28C.js       10.33 kB │ gzip:  4.25 kB
dist/assets/NotFound-CL8DfqYg.js               11.01 kB │ gzip:  4.14 kB
dist/assets/StaffHome-CBz2EMRQ.js              39.67 kB │ gzip:  9.08 kB
dist/assets/esm-Ckkn2Ami.js                    41.16 kB │ gzip: 12.86 kB
dist/assets/Landing-DhDegvTc.js                63.03 kB │ gzip: 25.15 kB
dist/assets/gsap-DWxn8li7.js                   69.58 kB │ gzip: 27.28 kB
dist/assets/proxy-GcLvUCXa.js                 129.60 kB │ gzip: 42.29 kB
dist/assets/index-D9E547IB.js                 242.17 kB │ gzip: 77.60 kB

✓ built in 2.02s

```

---

## Assistant (Build · Nemotron 3 Ultra Free · 47.0s)

_Thinking:_

Build succeeded. Now let me run the tests to make sure everything passes.

Build succeeded. Now run all tests:


**Tool: bash**

**Input:**
```json
{
  "workdir": "/home/gamp/Desktop/cue/frontend",
  "timeout": 120000,
  "command": "npm test 2>&1"
}
```

**Output:**
```
npm notice run frontend@0.0.0 test
npm notice run vitest run

 RUN  v5.0.0 /home/gamp/Desktop/cue/frontend


 Test Files  2 passed (2)
      Tests  8 passed (8)
   Start at  13:47:14
   Duration  7.57s (environment 76%, setup 11%, transform 5%, tests 4%, import 2%, worker 1%)


```

**Tool: bash**

**Input:**
```json
{
  "timeout": 120000,
  "workdir": "/home/gamp/Desktop/cue/backend",
  "command": "npm test 2>&1"
}
```

**Output:**
```
npm notice run smart-queue-management-system@1.0.0 test
npm notice run vitest run

 RUN  v5.0.0 /home/gamp/Desktop/cue/backend


 Test Files  17 passed (17)
      Tests  137 passed (137)
   Start at  13:47:17
   Duration  9.61s (import 75%, transform 16%, tests 5%, worker 4%)

    Isolate  17 workers spawned · ~502ms startup each (spawn + environment, per file)
             at least ~2.34s faster with isolate: false — reuses workers across files instead of one per file


```

---

## Assistant (Build · Nemotron 3 Ultra Free · 28.1s)

_Thinking:_

All tests pass:
- Frontend: 8 tests passed
- Backend: 137 tests passed

Now let me update the todo list and do a final check on the node --check for the backend.

All tests pass. Let me do a final node check:




**Tool: bash**

**Input:**
```json
{
  "command": "node --check src/app.js && node --check src/routes/test-connection.routes.js && echo OK",
  "workdir": "/home/gamp/Desktop/cue/backend"
}
```

**Output:**
```
OK

```

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Create backend test-connection route (standalone, authenticateApiKey only)",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "Mount test-connection route in app.js",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "Add integration snippets to AdminOverview reveal modal + key rows",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "Add integration snippets CSS styles",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "Create IntegrationGuide new page component",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "Mount IntegrationGuide in App.jsx under ProtectedRoute for admin",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "Run tests + build verify",
      "status": "completed",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Create backend test-connection route (standalone, authenticateApiKey only)",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Mount test-connection route in app.js",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Add integration snippets to AdminOverview reveal modal + key rows",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Add integration snippets CSS styles",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Create IntegrationGuide new page component",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Mount IntegrationGuide in App.jsx under ProtectedRoute for admin",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Run tests + build verify",
    "status": "completed",
    "priority": "high"
  }
]
```

---

## Assistant (Build · Nemotron 3 Ultra Free · 30.4s)

_Thinking:_

All done. Let me provide a summary of what was implemented.

All done. Here's what was implemented:

---

## Summary: Test Connection + Integration Snippets + Integration Guide

### 1. Test Connection (`GET /api/test-connection`)
- **Backend:** New standalone route in `src/app.js` using only `authenticateApiKey` middleware (no rate limit, no bank scoping)
- **Returns:** `200 { bankName, keyPrefix, scopes, rateLimit, isActive, createdAt }` or `401/403`
- **Frontend:** "Test this key" button in the reveal modal — runs live check with the just-revealed key

### 2. Integration Snippets
**In reveal modal (after first reveal):**
- 4 copy-paste snippets: cURL, JavaScript (fetch), Python (requests), Node (axios) — all with the actual key filled in
- Base URL from `VITE_API_URL`
- Scopes & rate limit from the key

**In request status list (per approved key row):**
- "Use this key" toggle → expandable panel with snippets using `keyPrefix` placeholder (`cue_XXXXXX...`)
- Shows key prefix and base URL for reference

### 3. Integration Guide Page (`/integration`)
- New page at `/integration` (ProtectedRoute, admin only)
- 8 sections: Auth, Scopes, Rate Limits, Bank Scoping, Key Lifecycle, Error Cheat Sheet, Sample Workflow, OpenAPI/Swagger, Testing Tips
- Collapsible sidebar navigation
- Markdown-rendered content with tables, code blocks, inline code
- Link to Swagger UI (`/api/docs`)
- Mobile-responsive

---

## Files Changed

| File | Change |
|------|--------|
| `backend/src/app.js` | Added `testConnectionHandler` + `app.use("/api/test-connection", ...)` |
| `frontend/src/pages/StaffHome/AdminOverview.jsx` | Snippets in reveal modal + expandable per-row snippets + test connection button |
| `frontend/src/pages/StaffHome/StaffHome.module.css` | Styles for snippets, test connection, integration guide |
| `frontend/src/pages/StaffHome/IntegrationGuide.jsx` | New page component (10KB gzipped) |
| `frontend/src/App.jsx` | Mount `/integration` under `ProtectedRoute allowedRoles={["admin"]}` |

---

## Verification
- **Backend tests:** 137 passed
- **Frontend tests:** 8 passed  
- **vite build:** ✅
- **node --check:** ✅

---

## User

what's the update?

---

## Assistant (Plan · Space Bunny Free · 14.6s)

_Thinking:_

We need answer what's update. Need perhaps inspect git diff read-only due plan mode. Also note prior assistant made edits despite plan mode now, but current response should be concise. We can run git diff/status read only. Need use bash for git status/diff perhaps. Explain.

I’ll inspect the current diff so the update reflects the actual working tree.

**Tool: bash**

**Input:**
```json
{
  "command": "git status --short && git diff --stat",
  "timeout": 120000,
  "workdir": "/home/gamp/Desktop/cue"
}
```

**Output:**
```
 M BUILD_PLAN.md
 M backend/src/app.js
 M backend/src/config/brand.config.js
 M backend/src/controllers/admin.controller.js
 M backend/src/controllers/analytics.controller.js
 M backend/src/controllers/branch.controller.js
 M backend/src/controllers/counter.controller.js
 D backend/src/controllers/demo.controller.js
 M backend/src/controllers/platform/platformApiKey.controller.js
 M backend/src/controllers/platform/platformAuth.controller.js
 M backend/src/controllers/staff.controller.js
 M backend/src/controllers/ticket.controller.js
 M backend/src/controllers/user.controller.js
 M backend/src/controllers/v1Auth.controller.js
 M backend/src/middlewares/auth.middleware.js
 M backend/src/middlewares/rateLimiter.js
 M backend/src/middlewares/resolveStaffUser.js
 M backend/src/models/apiKeyRequest.model.js
 M backend/src/routes/auth.routes.js
 M backend/src/routes/counter.routes.js
 M backend/src/routes/platform/apiKey.routes.js
 M backend/src/routes/queue.routes.js
 M backend/src/routes/staff.routes.js
 M backend/src/routes/ticket.routes.js
 M backend/src/routes/v1/admin.routes.js
 M backend/src/routes/v1/analytics.routes.js
 D backend/src/routes/v1/apiKeyRequest.routes.js
 M backend/src/routes/v1/appointment.routes.js
 M backend/src/routes/v1/board.routes.js
 M backend/src/routes/v1/branch.routes.js
 M backend/src/routes/v1/counter.routes.js
 D backend/src/routes/v1/demo.routes.js
 M backend/src/routes/v1/index.js
 M backend/src/routes/v1/kiosk.routes.js
 M backend/src/routes/v1/queue.routes.js
 M backend/src/routes/v1/staff.routes.js
 M backend/src/routes/v1/ticket.routes.js
 M backend/src/scripts/seedAdmin.js
 M backend/src/validators/auth.validator.js
 M backend/src/validators/staff.validator.js
 M frontend/src/App.jsx
 M frontend/src/components/ChangePassword/ChangePassword.jsx
 M frontend/src/components/Navbar/Navbar.jsx
 M frontend/src/features/auth/AuthContext.jsx
 M frontend/src/features/auth/ProtectedRoute.jsx
 M frontend/src/features/auth/authApi.js
 M frontend/src/features/staff/adminApi.js
 M frontend/src/features/staff/apiKeyRequestApi.js
 M frontend/src/features/staff/manageApi.js
 M frontend/src/features/staff/useCounterOperations.js
 M frontend/src/features/staff/useMyCounter.js
 M frontend/src/features/staff/useMyStats.js
 M frontend/src/features/staff/useTicketHistory.js
 M frontend/src/features/tickets/ticketsApi.js
 M frontend/src/features/tickets/useMyTicket.js
 M frontend/src/pages/Platform/PlatformLogin.jsx
 M frontend/src/pages/StaffHome/AdminOverview.jsx
 M frontend/src/pages/StaffHome/CounterConsole.jsx
 M frontend/src/pages/StaffHome/CounterSubTab.jsx
 M frontend/src/pages/StaffHome/ManagePanel.jsx
 M frontend/src/pages/StaffHome/ManagerOverview.jsx
 M frontend/src/pages/StaffHome/StaffHome.jsx
 M frontend/src/pages/StaffHome/StaffHome.module.css
 M frontend/src/pages/StaffHome/StaffSubTab.jsx
 M frontend/src/pages/StaffHome/TicketHistory.jsx
 M frontend/src/pages/TicketPage/TicketForm.jsx
 M frontend/src/pages/TicketPage/TicketPage.jsx
 M frontend/src/pages/TicketPage/TicketStatus.jsx
?? backend/src/controllers/auth.controller.js
?? backend/src/controllers/manager.controller.js
?? backend/src/models/invite.model.js
?? backend/src/routes/admin.overview.routes.js
?? backend/src/routes/adminApiKeyRequest.routes.js
?? backend/src/routes/manager.routes.js
?? backend/src/routes/test-connection.routes.js
?? backend/src/utils/password.js
?? backend/src/validators/manager.validator.js
?? backend/tests/middlewares/requireStaffServing.test.js
?? backend/tests/models/invite.model.test.js
?? backend/tests/platform/
?? backend/tests/validators/
?? frontend/src/pages/Login/
?? frontend/src/pages/StaffHome/IntegrationGuide.jsx
?? frontend/src/pages/StaffHome/ManagerSubTab.jsx
 BUILD_PLAN.md                                      |  72 ++++-
 backend/src/app.js                                 |  43 ++-
 backend/src/config/brand.config.js                 |   2 +-
 backend/src/controllers/admin.controller.js        |  54 ++--
 backend/src/controllers/analytics.controller.js    |   9 +-
 backend/src/controllers/branch.controller.js       |  35 ++-
 backend/src/controllers/counter.controller.js      |  13 +-
 backend/src/controllers/demo.controller.js         |  37 ---
 .../platform/platformApiKey.controller.js          |  13 +-
 .../platform/platformAuth.controller.js            |   6 +-
 backend/src/controllers/staff.controller.js        | 258 +++++++++++++---
 backend/src/controllers/ticket.controller.js       |  36 +++
 backend/src/controllers/user.controller.js         |  12 +-
 backend/src/controllers/v1Auth.controller.js       |   2 +-
 backend/src/middlewares/auth.middleware.js         |  28 ++
 backend/src/middlewares/rateLimiter.js             |  12 +
 backend/src/middlewares/resolveStaffUser.js        |   2 +-
 backend/src/models/apiKeyRequest.model.js          |   4 +-
 backend/src/routes/auth.routes.js                  | 125 +++++++-
 backend/src/routes/counter.routes.js               |   2 +-
 backend/src/routes/platform/apiKey.routes.js       |   3 +-
 backend/src/routes/queue.routes.js                 |   6 +
 backend/src/routes/staff.routes.js                 |   3 +
 backend/src/routes/ticket.routes.js                |  50 ++-
 backend/src/routes/v1/admin.routes.js              |  16 +-
 backend/src/routes/v1/analytics.routes.js          |  16 +-
 backend/src/routes/v1/apiKeyRequest.routes.js      | 280 -----------------
 backend/src/routes/v1/appointment.routes.js        |  33 +-
 backend/src/routes/v1/board.routes.js              |  18 +-
 backend/src/routes/v1/branch.routes.js             |  38 ++-
 backend/src/routes/v1/counter.routes.js            |  44 ++-
 backend/src/routes/v1/demo.routes.js               |  15 -
 backend/src/routes/v1/index.js                     |   6 +-
 backend/src/routes/v1/kiosk.routes.js              |  33 +-
 backend/src/routes/v1/queue.routes.js              |  33 +-
 backend/src/routes/v1/staff.routes.js              |  39 ++-
 backend/src/routes/v1/ticket.routes.js             | 126 +++++---
 backend/src/scripts/seedAdmin.js                   |   4 +-
 backend/src/validators/auth.validator.js           | 118 ++++++-
 backend/src/validators/staff.validator.js          |  13 +-
 frontend/src/App.jsx                               |  22 +-
 .../components/ChangePassword/ChangePassword.jsx   |   4 +-
 frontend/src/components/Navbar/Navbar.jsx          | 123 ++------
 frontend/src/features/auth/AuthContext.jsx         | 232 +++++++-------
 frontend/src/features/auth/ProtectedRoute.jsx      |  23 +-
 frontend/src/features/auth/authApi.js              |  29 +-
 frontend/src/features/staff/adminApi.js            |  31 +-
 frontend/src/features/staff/apiKeyRequestApi.js    |  30 +-
 frontend/src/features/staff/manageApi.js           |  70 +++--
 .../src/features/staff/useCounterOperations.js     |  20 +-
 frontend/src/features/staff/useMyCounter.js        |  25 +-
 frontend/src/features/staff/useMyStats.js          |  14 +-
 frontend/src/features/staff/useTicketHistory.js    |  24 +-
 frontend/src/features/tickets/ticketsApi.js        |  15 +-
 frontend/src/features/tickets/useMyTicket.js       |  38 ++-
 frontend/src/pages/Platform/PlatformLogin.jsx      |   7 +-
 frontend/src/pages/StaffHome/AdminOverview.jsx     | 278 +++++++++++++----
 frontend/src/pages/StaffHome/CounterConsole.jsx    |  20 +-
 frontend/src/pages/StaffHome/CounterSubTab.jsx     |  21 +-
 frontend/src/pages/StaffHome/ManagePanel.jsx       |  12 +-
 frontend/src/pages/StaffHome/ManagerOverview.jsx   |  10 +-
 frontend/src/pages/StaffHome/StaffHome.jsx         |  31 ++
 frontend/src/pages/StaffHome/StaffHome.module.css  | 340 +++++++++++++++++++++
 frontend/src/pages/StaffHome/StaffSubTab.jsx       |  78 ++++-
 frontend/src/pages/StaffHome/TicketHistory.jsx     |   5 +-
 frontend/src/pages/TicketPage/TicketForm.jsx       |   6 +-
 frontend/src/pages/TicketPage/TicketPage.jsx       |   6 +-
 frontend/src/pages/TicketPage/TicketStatus.jsx     |   3 +-
 68 files changed, 2148 insertions(+), 1028 deletions(-)

```

**Tool: bash**

**Input:**
```json
{
  "command": "git diff -- backend/src/app.js frontend/src/App.jsx",
  "timeout": 120000,
  "workdir": "/home/gamp/Desktop/cue"
}
```

**Output:**
```
diff --git a/backend/src/app.js b/backend/src/app.js
index de0c30d..fabed38 100644
--- a/backend/src/app.js
+++ b/backend/src/app.js
@@ -20,7 +20,9 @@ import exportRouter from "./routes/export.routes.js";
 import advancedAnalyticsRouter from "./routes/advancedAnalytics.routes.js";
 import brandRouter from "./routes/brand.routes.js";
 import platformRouter from "./routes/platform/index.js";
-import demoRouter from "./routes/v1/demo.routes.js";
+import managerRouter from "./routes/manager.routes.js";
+import adminOverviewRouter from "./routes/admin.overview.routes.js";
+import adminKeyRequestRouter from "./routes/adminApiKeyRequest.routes.js";
 import v1Router from "./routes/v1/index.js";
 import { authenticateApiKey, apiKeyRateLimit } from "./middlewares/apiKey.middleware.js";
 import { tenantMatch } from "./middlewares/tenantMatch.js";
@@ -49,6 +51,35 @@ app.use(
   }),
 );
 
+// ── Test connection — validate an API key (no rate limit, no bank scoping)
+const testConnectionHandler = async (req, res) => {
+  try {
+    // authenticateApiKey already attached req.apiKey and either resolved
+    // the key (200) or sent 401/403. If we reach here the key is valid.
+    const key = req.apiKey;
+    return res.json({
+      statusCode: 200,
+      message: "API key is valid",
+      data: {
+        bankName: key.bankName,
+        keyPrefix: key.keyPrefix,
+        scopes: key.scopes,
+        rateLimit: key.rateLimit,
+        isActive: key.isActive,
+        createdAt: key.createdAt,
+      },
+    });
+  } catch (error) {
+    // authenticateApiKey sends its own error; this is a safety net.
+    return res.status(500).json({
+      statusCode: 500,
+      message: "Internal error during key validation",
+    });
+  }
+};
+
+app.use("/api/test-connection", authenticateApiKey, testConnectionHandler);
+
 // Body parser middleware
 app.use(express.json({ limit: "1mb" }));
 app.use(express.urlencoded({ extended: true, limit: "1mb" }));
@@ -72,6 +103,13 @@ app.use("/api/auth", auth_router);
 app.use("/api/branches/", branch_router);
 app.use("/api/users", userRouter);
 app.use("/api/staff", staff_router);
+// Manager provisioning (Phase 13 WP4) — JWT admin only, bank-scoped in controller.
+app.use("/api/managers", managerRouter);
+// JWT admin overview (Phase 13 WP6) — dashboard reads Admin.bank, not API key.
+app.use("/api/admin", adminOverviewRouter);
+// Bank-admin API key requests via JWT (Phase 13 WP4) — parallel to the
+// legacy v1 API-key version until WP6 migrates the dashboard fully.
+app.use("/api/admin/api-key-requests", adminKeyRequestRouter);
 app.use("/api/queues", queue_router);
 app.use("/api/counters", counter_router);
 app.use("/api/tickets", ticketRouter);
@@ -100,8 +138,7 @@ import { resolveStaffUser } from "./middlewares/resolveStaffUser.js";
 // Mounted BEFORE the v1 API-key pipeline so JWT auth is independent.
 app.use("/api/platform", platformRouter);
 
-// Demo helper routes (no auth required)
-app.use("/api/v1/demo", demoRouter);
+// Demo helper routes removed (Phase 13 WP7) — dashboard is JWT-only.
 
 // V1 public routes — guest ticket flow (no auth required)
 import publicV1Router from "./routes/v1/public.routes.js";
diff --git a/frontend/src/App.jsx b/frontend/src/App.jsx
index 3e0f837..f77f957 100644
--- a/frontend/src/App.jsx
+++ b/frontend/src/App.jsx
@@ -1,5 +1,5 @@
 import { lazy, Suspense } from "react";
-import { Routes, Route } from "react-router-dom";
+import { Routes, Route, Navigate } from "react-router-dom";
 import { AuthProvider } from "./features/auth/AuthContext";
 import { ThemeProvider } from "./features/theme/ThemeContext";
 import { BrandProvider } from "./features/brand/BrandContext";
@@ -11,6 +11,7 @@ import Footer from "./components/Footer/Footer";
 const Landing = lazy(() => import("./pages/Landing/Landing"));
 const Contact = lazy(() => import("./pages/Contact/Contact"));
 const StaffHome = lazy(() => import("./pages/StaffHome/StaffHome"));
+const LoginPage = lazy(() => import("./pages/Login/LoginPage"));
 const PlatformLogin = lazy(() => import("./pages/Platform/PlatformLogin"));
 const PlatformDashboard = lazy(() => import("./pages/Platform/PlatformDashboard"));
 const Board = lazy(() => import("./pages/Board/Board"));
@@ -21,6 +22,7 @@ const NearestBranch = lazy(() => import("./pages/NearestBranch/NearestBranch"));
 const Branch = lazy(() => import("./pages/Branch/Branch"));
 const TicketPage = lazy(() => import("./pages/TicketPage/TicketPage"));
 const NotFound = lazy(() => import("./pages/NotFound/NotFound"));
+const IntegrationGuide = lazy(() => import("./pages/StaffHome/IntegrationGuide"));
 
 const PageSpinner = () => (
   <div
@@ -97,6 +99,24 @@ function App() {
             </ProtectedRoute>
           }
         />
+        <Route
+          path="/integration"
+          element={
+            <ProtectedRoute allowedRoles={["admin"]}>
+              <>
+                <Navbar />
+                <IntegrationGuide />
+                <Footer />
+              </>
+            </ProtectedRoute>
+          }
+        />
+        {/* Bank JWT logins — Phase 13 WP7 (one page per kind) */}
+        <Route
+          path="/login"
+          element={<Navigate to="/login/staff" replace />}
+        />
+        <Route path="/login/:kind" element={<LoginPage />} />
         {/* Superadmin platform console — JWT login only, not bank-scoped */}
         <Route
           path="/platform/login"

```

---

## Assistant (Plan · Space Bunny Free · 9.7s)

_Thinking:_

Need answer update perhaps mention actual work and caveat. Since user asks what's update likely expects summary. We can say currently working tree has all Phase 13 + new interface. Also note test-connection standalone route was implemented in app.js, but earlier created unused `backend/src/routes/test-connection.routes.js` exists; app.js has inline handler. This is a discrepancy. Need mention no commits. Also current plan mode? User asks info, no edit. We can answer concise under 4 lines maybe a bit more. Need perhaps mention last verification from prior, but since current context can trust. Also note there are 68 modified + untracked, broad uncommitted changes. "What's the update?" likely asks status. We can say:

- Phase 13 WP1-WP8 complete uncommitted, including auth split, provisioning, dashboard JWT, v1 API key, fixes.
- New requested interfaces implemented: /api/test-connection, snippets in AdminOverview reveal/status, /integration guide admin-only.
- Verification: 137 backend, 8 frontend, build pass.
- Important: everything is uncommitted; `test-connection.routes.js` was created but app uses inline handler (cleanup before finalizing). Maybe don't overcomplicate. But honest update should include discrepancy. Also plan mode system says no modifications, but no need. We can mention "one cleanup remains". Need no more than 4 lines.

- Phase 13 WP1–WP8 is complete: four-role auth, provisioning, JWT dashboard, API-key v1, and key reveal/status fixes.
- Added test connection, integration snippets, and admin-only `/integration` guide.
- Verification passes: **137 backend tests**, **8 frontend tests**, production build successful.
- All changes remain **uncommitted**; one cleanup remains: `test-connection.routes.js` was created but the handler is currently inline in `app.js`.

---

## User

list out all the frontend pages and what they are for

---

## Assistant (Plan · Space Bunny Free · 8.4s)

_Thinking:_

We need answer list all frontend pages and purpose. Need inspect files. Use glob/read App and pages. We have previous glob list. Need all frontend pages perhaps directory tree. Use glob patterns.

I’ll inventory the frontend routes and page files, then map each to its purpose.

**Tool: glob**

**Input:**
```json
{
  "pattern": "frontend/src/pages/**/*.{js,jsx}",
  "path": "/home/gamp/Desktop/cue"
}
```

**Output:**
```
/home/gamp/Desktop/cue/frontend/src/pages/Contact/Contact.jsx
/home/gamp/Desktop/cue/frontend/src/pages/TicketPage/TicketForm.jsx
/home/gamp/Desktop/cue/frontend/src/pages/TicketPage/TicketPage.jsx
/home/gamp/Desktop/cue/frontend/src/pages/TicketPage/TicketStatus.jsx
/home/gamp/Desktop/cue/frontend/src/pages/Landing/Landing.jsx
/home/gamp/Desktop/cue/frontend/src/pages/Board/NowServingCard.jsx
/home/gamp/Desktop/cue/frontend/src/pages/Board/Board.jsx
/home/gamp/Desktop/cue/frontend/src/pages/Kiosk/Kiosk.jsx
/home/gamp/Desktop/cue/frontend/src/pages/Boards/Boards.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/TicketHistory.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffSubTab.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerSubTab.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/IntegrationGuide.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/CounterConsole.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagePanel.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/ManagerOverview.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/CounterSubTab.jsx
/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/AdminOverview.jsx
/home/gamp/Desktop/cue/frontend/src/pages/Login/LoginPage.jsx
/home/gamp/Desktop/cue/frontend/src/pages/NearestBranch/NearestBranch.jsx
/home/gamp/Desktop/cue/frontend/src/pages/Branch/Branch.jsx
/home/gamp/Desktop/cue/frontend/src/pages/Platform/PlatformDashboard.jsx
/home/gamp/Desktop/cue/frontend/src/pages/Platform/PlatformLogin.jsx
/home/gamp/Desktop/cue/frontend/src/pages/NotFound/VoidBackground.jsx
/home/gamp/Desktop/cue/frontend/src/pages/NotFound/VoidTicketSVG.jsx
/home/gamp/Desktop/cue/frontend/src/pages/NotFound/TiltCard.jsx
/home/gamp/Desktop/cue/frontend/src/pages/NotFound/NotFound.jsx
/home/gamp/Desktop/cue/frontend/src/pages/NotFound/MagneticButton.jsx
/home/gamp/Desktop/cue/frontend/src/pages/Appointment/Appointment.jsx
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/App.jsx",
  "offset": 1,
  "limit": 220
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/App.jsx</path>
<type>file</type>
<content>
1: import { lazy, Suspense } from "react";
2: import { Routes, Route, Navigate } from "react-router-dom";
3: import { AuthProvider } from "./features/auth/AuthContext";
4: import { ThemeProvider } from "./features/theme/ThemeContext";
5: import { BrandProvider } from "./features/brand/BrandContext";
6: import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
7: import ProtectedRoute from "./features/auth/ProtectedRoute";
8: import Navbar from "./components/Navbar/Navbar";
9: import Footer from "./components/Footer/Footer";
10: 
11: const Landing = lazy(() => import("./pages/Landing/Landing"));
12: const Contact = lazy(() => import("./pages/Contact/Contact"));
13: const StaffHome = lazy(() => import("./pages/StaffHome/StaffHome"));
14: const LoginPage = lazy(() => import("./pages/Login/LoginPage"));
15: const PlatformLogin = lazy(() => import("./pages/Platform/PlatformLogin"));
16: const PlatformDashboard = lazy(() => import("./pages/Platform/PlatformDashboard"));
17: const Board = lazy(() => import("./pages/Board/Board"));
18: const Boards = lazy(() => import("./pages/Boards/Boards"));
19: const Kiosk = lazy(() => import("./pages/Kiosk/Kiosk"));
20: const Appointment = lazy(() => import("./pages/Appointment/Appointment"));
21: const NearestBranch = lazy(() => import("./pages/NearestBranch/NearestBranch"));
22: const Branch = lazy(() => import("./pages/Branch/Branch"));
23: const TicketPage = lazy(() => import("./pages/TicketPage/TicketPage"));
24: const NotFound = lazy(() => import("./pages/NotFound/NotFound"));
25: const IntegrationGuide = lazy(() => import("./pages/StaffHome/IntegrationGuide"));
26: 
27: const PageSpinner = () => (
28:   <div
29:     style={{
30:       minHeight: "60vh",
31:       display: "flex",
32:       alignItems: "center",
33:       justifyContent: "center",
34:       fontFamily: "var(--font-body, system-ui, sans-serif)",
35:       color: "var(--text-muted, #666)",
36:     }}
37:   >
38:     Loading…
39:   </div>
40: );
41: 
42: function App() {
43:   return (
44:     <BrandProvider>
45:     <ThemeProvider>
46:     <AuthProvider>
47:       <ErrorBoundary>
48:       <Suspense fallback={<PageSpinner />}>
49:       <Routes>
50:         <Route
51:           path="/"
52:           element={
53:             <>
54:               <Navbar />
55:               <Landing />
56:               <Footer />
57:             </>
58:           }
59:         />
60:         <Route
61:           path="/contact"
62:           element={
63:             <>
64:               <Navbar />
65:               <Contact />
66:               <Footer />
67:             </>
68:           }
69:         />
70:         <Route
71:           path="/ticket"
72:           element={
73:             <>
74:               <Navbar />
75:               <TicketPage />
76:               <Footer />
77:             </>
78:           }
79:         />
80:         <Route
81:           path="/ticket/:ticketId"
82:           element={
83:             <>
84:               <Navbar />
85:               <TicketPage />
86:               <Footer />
87:             </>
88:           }
89:         />
90:         <Route
91:           path="/staff"
92:           element={
93:             <ProtectedRoute allowedRoles={["staff", "manager", "admin"]}>
94:               <>
95:                 <Navbar />
96:                 <StaffHome />
97:                 <Footer />
98:               </>
99:             </ProtectedRoute>
100:           }
101:         />
102:         <Route
103:           path="/integration"
104:           element={
105:             <ProtectedRoute allowedRoles={["admin"]}>
106:               <>
107:                 <Navbar />
108:                 <IntegrationGuide />
109:                 <Footer />
110:               </>
111:             </ProtectedRoute>
112:           }
113:         />
114:         {/* Bank JWT logins — Phase 13 WP7 (one page per kind) */}
115:         <Route
116:           path="/login"
117:           element={<Navigate to="/login/staff" replace />}
118:         />
119:         <Route path="/login/:kind" element={<LoginPage />} />
120:         {/* Superadmin platform console — JWT login only, not bank-scoped */}
121:         <Route
122:           path="/platform/login"
123:           element={
124:             <>
125:               <Navbar />
126:               <PlatformLogin />
127:             </>
128:           }
129:         />
130:         <Route
131:           path="/platform"
132:           element={
133:             <ProtectedRoute allowedRoles={["superadmin"]}>
134:               <PlatformDashboard />
135:             </ProtectedRoute>
136:           }
137:         />
138:         <Route path="/boards" element={<Boards />} />
139:         <Route path="/board/:branchId" element={<Board />} />
140:         <Route path="/kiosk/:branchId" element={<Kiosk />} />
141:         <Route path="/appointment/:branchId" element={<Appointment />} />
142:         <Route path="/find-nearby" element={<NearestBranch />} />
143:         <Route
144:           path="/branch/:branchId"
145:           element={
146:             <>
147:               <Navbar />
148:               <Branch />
149:               <Footer />
150:             </>
151:           }
152:         />
153:         <Route path="*" element={<NotFound />} />
154:       </Routes>
155:       </Suspense>
156:       </ErrorBoundary>
157:     </AuthProvider>
158:     </ThemeProvider>
159:     </BrandProvider>
160:   );
161: }
162: 
163: export default App;

(End of file - total 163 lines)
</content>
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "frontend/src/features/**/*.{js,jsx}",
  "path": "/home/gamp/Desktop/cue"
}
```

**Output:**
```
/home/gamp/Desktop/cue/frontend/src/features/board/useBranchBoard.js
/home/gamp/Desktop/cue/frontend/src/features/brand/BrandContext.jsx
/home/gamp/Desktop/cue/frontend/src/features/kiosk/kioskApi.js
/home/gamp/Desktop/cue/frontend/src/features/auth/ProtectedRoute.jsx
/home/gamp/Desktop/cue/frontend/src/features/auth/AuthContext.jsx
/home/gamp/Desktop/cue/frontend/src/features/auth/authApi.js
/home/gamp/Desktop/cue/frontend/src/features/platform/platformApi.js
/home/gamp/Desktop/cue/frontend/src/features/theme/ThemeContext.jsx
/home/gamp/Desktop/cue/frontend/src/features/branch/nearestApi.js
/home/gamp/Desktop/cue/frontend/src/features/appointment/appointmentApi.js
/home/gamp/Desktop/cue/frontend/src/features/staff/apiKeyRequestApi.js
/home/gamp/Desktop/cue/frontend/src/features/staff/useMyCounter.js
/home/gamp/Desktop/cue/frontend/src/features/staff/useTicketHistory.js
/home/gamp/Desktop/cue/frontend/src/features/staff/manageApi.js
/home/gamp/Desktop/cue/frontend/src/features/staff/useCounterOperations.js
/home/gamp/Desktop/cue/frontend/src/features/staff/useMyStats.js
/home/gamp/Desktop/cue/frontend/src/features/staff/adminApi.js
/home/gamp/Desktop/cue/frontend/src/features/tickets/useMyTicket.js
/home/gamp/Desktop/cue/frontend/src/features/tickets/ticketsApi.js
```

---

## Assistant (Plan · Space Bunny Free · 8.4s)

_Thinking:_

Need list all pages and what for. We can group route pages and internal page components, perhaps exact routes. Need inspect key files maybe not necessary but to accurately say. Read page headers maybe parallel.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.jsx",
  "limit": 180
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/StaffHome/StaffHome.jsx</path>
<type>file</type>
<content>
1: import { useState } from "react";
2: import { Link } from "react-router-dom";
3: import { motion } from "framer-motion";
4: import { useAuth } from "../../features/auth/AuthContext";
5: import { useBrand } from "../../features/brand/BrandContext";
6: import { useMyCounter } from "../../features/staff/useMyCounter";
7: import { useMyStats } from "../../features/staff/useMyStats";
8: import ChangePassword from "../../components/ChangePassword/ChangePassword";
9: import CounterConsole from "./CounterConsole";
10: import TicketHistory from "./TicketHistory";
11: import ManagePanel from "./ManagePanel";
12: import AdminOverview from "./AdminOverview";
13: import ManagerOverview from "./ManagerOverview";
14: import MotionBackground from "../../components/MotionBackground/MotionBackground";
15: import logoUrl from "../../assets/logo.svg";
16: import styles from "./StaffHome.module.css";
17: 
18: const fadeUp = {
19:   hidden: { opacity: 0, y: 20 },
20:   visible: (i = 0) => ({
21:     opacity: 1,
22:     y: 0,
23:     transition: { duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
24:   }),
25: };
26: 
27: const StaffHome = () => {
28:   const { auth, logout } = useAuth();
29:   const { brand } = useBrand();
30:   const counterState = useMyCounter();
31:   const { stats, refetch: refetchStats } = useMyStats();
32: 
33:   const isAdmin = auth.role === "admin";
34:   const isManager = auth.role === "manager";
35: 
36:   // Admin: Overview (cross-branch) + Branches/Staff management
37:   // Manager: Overview (branch analytics) + Staff + Counters — NO counter console
38:   // Staff: Console + History
39:   const topTabs = isAdmin
40:     ? [
41:         { id: "overview", label: "Overview" },
42:         { id: "manage", label: "Manage" },
43:       ]
44:     : isManager
45:       ? [
46:           { id: "overview", label: "Overview" },
47:           { id: "manage", label: "Manage" },
48:         ]
49:       : [
50:           { id: "console", label: "Console" },
51:           { id: "history", label: "History" },
52:         ];
53: 
54:   // Hooks always run — early return only affects render output.
55:   const [activeTab, setActiveTab] = useState(topTabs[0].id);
56: 
57:   // Temp-password / invite-created accounts must rotate on first login.
58:   if (auth.mustChangePassword) {
59:     return (
60:       <section className={styles.page}>
61:         <MotionBackground />
62:         <div className={styles.container}>
63:           <div className={styles.logoHeader}>
64:             <img src={logoUrl} alt="" />
65:             <span>{brand.name}</span>
66:           </div>
67:           <motion.p className={styles.eyebrow} custom={0} variants={fadeUp}>
68:             № 010 — first sign-in
69:           </motion.p>
70:           <motion.h1 className={styles.heading} custom={1} variants={fadeUp}>
71:             Set a new password, {auth.name?.split(" ")[0]}.
72:           </motion.h1>
73:           <p style={{ color: "var(--text-muted, #6b7280)", marginBottom: "1.25rem" }}>
74:             Your temporary password must be changed before you can use the
75:             console.
76:           </p>
77:           <ChangePassword />
78:           <button className={styles.logoutBtn} onClick={logout} style={{ marginTop: "1rem" }}>
79:             Sign out
80:           </button>
81:         </div>
82:       </section>
83:     );
84:   }
85: 
86:   return (
87:     <section className={styles.page}>
88:       <MotionBackground />
89:       <div className={styles.container}>
90:         <div className={styles.logoHeader}>
91:           <img src={logoUrl} alt="" />
92:           <span>{brand.name}</span>
93:         </div>
94:         <motion.div
95:           className={styles.headerRow}
96:           initial="hidden"
97:           animate="visible"
98:         >
99:           <div>
100:             <motion.p className={styles.eyebrow} custom={0} variants={fadeUp}>
101:               № 010 — staff console
102:             </motion.p>
103:             <motion.h1 className={styles.heading} custom={1} variants={fadeUp}>
104:               Signed in, {auth.name.split(" ")[0]}.
105:             </motion.h1>
106:           </div>
107:           <motion.div
108:             className={styles.headerActions}
109:             custom={2}
110:             variants={fadeUp}
111:           >
112:             {auth.branch && (
113:               <Link
114:                 to={`/board/${auth.branch}`}
115:                 className={styles.boardLink}
116:                 target="_blank"
117:                 rel="noopener noreferrer"
118:               >
119:                 Live Board
120:               </Link>
121:             )}
122:             <button className={styles.logoutBtn} onClick={logout}>
123:               Sign out
124:             </button>
125:           </motion.div>
126:         </motion.div>
127: 
128:         {/* ── Top-level tabs ────────────────────────── */}
129:         {topTabs.length > 1 && (
130:           <div className={styles.topTabs} role="tablist">
131:             {topTabs.map((tab) => (
132:               <button
133:                 key={tab.id}
134:                 role="tab"
135:                 aria-selected={activeTab === tab.id}
136:                 className={
137:                   activeTab === tab.id ? styles.topTabActive : styles.topTab
138:                 }
139:                 onClick={() => setActiveTab(tab.id)}
140:               >
141:                 {tab.label}
142:               </button>
143:             ))}
144:           </div>
145:         )}
146: 
147:         {/* ── Overview tab (admin: cross-branch, manager: branch) ── */}
148:         {activeTab === "overview" && (
149:           <motion.div
150:             initial={{ opacity: 0, y: 20 }}
151:             animate={{ opacity: 1, y: 0 }}
152:             transition={{ duration: 0.5, delay: 0.3 }}
153:           >
154:             {isAdmin ? <AdminOverview /> : <ManagerOverview />}
155:           </motion.div>
156:         )}
157: 
158:         {/* ── Console tab (staff only) ──────────────── */}
159:         {activeTab === "console" && (
160:           <>
161:             <motion.div
162:               className={styles.statRow}
163:               initial={{ opacity: 0, y: 16 }}
164:               animate={{ opacity: 1, y: 0 }}
165:               transition={{ duration: 0.5, delay: 0.3 }}
166:             >
167:               <div className={styles.statCard}>
168:                 <span className={styles.statValue}>
169:                   {stats?.ticketsServedToday ?? "—"}
170:                 </span>
171:                 <span className={styles.statLabel}>served today</span>
172:               </div>
173:             </motion.div>
174: 
175:             <motion.div
176:               initial={{ opacity: 0, y: 20 }}
177:               animate={{ opacity: 1, y: 0 }}
178:               transition={{ duration: 0.5, delay: 0.4 }}
179:             >
180:               <CounterConsole counterState={counterState} onServed={refetchStats} />

(Showing lines 1-180 of 211. Use offset=181 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/Boards/Boards.jsx",
  "limit": 80
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/Boards/Boards.jsx</path>
<type>file</type>
<content>
1: import { useCallback, useEffect, useRef, useState } from "react";
2: import { Link } from "react-router-dom";
3: import { motion, AnimatePresence } from "framer-motion";
4: import { io } from "socket.io-client";
5: import { apiClient } from "../../lib/apiClient";
6: import { useBrand } from "../../features/brand/BrandContext";
7: import logoUrl from "../../assets/logo.svg";
8: import styles from "./Boards.module.css";
9: 
10: const API_URL =
11:   import.meta.env.VITE_API_URL || "http://localhost:3000/api";
12: const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");
13: 
14: const REFRESH_EVENTS = [
15:   "queue:updated",
16:   "ticket:called",
17:   "ticket:completed",
18:   "ticket:cancelled",
19: ];
20: 
21: const fadeUp = {
22:   hidden: { opacity: 0, y: 24 },
23:   visible: (i = 0) => ({
24:     opacity: 1,
25:     y: 0,
26:     transition: {
27:       duration: 0.55,
28:       delay: i * 0.08,
29:       ease: [0.16, 1, 0.3, 1],
30:     },
31:   }),
32: };
33: 
34: const Boards = () => {
35:   const { brand } = useBrand();
36:   const [boards, setBoards] = useState([]);
37:   const [loading, setLoading] = useState(true);
38:   const [error, setError] = useState(null);
39:   const [connected, setConnected] = useState(false);
40:   const [locationFilter, setLocationFilter] = useState("");
41:   const refetchTimer = useRef(null);
42:   const socketRef = useRef(null);
43: 
44:   const locations = [
45:     ...new Set(boards.map((b) => b.branch.location).filter(Boolean)),
46:   ].sort();
47: 
48:   const filteredBoards = locationFilter
49:     ? boards.filter((b) => b.branch.location === locationFilter)
50:     : boards;
51: 
52:   const fetchBoards = useCallback(async () => {
53:     try {
54:       const res = await apiClient.get("/board");
55:       setBoards(res.data);
56:       setError(null);
57:     } catch (err) {
58:       setError(err.message || "Couldn't load branches.");
59:     } finally {
60:       setLoading(false);
61:     }
62:   }, []);
63: 
64:   useEffect(() => {
65:     fetchBoards();
66: 
67:     const socket = io(SOCKET_URL, { transports: ["websocket"] });
68:     socketRef.current = socket;
69: 
70:     socket.on("connect", () => {
71:       setConnected(true);
72:     });
73:     socket.on("disconnect", () => setConnected(false));
74: 
75:     const scheduleRefetch = () => {
76:       clearTimeout(refetchTimer.current);
77:       refetchTimer.current = setTimeout(fetchBoards, 500);
78:     };
79:     REFRESH_EVENTS.forEach((event) => socket.on(event, scheduleRefetch));
80: 

(Showing lines 1-80 of 304. Use offset=81 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/Board/Board.jsx",
  "limit": 80
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/Board/Board.jsx</path>
<type>file</type>
<content>
1: import { useEffect, useRef, useState } from "react";
2: import { useParams, Link } from "react-router-dom";
3: import { motion, AnimatePresence } from "framer-motion";
4: import gsap from "gsap";
5: import { useBranchBoard } from "../../features/board/useBranchBoard";
6: import { useBrand } from "../../features/brand/BrandContext";
7: import NowServingCard from "./NowServingCard";
8: import logoUrl from "../../assets/logo.svg";
9: import styles from "./Board.module.css";
10: 
11: const useClock = () => {
12:   const [now, setNow] = useState(new Date());
13:   useEffect(() => {
14:     const id = setInterval(() => setNow(new Date()), 1000);
15:     return () => clearInterval(id);
16:   }, []);
17:   return now;
18: };
19: 
20: /* ── Continuous GSAP Animations ──────────────────── */
21: const useBoardAnimations = (board, dayStatus) => {
22:   const pageRef = useRef(null);
23:   const scanRef = useRef(null);
24:   const bannerRef = useRef(null);
25:   const cardsRef = useRef([]);
26:   const recentRef = useRef(null);
27:   const dayIndicatorRef = useRef(null);
28: 
29:   // Scan line — continuous horizontal sweep
30:   useEffect(() => {
31:     if (!scanRef.current) return;
32:     const ctx = gsap.context(() => {
33:       gsap.fromTo(
34:         scanRef.current,
35:         { x: "-100%", opacity: 0 },
36:         {
37:           x: "200%",
38:           opacity: [0, 0.6, 0.6, 0],
39:           duration: 4,
40:           repeat: -1,
41:           ease: "none",
42:           delay: 1,
43:         },
44:       );
45:     });
46:     return () => ctx.revert();
47:   }, []);
48: 
49:   // Banner breathing glow
50:   useEffect(() => {
51:     if (!bannerRef.current) return;
52:     const ctx = gsap.context(() => {
53:       gsap.to(bannerRef.current, {
54:         boxShadow: "0 0 40px 4px rgba(201, 162, 39, 0.12)",
55:         duration: 2.5,
56:         repeat: -1,
57:         yoyo: true,
58:         ease: "sine.inOut",
59:       });
60:     });
61:     return () => ctx.revert();
62:   }, []);
63: 
64:   // Cards floating — subtle continuous y movement
65:   useEffect(() => {
66:     const cards = cardsRef.current.filter(Boolean);
67:     if (!cards.length) return;
68:     const ctx = gsap.context(() => {
69:       cards.forEach((card, i) => {
70:         gsap.to(card, {
71:           y: -4,
72:           duration: 2.5 + i * 0.3,
73:           repeat: -1,
74:           yoyo: true,
75:           ease: "sine.inOut",
76:           delay: i * 0.2,
77:         });
78:       });
79:     });
80:     return () => ctx.revert();

(Showing lines 1-80 of 349. Use offset=81 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/TicketPage/TicketPage.jsx",
  "limit": 100
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/TicketPage/TicketPage.jsx</path>
<type>file</type>
<content>
1: import { useState, useEffect, useCallback } from "react";
2: import { useParams } from "react-router-dom";
3: import { motion } from "framer-motion";
4: import { useBrand } from "../../features/brand/BrandContext";
5: import TicketForm from "./TicketForm";
6: import TicketStatus from "./TicketStatus";
7: import logoUrl from "../../assets/logo.svg";
8: import styles from "./TicketPage.module.css";
9: 
10: const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
11: const TICKET_STORAGE_KEY = "cue_ticket";
12: 
13: const TicketPage = () => {
14:   const { ticketId: urlTicketId } = useParams();
15:   const { brand } = useBrand();
16:   const [ticket, setTicket] = useState(null);
17:   const [loading, setLoading] = useState(true);
18:   const [error, setError] = useState(null);
19: 
20:   const fetchTicket = useCallback(async (id) => {
21:     setLoading(true);
22:     setError(null);
23:     try {
24:       // Public JWT route — guest lookup, no auth (WP6/WP7 moved off v1).
25:       const res = await fetch(`${API_URL}/tickets/public/${id}`);
26:       const data = await res.json();
27:       if (data.status === "success") {
28:         setTicket(data.data);
29:         const storeId = data.data.kioskId || data.data._id;
30:         localStorage.setItem(TICKET_STORAGE_KEY, storeId);
31:       } else {
32:         setError("Ticket not found");
33:         localStorage.removeItem(TICKET_STORAGE_KEY);
34:       }
35:     } catch {
36:       setError("Could not connect to server");
37:     } finally {
38:       setLoading(false);
39:     }
40:   }, []);
41: 
42:   useEffect(() => {
43:     const id = urlTicketId || localStorage.getItem(TICKET_STORAGE_KEY);
44:     if (id) {
45:       fetchTicket(id);
46:     } else {
47:       setLoading(false);
48:     }
49:   }, [urlTicketId, fetchTicket]);
50: 
51:   const handleCreated = (newTicket) => {
52:     setTicket(newTicket);
53:     const storeId =newTicket.ticketId;
54:     localStorage.setItem(TICKET_STORAGE_KEY, storeId);
55:   };
56: 
57:   const handleCancel = async () => {
58:     if (!ticket) return;
59:     try {
60:       // Public JWT cancel — same guest flow as create/status.
61:       await fetch(`${API_URL}/tickets/${ticket._id}/cancel`, {
62:         method: "PATCH",
63:       });
64:       localStorage.removeItem(TICKET_STORAGE_KEY);
65:       setTicket(null);
66:     } catch {
67:       // Silently fail — ticket may already be cancelled
68:     }
69:   };
70: 
71:   const handleNewTicket = () => {
72:     localStorage.removeItem(TICKET_STORAGE_KEY);
73:     setTicket(null);
74:   };
75: 
76:   return (
77:     <section className={styles.page}>
78:       <div className={styles.container}>
79:         <motion.div
80:           className={styles.logoHeader}
81:           initial={{ opacity: 0, y: -10 }}
82:           animate={{ opacity: 1, y: 0 }}
83:           transition={{ duration: 0.4 }}
84:         >
85:           <img src={logoUrl} alt="" />
86:           <span>{brand.name}</span>
87:         </motion.div>
88: 
89:         {loading && (
90:           <motion.p
91:             className={styles.status}
92:             initial={{ opacity: 0 }}
93:             animate={{ opacity: 1 }}
94:           >
95:             Loading…
96:           </motion.p>
97:         )}
98: 
99:         {error && !ticket && (
100:           <motion.div

(Showing lines 1-100 of 132. Use offset=101 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/Kiosk/Kiosk.jsx",
  "limit": 80
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/Kiosk/Kiosk.jsx</path>
<type>file</type>
<content>
1: import { useState, useEffect, useRef, useCallback } from "react";
2: import { useParams, Link } from "react-router-dom";
3: import { motion } from "framer-motion";
4: import { io } from "socket.io-client";
5: import { apiClient } from "../../lib/apiClient";
6: import { createKioskTicket, getKioskTicket, cancelKioskTicket } from "../../features/kiosk/kioskApi";
7: import styles from "./Kiosk.module.css";
8: 
9: const API_URL =
10:   import.meta.env.VITE_API_URL || "http://localhost:3000/api";
11: const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");
12: 
13: const TICKET_EVENTS = [
14:   "ticket:called",
15:   "ticket:completed",
16:   "ticket:skipped",
17:   "ticket:no-show",
18:   "ticket:cancelled",
19:   "queue:updated",
20: ];
21: 
22: const Kiosk = () => {
23:   const { branchId } = useParams();
24:   const [branch, setBranch] = useState(null);
25:   const [queues, setQueues] = useState([]);
26:   const [selectedQueue, setSelectedQueue] = useState("");
27:   const [guestName, setGuestName] = useState("");
28:   const [guestPhone, setGuestPhone] = useState("");
29:   const [step, setStep] = useState("pick"); // pick | ticket | error
30:   const [ticket, setTicket] = useState(null);
31:   const [loading, setLoading] = useState(false);
32:   const [error, setError] = useState(null);
33:   const refetchTimer = useRef(null);
34: 
35:   useEffect(() => {
36:     const load = async () => {
37:       try {
38:         const res = await apiClient.get(`/branches/public/${branchId}`);
39:         setBranch(res.data.branch);
40:         setQueues(res.data.queues);
41:       } catch {
42:         setError("Branch not found");
43:       }
44:     };
45:     load();
46:   }, [branchId]);
47: 
48:   const handleTrackKiosk = useCallback(async (kioskId) => {
49:     try {
50:       const res = await getKioskTicket(kioskId);
51:       setTicket(res.data);
52:       setStep("ticket");
53:     } catch {
54:       setError("Ticket not found");
55:     }
56:   }, []);
57: 
58:   useEffect(() => {
59:     if (step !== "ticket" || !ticket?.kioskId || !branchId) return;
60: 
61:     const socket = io(SOCKET_URL, { transports: ["websocket"] });
62:     socket.on("connect", () => {
63:       socket.emit("branch:join", branchId);
64:     });
65: 
66:     const scheduleRefetch = () => {
67:       clearTimeout(refetchTimer.current);
68:       refetchTimer.current = setTimeout(() => {
69:         handleTrackKiosk(ticket.kioskId);
70:       }, 400);
71:     };
72:     TICKET_EVENTS.forEach((event) => socket.on(event, scheduleRefetch));
73: 
74:     return () => {
75:       clearTimeout(refetchTimer.current);
76:       socket.disconnect();
77:     };
78:   }, [step, ticket?.kioskId, branchId, handleTrackKiosk]);
79: 
80:   const handleTakeTicket = async () => {

(Showing lines 1-80 of 246. Use offset=81 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/Appointment/Appointment.jsx",
  "limit": 80
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/Appointment/Appointment.jsx</path>
<type>file</type>
<content>
1: import { useState, useEffect, useRef, useCallback } from "react";
2: import { useParams, Link } from "react-router-dom";
3: import { motion } from "framer-motion";
4: import { io } from "socket.io-client";
5: import { apiClient } from "../../lib/apiClient";
6: import {
7:   getAvailableSlots,
8:   createAppointment,
9:   getAppointmentTicket,
10: } from "../../features/appointment/appointmentApi";
11: import styles from "./Appointment.module.css";
12: 
13: const API_URL =
14:   import.meta.env.VITE_API_URL || "http://localhost:3000/api";
15: const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");
16: 
17: const TICKET_EVENTS = [
18:   "ticket:called",
19:   "ticket:completed",
20:   "ticket:skipped",
21:   "ticket:no-show",
22:   "ticket:cancelled",
23:   "queue:updated",
24: ];
25: 
26: const Appointment = () => {
27:   const { branchId } = useParams();
28:   const [branch, setBranch] = useState(null);
29:   const [queues, setQueues] = useState([]);
30:   const [selectedQueue, setSelectedQueue] = useState("");
31:   const [selectedDate, setSelectedDate] = useState("");
32:   const [slots, setSlots] = useState([]);
33:   const [selectedSlot, setSelectedSlot] = useState("");
34:   const [guestName, setGuestName] = useState("");
35:   const [guestPhone, setGuestPhone] = useState("");
36:   const [step, setStep] = useState("form"); // form | confirm | booked | track
37:   const [booking, setBooking] = useState(null);
38:   const [loading, setLoading] = useState(false);
39:   const [slotsLoading, setSlotsLoading] = useState(false);
40:   const [error, setError] = useState(null);
41:   const [trackId, setTrackId] = useState("");
42:   const refetchTimer = useRef(null);
43: 
44:   useEffect(() => {
45:     const load = async () => {
46:       try {
47:         const res = await apiClient.get(`/branches/public/${branchId}`);
48:         setBranch(res.data.branch);
49:         setQueues(res.data.queues);
50:       } catch {
51:         setError("Branch not found");
52:       }
53:     };
54:     load();
55:   }, [branchId]);
56: 
57:   const handleTrack = useCallback(async (id) => {
58:     if (!id?.trim()) return;
59:     setLoading(true);
60:     setError(null);
61:     try {
62:       const res = await getAppointmentTicket(id.trim());
63:       setBooking(res.data);
64:       setStep("track");
65:     } catch {
66:       setError("Appointment not found");
67:     } finally {
68:       setLoading(false);
69:     }
70:   }, []);
71: 
72:   useEffect(() => {
73:     if ((step !== "booked" && step !== "track") || !booking?.kioskId || !branchId) return;
74: 
75:     const socket = io(SOCKET_URL, { transports: ["websocket"] });
76:     socket.on("connect", () => {
77:       socket.emit("branch:join", branchId);
78:     });
79: 
80:     const scheduleRefetch = () => {

(Showing lines 1-80 of 363. Use offset=81 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/Platform/PlatformDashboard.jsx",
  "limit": 80
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/Platform/PlatformDashboard.jsx</path>
<type>file</type>
<content>
1: import { useState, useEffect, useCallback } from "react";
2: import { Link, useNavigate } from "react-router-dom";
3: import { motion } from "framer-motion";
4: import { useAuth } from "../../features/auth/AuthContext";
5: import { useBrand } from "../../features/brand/BrandContext";
6: import { ApiError } from "../../lib/apiClient";
7: import {
8:   fetchPlatformOverview,
9:   fetchPlatformUsage,
10:   fetchPlatformApiKeys,
11:   createPlatformApiKey,
12:   revokePlatformApiKey,
13:   togglePlatformApiKey,
14:   rotatePlatformApiKey,
15:   fetchPlatformKeyRequests,
16:   reviewPlatformKeyRequest,
17: } from "../../features/platform/platformApi";
18: import MotionBackground from "../../components/MotionBackground/MotionBackground";
19: import logoUrl from "../../assets/logo.svg";
20: import styles from "./Platform.module.css";
21: 
22: /**
23:  * PlatformDashboard — superadmin console for API keys + usage monitoring.
24:  *
25:  * Tabs:
26:  * - Overview: key counts, pending requests, requests today / last 7 days, daily bars
27:  * - API Keys: table of all keys across banks + create / suspend / revoke / rotate
28:  * - Key Requests: pending bank-admin requests; approve shows raw key once, reject with note
29:  *
30:  * Superadmin JWT (auth.token) is used for every call — never an API key.
31:  */
32: const PlatformDashboard = () => {
33:   const { auth, logout } = useAuth();
34:   const { brand } = useBrand();
35:   const navigate = useNavigate();
36: 
37:   const [tab, setTab] = useState("overview");
38:   const [overview, setOverview] = useState(null);
39:   const [usage, setUsage] = useState(null);
40:   const [keys, setKeys] = useState(null);
41:   const [requests, setRequests] = useState(null);
42:   const [loading, setLoading] = useState(true);
43:   const [error, setError] = useState(null);
44: 
45:   // Transient raw-key display (create / rotate / approve) — shown once.
46:   const [rawKeyModal, setRawKeyModal] = useState(null);
47: 
48:   const token = auth?.token;
49: 
50:   const loadAll = useCallback(async () => {
51:     if (!token) return;
52:     setLoading(true);
53:     try {
54:       const [ov, us, ks, rq] = await Promise.all([
55:         fetchPlatformOverview(token),
56:         fetchPlatformUsage(token, 7),
57:         fetchPlatformApiKeys(token, { limit: 100 }),
58:         fetchPlatformKeyRequests(token, { limit: 100 }),
59:       ]);
60:       setOverview(ov.data);
61:       setUsage(us.data);
62:       setKeys(ks.data);
63:       setRequests(rq.data);
64:       setError(null);
65:     } catch (err) {
66:       setError(err.message || "Couldn't load platform data.");
67:     } finally {
68:       setLoading(false);
69:     }
70:   }, [token]);
71: 
72:   useEffect(() => {
73:     loadAll();
74:   }, [loadAll]);
75: 
76:   const handleLogout = () => {
77:     logout();
78:     navigate("/platform/login", { replace: true });
79:   };
80: 

(Showing lines 1-80 of 526. Use offset=81 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gamp/Desktop/cue/frontend/src/pages/Login/LoginPage.jsx",
  "limit": 80
}
```

**Output:**
```
<path>/home/gamp/Desktop/cue/frontend/src/pages/Login/LoginPage.jsx</path>
<type>file</type>
<content>
1: import { useState, useEffect } from "react";
2: import { motion } from "framer-motion";
3: import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
4: import { useAuth } from "../../features/auth/AuthContext";
5: import { useBrand } from "../../features/brand/BrandContext";
6: import { ApiError } from "../../lib/apiClient";
7: import MotionBackground from "../../components/MotionBackground/MotionBackground";
8: import logoUrl from "../../assets/logo.svg";
9: import styles from "./LoginPage.module.css";
10: 
11: /**
12:  * LoginPage — email/password JWT login for staff, manager, and admin.
13:  *
14:  * Routes:
15:  *   /login/staff
16:  *   /login/manager
17:  *   /login/admin
18:  *
19:  * Superadmin uses /platform/login (separate console).
20:  * After success, redirects to /staff (role-specific tabs render there).
21:  */
22: const VALID_KINDS = ["staff", "manager", "admin"];
23: const ROLE_META = {
24:   staff: {
25:     title: "Staff console.",
26:     eyebrow: "№ 010 — staff access",
27:     subhead: "Sign in to call tickets, manage your counter, and view history.",
28:     cta: "Sign in to console",
29:   },
30:   manager: {
31:     title: "Branch oversight.",
32:     eyebrow: "№ 011 — manager access",
33:     subhead:
34:       "Sign in to oversee your branch, manage staff and counters, and close the day.",
35:     cta: "Sign in as manager",
36:   },
37:   admin: {
38:     title: "Bank control.",
39:     eyebrow: "№ 012 — admin access",
40:     subhead:
41:       "Sign in to manage branches across your bank, review key requests, and provision teams.",
42:     cta: "Sign in as admin",
43:   },
44: };
45: 
46: const LoginPage = () => {
47:   const { kind } = useParams();
48:   const validKind = VALID_KINDS.includes(kind) ? kind : "staff";
49:   const meta = ROLE_META[validKind];
50:   const { brand } = useBrand();
51:   const { login, auth } = useAuth();
52:   const navigate = useNavigate();
53:   const location = useLocation();
54: 
55:   const [form, setForm] = useState({ email: "", password: "" });
56:   const [error, setError] = useState(null);
57:   const [submitting, setSubmitting] = useState(false);
58: 
59:   // Already signed in with a bank role → go to dashboard.
60:   useEffect(() => {
61:     if (auth?.token && auth.role && auth.role !== "superadmin") {
62:       navigate(location.state?.from || "/staff", { replace: true });
63:     }
64:   }, [auth?.token, auth?.role, navigate, location.state?.from]);
65: 
66:   const handleChange = (field) => (e) =>
67:     setForm((f) => ({ ...f, [field]: e.target.value }));
68: 
69:   const handleSubmit = async (e) => {
70:     e.preventDefault();
71:     setError(null);
72:     setSubmitting(true);
73:     try {
74:       const { path } = await login(validKind, form);
75:       navigate(location.state?.from || path, { replace: true });
76:     } catch (err) {
77:       setError(
78:         err instanceof ApiError
79:           ? err.errors?.join(", ") || err.message
80:           : "Something went wrong, try again.",

(Showing lines 1-80 of 175. Use offset=81 to continue.)
</content>
```

---

## Assistant (Plan · Space Bunny Free · 13.7s)

_Thinking:_

Need answer all frontend pages, likely 16 route pages and components. Could list with routes, purpose, access. Need mention internal subcomponents. We can compose detailed enough. Need distinguish route pages vs internal support pages. User says "all frontend pages", likely list page files all 32. We can say route-level pages and internal page components. Need exact routes from App. Include notfound, login etc.

Need perhaps read Landing, Contact, Branch, Nearest for purposes but obvious. Could answer. Also mention `IntegrationGuide` newly added. Need maybe correct route behavior: `/boards`, `/board/:branchId`, etc no navbar. `/staff` etc. `/integration` admin only. `/login/:kind` route includes invalid kind defaults staff maybe mention supported. `/platform/login` public, `/platform` superadmin.

List all:
- Landing /
- Contact /contact
- TicketPage /ticket, /ticket/:ticketId
- StaffHome /staff protected staff manager admin
- IntegrationGuide /integration protected admin
- LoginPage /login/:kind (/login redirects staff), bank roles
- PlatformLogin /platform/login
- PlatformDashboard /platform protected superadmin
- Boards /boards
- Board /board/:branchId
- Kiosk /kiosk/:branchId
- Appointment /appointment/:branchId
- NearestBranch /find-nearby
- Branch /branch/:branchId
- NotFound *
Internal components:
TicketForm, TicketStatus, NowServingCard, StaffHome tabs: CounterConsole, TicketHistory, ManagePanel, AdminOverview, ManagerOverview, CounterSubTab, StaffSubTab, ManagerSubTab, NotFound decorative files. Maybe "pages" not all components, but user said all frontend pages. Could include "supporting subpages/panels" to ensure all.

Need be concise under 4 lines? Developer says fewer than 4 lines unless asks detail. User explicitly asks list, can be longer detail. Use table. Also note current state.

## Route-level pages

| Route | File | Purpose | Access |
|---|---|---|---|
| `/` | `pages/Landing/Landing.jsx` | Marketing homepage and product introduction | Public |
| `/contact` | `pages/Contact/Contact.jsx` | Contact/sales inquiry form | Public |
| `/ticket` | `pages/TicketPage/TicketPage.jsx` | Create a guest queue ticket and choose a branch/service | Public |
| `/ticket/:ticketId` | `pages/TicketPage/TicketPage.jsx` | View live ticket status, position, ETA, and cancel ticket | Public |
| `/staff` | `pages/StaffHome/StaffHome.jsx` | Main staff/manager/admin dashboard | Staff, manager, admin |
| `/integration` | `pages/StaffHome/IntegrationGuide.jsx` | Bank API integration guide: auth, scopes, rate limits, errors, snippets, Swagger | Admin only |
| `/login` | Redirects to `/login/staff` | Default bank-user login redirect | Public |
| `/login/staff` | `pages/Login/LoginPage.jsx` | Staff email/password login | Public |
| `/login/manager` | `pages/Login/LoginPage.jsx` | Manager email/password login | Public |
| `/login/admin` | `pages/Login/LoginPage.jsx` | Bank admin email/password login | Public |
| `/platform/login` | `pages/Platform/PlatformLogin.jsx` | Superadmin platform login | Public |
| `/platform` | `pages/Platform/PlatformDashboard.jsx` | Superadmin API key and usage console | Superadmin only |
| `/boards` | `pages/Boards/Boards.jsx` | Network-wide live branch board with location filtering | Public |
| `/board/:branchId` | `pages/Board/Board.jsx` | Real-time “Now Serving” board for one branch | Public |
| `/kiosk/:branchId` | `pages/Kiosk/Kiosk.jsx` | Walk-in kiosk ticket creation and live tracking | Public |
| `/appointment/:branchId` | `pages/Appointment/Appointment.jsx` | Appointment slot booking, confirmation, and tracking | Public |
| `/find-nearby` | `pages/NearestBranch/NearestBranch.jsx` | Find nearby branches using location | Public |
| `/branch/:branchId` | `pages/Branch/Branch.jsx` | Public branch information and queue details | Public |
| `*` | `pages/NotFound/NotFound.jsx` | Custom 404 page | Public |

## Internal dashboard pages/panels

These are not separate routes; they are displayed inside `/staff`:

| File | Purpose |
|---|---|
| `StaffHome/AdminOverview.jsx` | Bank-wide overview: branches, managers, API key requests, key reveal/status |
| `StaffHome/ManagerOverview.jsx` | Branch analytics, queues, counters, staff performance |
| `StaffHome/ManagePanel.jsx` | Role-based management shell |
| `StaffHome/StaffSubTab.jsx` | Staff listing, creation, queue assignment, deactivation |
| `StaffHome/ManagerSubTab.jsx` | Manager listing, creation, and deactivation |
| `StaffHome/CounterSubTab.jsx` | Counter creation, assignment, and opening/closing |
| `StaffHome/CounterConsole.jsx` | Staff-only ticket serving console |
| `StaffHome/TicketHistory.jsx` | Staff ticket history |
| `TicketPage/TicketForm.jsx` | Guest ticket form |
| `TicketPage/TicketStatus.jsx` | Ticket progress/status display |
| `Board/NowServingCard.jsx` | Now-serving ticket card |
| `NotFound/VoidBackground.jsx`, `VoidTicketSVG.jsx`, `TiltCard.jsx`, `MagneticButton.jsx` | Decorative 404-page components |

---

