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
| Frontend: Q-arrow logo on all pages + favicon                               | ✅ Done        || Frontend: branch creation form (name, location, address, phone, email)      | ✅ Done        |
| Backend: kiosk ticket endpoints (create, track, cancel)                     | ✅ Done        |
| Backend: appointment booking endpoints (slots, book, track)                 | ✅ Done        |
| Backend: nearest-branch endpoint (geolocation sort)                         | ✅ Done        |
| Backend: branch coordinates + operating hours                               | ✅ Done        |
| Frontend: kiosk check-in page (/kiosk/:branchId)                           | ✅ Done        |
| Frontend: appointment booking page (/appointment/:branchId)                 | ✅ Done        |
| Frontend: nearest-branch finder (/find-nearby)                              | ✅ Done        |
| AI agent                                                                  | ❌ Not started |
| Stand-out features (QR kiosk, SMS/WhatsApp, appointments, nearest-branch)   | ❌ Not started |
| Production hardening (tests, CI, docs, security)                            | ❌ Not started |

## A decision before Phase 1: counters and queues stay loosely linked

A `Counter` doesn't currently know which `Queue` (service) it serves, staff pick a queue each time they hit "call next." Two ways to go:

- **A. Keep it as-is.** Staff choose the service at call time, no schema change, ships Phases 1 and 2 immediately. A counter can flex between services if a branch needs that.
- **B. Fix a queue (or set of queues) to a counter.** More automatic, lets the customer app say "go to Counter 3" in advance, but is a real schema change touching counters, staff, and the board.

**Going with A.** Build Phases 1 and 2 on the flexible model, see how it's actually used, revisit B in Phase 3 if fixed pairing turns out to matter.

## Sequencing logic

The core loop is: **a customer creates a ticket → staff serves it.** Neither half has a real UI yet, `/account` and `/staff` are still stubs. That loop closes first. Manager and admin get layered on top of staff's screen rather than built as separate page trees, sections revealed by role, which matches how the backend already layers their permissions on top of staff's (`authorize("staff", "manager", "admin")` on the ticket routes is the same idea). The AI agent needs real endpoints with real data flowing through them to be worth anything, so it comes after the core loop, not before. Stand-out features are additive polish on a system that already works, they come last on purpose.

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

**Depends on:** auth (done), the socket event set (done).

### Implementation details

- `CreateTicketFlow.jsx` — branch picker derived from queues, service picker filtered by branch
- `ActiveTicketView.jsx` — shows ticket number (flap animation), position ahead, estimated wait, cancel button
- `useMyTicket.js` — polls for active ticket, subscribes to socket events for live updates
- Customer sees "Waiting" or "You're being called" badge with animated transitions

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

**Depends on:** Phase 1, so there are real waiting tickets to call during testing.

### Implementation details

- `CounterConsole.jsx` — service picker, call next button, now-serving card with Complete/Skip actions
- `useCounterOperations.js` — manages current ticket state, callNext, completeTicket, skipTicket
- `useMyCounter.js` — fetches assigned counter, toggle open/close
- `useMyStats.js` — tickets served today count
- `TicketHistory.jsx` — recent completed/skipped tickets with recall button on skipped ones
- `useTicketHistory.js` — fetches `GET /tickets/my-history`, recall action via `PATCH /tickets/:id/recall`

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
- [ ] Revisit the counter/queue decision above if it's earned a schema change by now

**Depends on:** Phase 2's dashboard shell.

### Implementation details

- `ManagerPanel.jsx` — tabbed interface: Overview, Staff, Counters, Tickets + Day Control dropdown
- `OverviewTab.jsx` — animated tiles, completion rate progress bar, queue bar charts, counter grid
- `StaffTab.jsx` — list staff with served-today count, create new staff, deactivate (managers excluded)
- `CountersTab.jsx` — create counters, assign/unassign staff, open/close toggle, status badges
- `TicketsTab.jsx` — sub-tabs for Waiting/Skipped, mark priority, recall skipped tickets
- `closeDay()` / `openDay()` — `POST /tickets/close-day` and `/open-day` (manager only)
- CSS: `ManagerPanel.module.css` — shared styles reused by admin panel

