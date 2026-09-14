# Build Plan — Cue

A sequenced plan for everything left to build, and why it's ordered this way. Update the relevant status line here as each phase ships.

## Where things stand

| Piece                                                                       | Status         |
| --------------------------------------------------------------------------- | -------------- |
| Backend: auth, roles, branches, queues, counters, tickets                   | ✅ Done        |
| Backend: real-time (Socket.io), no-show handling                            | ✅ Done        |
| Backend: branch analytics, daily report, staff performance                  | ✅ Done        |
| Backend: public board endpoint (single branch)                              | ✅ Done        |
| Backend: public all-boards endpoint                                         | ✅ Done        |
| Backend: public branch info endpoint                                        | ✅ Done        |
| Backend: staff ticket history + recall                                      | ✅ Done        |
| Backend: email notifications (Resend)                                       | ✅ Done        |
| Backend: email verification flow                                            | ✅ Done        |
| Backend: forgot/reset password flow                                         | ✅ Done        |
| Backend: password change endpoint                                           | ✅ Done        |
| Backend: admin login (auth/login for User model roles)                      | ✅ Done        |
| Backend: day open/close endpoints (manager)                                 | ✅ Done        |
| Backend: branch address/phone/email fields                                  | ✅ Done        |
| Backend: kiosk ticket endpoints (create, track, cancel)                     | ✅ Done        |
| Backend: appointment booking endpoints (slots, book, track)                 | ✅ Done        |
| Backend: nearest-branch endpoint (geolocation sort)                         | ✅ Done        |
| Backend: branch coordinates + operating hours                               | ✅ Done        |
| Backend: AI agent (Groq API, tool-calling, chat endpoint)                   | ✅ Done        |
| Backend: webhook support (CRUD, HMAC signing, event dispatch)               | ✅ Done        |
| Backend: Slack/Discord notifications                                        | ✅ Done        |
| Backend: audit log (AuditLog model, middleware)                             | ✅ Done        |
| Backend: bulk staff import (CSV upload)                                     | ✅ Done        |
| Backend: export analytics (CSV, HTML reports)                               | ✅ Done        |
| Backend: peak hours heatmap, staff leaderboard, wait time targets           | ✅ Done        |
| Backend: response compression                                               | ✅ Done        |
| Backend: automated tests (35 tests, vitest)                                 | ✅ Done        |
| Backend: Mongoose deprecation fixes                                         | ✅ Done        |
| Seed script (admin, manager, staff, customer)                               | ✅ Done        |
| Frontend: landing page, contact page, 404                                   | ✅ Done        |
| Frontend: auth (login/register), 401 handling                               | ✅ Done        |
| Frontend: admin login page (/admin-login)                                   | ✅ Done        |
| Frontend: public Now Serving board (per-branch, GSAP animations)            | ✅ Done        |
| Frontend: public boards hub (/boards) with location filter                  | ✅ Done        |
| Frontend: public branch info page                                           | ✅ Done        |
| Frontend: customer ticket tracker + "View Live Queue" button                | ✅ Done        |
| Frontend: staff counter dashboard + "Live Board" button                     | ✅ Done        |
| Frontend: manager dashboard (enhanced overview, day control)                | ✅ Done        |
| Frontend: admin dashboard (network overview, live boards tab, staff search) | ✅ Done        |
| Frontend: staff ticket history with recall                                  | ✅ Done        |
| Frontend: forgot password page                                              | ✅ Done        |
| Frontend: reset password page                                               | ✅ Done        |
| Frontend: email verification page                                           | ✅ Done        |
| Frontend: change password component                                         | ✅ Done        |
| Frontend: email verification status badge                                   | ✅ Done        |
| Frontend: settings page (/settings) with branch details                     | ✅ Done        |
| Frontend: dark mode toggle (ThemeContext)                                   | ✅ Done        |
| Frontend: mobile responsive pass                                            | ✅ Done        |
| Frontend: motion backgrounds + page animations                              | ✅ Done        |
| Frontend: Q-arrow logo on all pages + favicon                               | ✅ Done        |
| Frontend: branch creation form (name, location, address, phone, email)      | ✅ Done        |
| Frontend: kiosk check-in page (/kiosk/:branchId)                           | ✅ Done        |
| Frontend: appointment booking page (/appointment/:branchId)                 | ✅ Done        |
| Frontend: nearest-branch finder (/find-nearby)                              | ✅ Done        |
| Frontend: AI agent chat widget (CustomerHome + StaffHome)                   | ✅ Done        |
| Frontend: peak hours heatmap, staff leaderboard, wait targets               | ✅ Done        |
| Frontend: webhook management UI                                             | ✅ Done        |
| Frontend: bulk staff import UI (CSV upload)                                 | ✅ Done        |
| Frontend: analytics export buttons (CSV, HTML)                              | ✅ Done        |
| Frontend: notification webhook URLs (Slack/Discord) on branch edit          | ✅ Done        |
| Frontend: code splitting (React.lazy for all 18 pages)                      | ✅ Done        |
| Frontend: automated tests (8 tests, vitest + testing-library)               | ✅ Done        |
| Frontend: error boundary component                                          | ✅ Done        |
| CI: GitHub Actions pipeline (lint, test, build)                             | ✅ Done        |
| README: backend and frontend docs updated                                   | ✅ Done        |