---

## Phase 4 — Admin Dashboard ✅

Same shell, `role: admin`, network-wide instead of branch-scoped.

**Ships:**

- [x] Branch management (create with name, location, address, phone, email)
- [x] Queue management across branches
- [x] Network-wide staff management, including cross-branch reassignment (`PATCH /api/staff/:staffId/assign`)
- [x] Cross-branch view of the analytics already built for managers, same components, a branch picker on top
- [x] "Network" tab — branch overview with links to board and public page
- [x] "Live Boards" tab — list all branches with "Open board →" links
- [x] Staff search by name, email, role, or branch

**Depends on:** Phase 3's dashboard shell and components.

### Implementation details

- `AdminPanel.jsx` — 7-tab interface: Network, Branches, Services, Staff, Counters, Live Boards, Analytics
- `NetworkOverview.jsx` — summary tiles (total branches, active, locations) + branch list with board/public links
- `BranchesTab.jsx` — enhanced form with name, location, address, phone, email fields
- `ServicesTab.jsx` — create/delete queues, pick branch per service
- `AdminStaffTab.jsx` — search bar, create staff with role picker, reassign dropdown, deactivate
- `adminApi.js` — dedicated API layer for admin-only endpoints

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
- [x] Root cause: admin is in User model, staff login hits Staff model

### New files

- `backend/src/models/token.model.js` — verification + password reset tokens
- `frontend/src/pages/ForgotPassword/ForgotPassword.jsx`
- `frontend/src/pages/ResetPassword/ResetPassword.jsx`
- `frontend/src/pages/VerifyEmail/VerifyEmail.jsx`
- `frontend/src/pages/AdminLogin/AdminLogin.jsx`
- `frontend/src/components/ChangePassword/ChangePassword.jsx`

### Env vars

- `RESEND_API_KEY` — Resend API key (get from resend.com/api-keys)
- `RESEND_FROM` — sender email (default: `Cue <onboarding@resend.dev>`)
- `FRONTEND_URL` — used to build verification/reset links in emails

---

## Phase 4.7 — UX Polish ✅

Animation, theming, responsive, and settings consolidation.

**Settings page:**

- [x] `/settings` route — consolidated profile, email verification, and password change
- [x] Settings link in header on customer and staff dashboards
- [x] Protected route requiring authentication
- [x] Branch name resolved from public endpoint, shows full details

**Email verification badge:**

- [x] `<EmailVerificationBadge />` — green "verified" or red "not verified" with resend button
- [x] Only shown for customer accounts (staff accounts skip verification)
- [x] Added `isEmailVerified` to Staff model + login responses

**Dark mode:**

- [x] `ThemeContext` — manages theme state with localStorage persistence
- [x] Auto-detects `prefers-color-scheme` on first visit
- [x] `[data-theme="dark"]` CSS variables in `global.css`
- [x] 🌙/☀ toggle button in Navbar
- [x] Full dark palette with adjusted verdigris/brass/signal for readability

**Mobile responsive pass:**

- [x] `StaffHome.module.css` — header stacks, action buttons stack, history rows stack
- [x] `ManagerPanel.module.css` — tab content padding, rows stack, forms full-width, branch picker stacks
- [x] `CustomerHome.module.css` — header actions layout
- [x] `Settings.module.css` — profile rows stack on mobile
- [x] `Login.module.css` — form fields stack properly

**Animations & motion backgrounds:**

- [x] `MotionBackground` component — 6 floating orbs with blur + subtle grid pattern
- [x] Applied to: Login, Register, ForgotPassword, ResetPassword, VerifyEmail, Contact, Settings, CustomerHome, StaffHome
- [x] `StaffHome.jsx` — staggered fadeUp entrance for header, stat card, console, history, panels
- [x] `CustomerHome.jsx` — staggered fadeUp entrance for header, ticket view
- [x] `Settings.jsx` — staggered motion.div for profile, verification, password sections
- [x] `CounterConsole.jsx` — entrance animation wrapping the console
- [x] All auth pages (Login, Register, ForgotPassword, ResetPassword) — existing fadeUp + new MotionBackground

**Branding:**

- [x] Q-arrow SVG logo (`queue_q_arrow_logo.svg`) — selected for simplicity and concept (Q = queue, arrow = moving forward)
- [x] Logo on Navbar, Footer, all auth pages, Landing Hero, Contact, Branch, Settings, CustomerHome, StaffHome
- [x] Favicon (`public/favicon.svg`) — Q-arrow icon
- [x] Page title updated to "Cue — Smart Queue Management"

### New files

- `frontend/src/features/theme/ThemeContext.jsx` — dark mode context
- `frontend/src/components/MotionBackground/MotionBackground.jsx` — animated background
- `frontend/src/components/MotionBackground/MotionBackground.module.css` — orb + grid styles
- `frontend/src/components/EmailVerificationBadge/EmailVerificationBadge.jsx`
- `frontend/src/components/EmailVerificationBadge/EmailVerificationBadge.module.css`
- `frontend/src/pages/Settings/Settings.jsx`
- `frontend/src/pages/Settings/Settings.module.css`
- `frontend/src/assets/logo.svg` — cleaned Q-arrow logo

---

## Phase 4.8 — Live Board & Public Hub ✅

The public-facing board and multi-branch hub.

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
- [x] Location filter dropdown (unique locations extracted from branches)
- [x] "View live board →" link per branch
- [x] Network summary stats (total branches, waiting, counters open)
- [x] Socket.io real-time updates across all branches
- [x] Staggered entrance animations

**Day control (manager):**

- [x] `POST /api/tickets/close-day` — marks all active tickets completed, resets queue counters, sets `dayOpen: false`
- [x] `POST /api/tickets/open-day` — sets `dayOpen: true`, emits socket event
- [x] Branch model: `dayOpen`, `lastOpenedAt`, `lastClosedAt` fields
- [x] ManagerPanel: "☀ Day Control" dropdown with Open/Close options
- [x] Confirmation dialog before day close
- [x] Success/error toast notifications
- [x] Board listens for `day:opened` / `day:closed` socket events

**Navigation:**

- [x] Navbar: "Live Boards" link (desktop + mobile)
- [x] Landing Hero: "View Live Boards" button
- [x] Branch page: "View Live Board" button
- [x] StaffHome: "Live Board" header button
- [x] ManagerPanel: "View Branch Board →" link
- [x] AdminPanel: "Live Boards" tab with per-branch links

### New files

- `frontend/src/pages/Boards/Boards.jsx` — public boards hub
- `frontend/src/pages/Boards/Boards.module.css`
- `backend/src/controllers/board.controller.js` — `getAllBoards()` added
- `backend/src/routes/board.routes.js` — `GET /` route added

---

## Phase 5 — AI Agent ❌ Not started

The feature named as a requirement from the start of this project. Comes after the core loop, not because it's less important, but because an agent has nothing real to call or summarize without Phases 1 through 4 in place. Two distinct surfaces, not one generic chatbot:

**Ships:**

- [ ] Decide the integration approach (Anthropic API, tool-calling against the existing endpoints)
- [ ] Backend: an agent route exposing ticket/queue actions as callable tools
- [ ] Customer-facing agent: book/check/cancel a ticket, ask wait-time questions, in plain language
- [ ] Staff/admin-facing agent: natural-language operations summaries off the analytics endpoints, anomaly flags ("Ikeja's average wait is up 18% today, mostly loan services after 2pm")
- [ ] A shared chat UI component, reused in both the customer tracker and the manager/admin dashboard

**Depends on:** Phases 1–4.

---