---

## Phase 1 — Customer Ticket Tracker ✅

Replaces the `/account` stub. The other half of the loop the board and staff dashboard depend on existing.

**Ships:**

- [x] Branch + service picker (`GET /api/branches`, `GET /api/queues`)
- [x] Create a ticket (`POST /api/tickets`), confirmation with the ticket number
- [x] Live ticket view: status, position, `estimatedWaitMinutes`, updating over the same socket events the board already listens for
- [x] Cancel ticket (`PATCH /api/tickets/:id/cancel`)
- [x] "No active ticket" state with a clear call to pull one
- [x] "View Live Queue" button linking to branch board

---

## Phase 2 — Staff Counter Dashboard ✅

Replaces `/staff` for `role: staff`. What actually makes the board's data mean something, right now nothing calls tickets.

**Ships:**

- [x] Pull the signed-in staff member's branch and counter (`GET /api/users/profile`)
- [x] "Call Next" for a chosen queue (`POST /api/tickets/call-next`)
- [x] Complete / skip the current ticket (`PATCH .../complete`, `PATCH .../skip`)
- [x] Open / close their own assigned counter (`PATCH /api/counters/:counterId/close`, `/open`)
- [x] Simple "my day" tally, tickets served today
- [x] Ticket history with recall for skipped tickets
- [x] "Live Board" header button linking to branch board

---

## Phase 3 — Manager Dashboard ✅

Extends the same `/staff` shell for `role: manager`.

**Ships:**

- [x] Everything staff can do, plus:
- [x] Staff management, create/deactivate, branch-scoped (`/api/staff`)
- [x] Counter management, create/assign/unassign/open/close any counter in-branch (`/api/counters`)
- [x] Ticket overrides: recall a skipped ticket, flag priority (`/api/tickets/:id/recall`, `/priority`)
- [x] Branch analytics dashboard, daily report, staff performance, real data this time (`/api/analytics/branch/:branchId`, `.../staff-performance`)
- [x] Enhanced overview with progress bars, queue bar charts, counter status grid
- [x] "View Branch Board →" link in panel header
- [x] Day Control menu — Open day / Close day with confirmation dialog
- [x] Day status tracked on Branch model (`dayOpen`, `lastOpenedAt`, `lastClosedAt`)
- [x] Analytics tab: peak hours heatmap, staff leaderboard, wait targets, webhooks, bulk import, export

---

## Phase 4 — Admin Dashboard ✅

Same shell, `role: admin`, network-wide instead of branch-scoped.

**Ships:**

- [x] Branch management (create with name, location, address, phone, email, notification webhooks)
- [x] Queue management across branches
- [x] Network-wide staff management, including cross-branch reassignment (`PATCH /api/staff/:staffId/assign`)
- [x] Cross-branch view of the analytics already built for managers, same components, a branch picker on top
- [x] "Network" tab — branch overview with links to board and public page
- [x] "Live Boards" tab — list all branches with "Open board →" links
- [x] Staff search by name, email, role, or branch

---

## Phase 4.5 — Email & Auth Features ✅

Built between Phase 4 and Phase 5 as foundational infrastructure.

**Email notifications (Resend):**

- [x] Replace nodemailer with Resend SDK
- [x] Ticket created confirmation email
- [x] Ticket called / "proceed to counter" email
- [x] Staff account created welcome email
- [x] All emails fire-and-forget (never block requests)

**Email verification:**