## Phase 6 — Stand-Out Features ✅

Additive features that make the system stand out from a basic queue app.

### QR / Kiosk check-in ✅
- [x] `POST /api/kiosk/tickets` — create a ticket without authentication, returns a `kioskId` for tracking
- [x] `GET /api/kiosk/tickets/:kioskId` — track kiosk ticket status, position, and details
- [x] `PATCH /api/kiosk/tickets/:kioskId/cancel` — cancel a waiting kiosk ticket
- [x] Frontend: `/kiosk/:branchId` — full kiosk UI with service picker, optional guest name/phone, animated ticket number display, status refresh, cancel, and link to live board
- [x] Kiosk route: no auth middleware, fully anonymous
- [x] Ticket model: `user` field now optional, `kioskId` field (sparse unique) for anonymous tracking
- [x] Branch page: "Kiosk Check-in" button alongside existing actions

### Appointment booking ✅
- [x] `GET /api/appointments/slots` — returns available time slots for a branch/service/date (respects operating hours, 30-min intervals, max-appointments-per-slot)
- [x] `POST /api/appointments` — book a ticket with `scheduledFor` datetime, returns kioskId for tracking
- [x] `GET /api/appointments/:kioskId` — look up appointment details
- [x] Frontend: `/appointment/:branchId` — date picker, time slot grid with availability counts, guest info fields, booking confirmation with animated ticket number, booking ID for tracking
- [x] Branch model: `operatingHours` (per-day open/close), `maxAppointmentsPerSlot` (default 5)
- [x] Ticket model: `isAppointment`, `scheduledFor`, `guestName`, `guestPhone` fields
- [x] Branch page: "Book Appointment" button

### Nearest-branch finder ✅
- [x] `GET /api/branches/nearest?lat=X&lng=Y` — returns branches sorted by haversine distance, includes live wait counts and counter status
- [x] Frontend: `/find-nearby` — browser Geolocation API, sorted branch cards with distance, wait count, counter availability, links to details/board/kiosk
- [x] Branch model: `coordinates.lat` / `coordinates.lng` (optional, branches without coords excluded)
- [x] Navbar: "Find Nearby" link in both desktop and mobile nav

### Deferred
- [ ] SMS/WhatsApp notifications alongside email — requires third-party provider integration (Twilio, etc.), deferred to a future pass

---

## Phase 7 — Production Hardening ❌ Not started

A dedicated pass once the app is feature-complete, not scattered piecemeal.

**Backend**

- [ ] `helmet`, response compression
- [ ] Pagination on list endpoints
- [ ] `asyncHandler` wrapper to remove repeated try/catch
- [ ] Refresh tokens, logout / token invalidation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Automated tests
- [ ] Structured logging

**Frontend**

- [ ] Wire the Contact page to a real endpoint (it currently generates a placeholder ticket number client-side, nothing is sent)
- [ ] Automated tests
- [ ] CI pipeline

---

## Extra work completed (not in original plan)

The original six-phase plan didn't anticipate these features, but they are built, shipped, and integral to the system.

### Email & account security

- **Email verification flow** — `Token` model with SHA-256 hashing and 24-hour expiry, verification email on registration, `POST /auth/verify-email` (now supports both User and Staff via `doc.userModel`), `POST /auth/resend-verification`, frontend `/verify-email?token=...` auto-verifies on load
- **Forgot / reset password** — `POST /auth/forgot-password` sends a hashed single-use token (1-hour expiry) to both User and Staff, `POST /auth/reset-password` accepts token + new password, generic responses to prevent email enumeration, frontend pages at `/forgot-password` and `/reset-password`
- **Password change (logged in)** — `PATCH /api/users/change-password`, validates current password and enforces min 8 chars, reusable `<ChangePassword />` component on customer and staff dashboards
- **SMTP → Resend switch** — replaced nodemailer with Resend SDK (`email.service.js`), all emails fire-and-forget (never block requests), env vars `RESEND_API_KEY` and `RESEND_FROM`
- **Admin login** — admin accounts live in User model (not Staff), dedicated `/admin-login` route hitting the correct `POST /api/auth/login` endpoint, "Sign in as Admin instead" link on staff login

### Public-facing features

- **Public branch info page** (`/branch/:branchId`) — shows branch details, live queue status, counter availability, and CTAs to join queue or view board (`GET /api/board/:branchId`)
- **Public boards hub** (`/boards`) — lists all branches with queue lengths, counter status, location filter, summary stats, real-time Socket.io updates (`GET /api/board`)
- **Public per-branch board** (`/board/:branchId`) — now-serving cards with GSAP animations, day status indicator, connection dot, live clock

### Staff features

- **Staff ticket history** — `GET /tickets/my-history` + `TicketHistory` component showing recently completed/skipped tickets with inline recall on skipped ones
- **Staff ticket recall** — extended `PATCH /tickets/:id/recall` from manager-only to `staff, manager, admin`
- **Staff self-service day control** — `POST /tickets/close-day` and `/open-day` in ManagerPanel, resets queue counters, emits socket events

### Dark / light theming

- **Theme toggle** — `ThemeContext` with localStorage persistence, auto-detects `prefers-color-scheme`, `[data-theme="dark"]` CSS variable block in `global.css`, toggle button in Navbar
- **Token design** — `--ink` is always the dark tone, `--paper` always the light tone; both themes shift shades (not semantics) so alternating dark/light sections stay coherent

### Settings

- **Settings page** (`/settings`) — consolidated profile, email verification badge, and password change behind a protected route, branch details resolved from public endpoint

### Seed script

- `npm run seed:all` — creates Branch, Queues, Counters, Admin, Manager, Staff, and Customer accounts with env-overridable defaults

### Branch model enrichment

- Added `address`, `phone`, `email` fields with validation, used by branch creation form and public info page

### Bug fixes

- Stray character in ServicesTab, missing ticket branch route, branch route middleware restructuring for public access
- Admin login fix (admin accounts in User model, not Staff)
- `user.model.js` role field: restored `default: "customer"` and `required: true` (was missing, could produce `role: undefined` on new code paths)
- `auth.controller.js` verifyEmail: now mirrors resetPassword's `doc.userModel` pattern, handles Staff verification tokens correctly
- Dark mode: corrected inverted token semantics (`--ink` = dark tone, `--paper` = light tone, shades shift per theme not roles)
- Removed dead `backend/src/config/email.js` (comment-only file, nothing imported it)

---

## Suggested next features

Features worth considering before or alongside Phase 5 (AI Agent):

### Notifications

- [ ] **Push notifications** — browser push for "your ticket is being called" instead of relying on email alone
- [ ] **Ticket cancelled/completed email** — notify customer when their ticket is resolved

### Operations

- [ ] **Branch operating hours** — let branches set open/close times, hide queues outside hours
- [ ] **Service-level wait time targets** — set expected handling time per queue, show "on track" / "behind" indicators
- [ ] **Bulk staff import** — CSV upload for onboarding multiple staff members at once
- [ ] **Audit log** — track who did what (created staff, recalled ticket, changed priority) for compliance

### Analytics

- [ ] **Export analytics to CSV/PDF** — managers and admins download reports
- [ ] **Peak hours heatmap** — visualize busiest times per branch/service
- [ ] **Staff leaderboard** — gamify with daily/weekly stats across the team

### Integrations

- [ ] **Webhook support** — let branches subscribe to events (ticket called, queue threshold reached) via HTTP callbacks
- [ ] **Slack/Discord notifications** — post to a channel when a ticket is called or queue hits a threshold

## Cross-cutting, fold in as each phase ships

- Update `backend/README.md` and `frontend/README.md` after each phase, not in one pass at the end
- No automated tests exist yet, manually walk the phase's core flow before calling it done
- Reuse the existing design tokens and folder conventions, no new palettes or structures introduced mid-plan