- [x] Token model (`Token`) with SHA-256 hashing, 24h expiry, auto-expire index
- [x] Verification email sent on customer registration
- [x] `POST /auth/verify-email` — accepts token, marks `isEmailVerified: true`
- [x] `POST /auth/resend-verification` — resends verification email
- [x] Frontend: `/verify-email?token=...` — auto-verifies on page load

**Forgot / reset password:**

- [x] `POST /auth/forgot-password` — works for both User and Staff models
- [x] `POST /auth/reset-password` — accepts token + new password, 1h expiry
- [x] Generic response to prevent email enumeration
- [x] Frontend: `/forgot-password` — enter email form
- [x] Frontend: `/reset-password?token=...` — enter new password form
- [x] "Forgot password?" link on login page

**Password change (logged in):**

- [x] `PATCH /api/users/change-password` — works for all roles
- [x] Validates current password, min 8 chars, different from current
- [x] Reusable `<ChangePassword />` component on customer + staff dashboards

**Admin login:**

- [x] `/admin-login` route — dedicated page that hits `POST /api/auth/login` (User model, where admin accounts live)
- [x] "Sign in as Admin instead" link on staff login tab

---

## Phase 4.7 — UX Polish ✅

Animation, theming, responsive, and settings consolidation.

**Settings page:**

- [x] `/settings` route — consolidated profile, email verification, and password change
- [x] Settings link in header on customer and staff dashboards
- [x] Protected route requiring authentication
- [x] Branch name resolved from public endpoint, shows full details

**Dark mode:**

- [x] `ThemeContext` — manages theme state with localStorage persistence
- [x] Auto-detects `prefers-color-scheme` on first visit
- [x] `[data-theme="dark"]` CSS variables in `global.css`
- [x] Toggle button in Navbar
- [x] Full dark palette with adjusted verdigris/brass/signal for readability

**Mobile responsive pass:**

- [x] All dashboards, auth pages, settings, kiosk, appointment — fully responsive

**Animations & motion backgrounds:**

- [x] `MotionBackground` component — 6 floating orbs with blur + subtle grid pattern
- [x] Staggered fadeUp entrance animations on all dashboards and auth pages

**Branding:**

- [x] Q-arrow SVG logo on Navbar, Footer, all pages
- [x] Favicon, page title updated to "Cue — Smart Queue Management"

---

## Phase 4.8 — Live Board & Public Hub ✅

**Per-branch live board (`/board/:branchId`):**

- [x] Now serving cards with ticket number (flap display), counter label, service name
- [x] Total waiting banner with per-service breakdown
- [x] Recently served list (newest first)
- [x] GSAP continuous animations: scan line, banner glow, card float, recent drift, day indicator pulse
- [x] Day status indicator — "BRANCH OPEN" (green) / "BRANCH CLOSED" (red) with timestamps
- [x] Logo + "← All branches" back link
- [x] Live clock, connection status dot

**Public boards hub (`/boards`):**

- [x] Backend: `GET /api/board` — returns all branches with queue lengths, counter status, called counts
- [x] Branch cards showing name, location, waiting count, counter status, service breakdown
- [x] Location filter dropdown
- [x] Socket.io real-time updates across all branches

**Day control (manager):**

- [x] `POST /api/tickets/close-day` / `/open-day` — marks all active tickets completed, emits socket events
- [x] Branch model: `dayOpen`, `lastOpenedAt`, `lastClosedAt` fields
- [x] ManagerPanel: "☀ Day Control" dropdown with Open/Close options + confirmation dialog

---

## Phase 5 — AI Agent ✅

The feature named as a requirement from the start of this project. Uses Groq API with LLaMA 3.3 70B for fast tool-calling. Two distinct surfaces, not one generic chatbot.

**Backend:**

- [x] `services/groq.service.js` — Groq SDK integration, tool-calling orchestration, role-based tool sets
- [x] `controllers/agent.controller.js` — 8 tool executors: get_my_ticket, get_branch_queues, list_branches, get_branch_analytics, get_daily_report, get_staff_performance, list_all_branches
- [x] `routes/agent.routes.js` — `POST /api/agent/chat` (protected)
- [x] Customer tools: check ticket status/position/ETA, browse branches and queues
- [x] Staff tools: customer tools + analytics summaries, daily reports, staff performance
- [x] Admin tools: staff tools + network-wide branch listing

**Frontend:**

- [x] `components/AgentChat/AgentChat.jsx` — floating chat widget with toggle, messages, typing indicator
- [x] `components/AgentChat/AgentChat.module.css` — responsive, themed chat window
- [x] `features/agent/agentApi.js` — `sendAgentMessage()` API function
- [x] Mounted on `CustomerHome` — customers can ask about queues, wait times, branches
- [x] Mounted on `StaffHome` — staff/managers/admins get analytics-powered responses

**Config:**

- [x] `GROQ_API_KEY` env var for authentication
- [x] `GROQ_MODEL` env var (default: `llama-3.3-70b-versatile`)
- [x] Tool sets scale by role: customer < staff < admin

---

## Phase 6 — Stand-Out Features ✅

Additive features that make the system stand out from a basic queue app.

### QR / Kiosk check-in ✅
- [x] `POST /api/kiosk/tickets` — create a ticket without authentication, returns a `kioskId` for tracking
- [x] `GET /api/kiosk/tickets/:kioskId` — track kiosk ticket status, position, and details
- [x] `PATCH /api/kiosk/tickets/:kioskId/cancel` — cancel a waiting kiosk ticket
- [x] Frontend: `/kiosk/:branchId` — full kiosk UI with service picker, optional guest name/phone, animated ticket number display
- [x] Branch page: "Kiosk Check-in" button alongside existing actions

### Appointment booking ✅
- [x] `GET /api/appointments/slots` — returns available time slots for a branch/service/date
- [x] `POST /api/appointments` — book a ticket with `scheduledFor` datetime
- [x] `GET /api/appointments/:kioskId` — look up appointment details
- [x] Frontend: `/appointment/:branchId` — date picker, time slot grid, guest info, booking confirmation
- [x] Branch model: `operatingHours`, `maxAppointmentsPerSlot`

### Nearest-branch finder ✅
- [x] `GET /api/branches/nearest?lat=X&lng=Y` — returns branches sorted by haversine distance
- [x] Frontend: `/find-nearby` — browser Geolocation API, sorted branch cards with distance

### SMS/WhatsApp notifications
- [ ] Deferred — requires third-party provider integration (Twilio, etc.)

---

## Phase 7 — Production Hardening ✅

A dedicated pass once the app is feature-complete.

**Backend**

- [x] `helmet`, response compression (`compression` middleware)
- [x] Pagination on list endpoints (`utils/pagination.js`)
- [x] API documentation (Swagger/OpenAPI at `/api/docs`)
- [x] Automated tests (35 tests across 5 test files, vitest)
- [x] Audit log (`AuditLog` model, `audit.middleware.js`, 90-day TTL)
- [ ] Refresh tokens, logout / token invalidation (deferred — current single JWT is sufficient)
- [ ] Structured logging (deferred — console.error is adequate for current scale)

**Frontend**

- [x] Wire the Contact page to a real endpoint (`POST /api/contact`)
- [x] Automated tests (8 tests across 2 test files, vitest + testing-library)
- [x] CI pipeline (GitHub Actions: lint, test, build)
- [x] Error boundary component
- [x] Code splitting (React.lazy for all 18 pages, main bundle 670KB → 240KB)

---

## Suggested Next Features

Completed features from the suggestions list:

- [x] **Service-level wait time targets** — Branch model `waitTimeTargets` map, GET/PUT endpoints, inline editing UI with on-target/off-target indicators
- [x] **Bulk staff import** — CSV upload via multer, `POST /api/staff-import/import`, results displayed in manager analytics tab
- [x] **Audit log** — `AuditLog` model (90-day TTL), `audit.middleware.js` for action logging on ticket operations
- [x] **Export analytics to CSV/PDF** — CSV and HTML reports with status breakdown + staff performance
- [x] **Peak hours heatmap** — 7/14/30-day aggregation by day-of-week × hour, color-coded grid
- [x] **Staff leaderboard** — daily/weekly/monthly rankings with ticket counts and avg handle time
- [x] **Webhook support** — create/delete/toggle webhooks, event subscription, HMAC signatures
- [x] **Slack/Discord notifications** — branch-level webhook URLs, auto-fires on ticket call, queue threshold, day open/close

Still remaining:

- [ ] **Push notifications** — browser push for "your ticket is being called"
- [ ] **Ticket cancelled/completed email** — notify customer when their ticket is resolved

## Cross-cutting

- [x] Update `backend/README.md` and `frontend/README.md`
- [x] Automated tests (backend 35, frontend 8)
- [x] CI pipeline (GitHub Actions)
- [x] Mongoose deprecation fixes (`new: true` → `returnDocument: 'after'`)
