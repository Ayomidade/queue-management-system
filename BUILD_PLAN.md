# Build Plan — Cue

A sequenced plan for everything left to build, and why it's ordered this way. Update the relevant status line here as each phase ships.

## Where things stand

| Piece                                                                     | Status         |
| ------------------------------------------------------------------------- | -------------- |
| Backend: auth, roles, branches, queues, counters, tickets                 | ✅ Done        |
| Backend: real-time (Socket.io), no-show handling                          | ✅ Done        |
| Backend: branch analytics, daily report, staff performance                | ✅ Done        |
| Backend: public board endpoint                                            | ✅ Done        |
| Backend: public branch info endpoint                                      | ✅ Done        |
| Backend: staff ticket history + recall                                    | ✅ Done        |
| Backend: email notifications (Resend)                                     | ✅ Done        |
| Backend: email verification flow                                          | ✅ Done        |
| Backend: forgot/reset password flow                                       | ✅ Done        |
| Backend: password change endpoint                                         | ✅ Done        |
| Seed script (admin, manager, staff, customer)                             | ✅ Done        |
| Frontend: landing page, contact page, 404                                 | ✅ Done        |
| Frontend: auth (login/register), 401 handling                             | ✅ Done        |
| Frontend: public Now Serving board                                        | ✅ Done        |
| Frontend: public branch info page                                         | ✅ Done        |
| Frontend: customer ticket tracker                                         | ✅ Done        |
| Frontend: staff counter dashboard                                         | ✅ Done        |
| Frontend: manager dashboard                                               | ✅ Done        |
| Frontend: admin dashboard                                                 | ✅ Done        |
| Frontend: staff ticket history with recall                                | ✅ Done        |
| Frontend: forgot password page                                            | ✅ Done        |
| Frontend: reset password page                                             | ✅ Done        |
| Frontend: email verification page                                         | ✅ Done        |
| Frontend: change password component                                       | ✅ Done        |
| Frontend: email verification status badge                                 | ✅ Done        |
| Frontend: settings page (/settings)                                       | ✅ Done        |
| Frontend: dark mode toggle (ThemeContext)                                 | ✅ Done        |
| Frontend: mobile responsive pass                                          | ✅ Done        |
| Frontend: motion backgrounds + page animations                            | ✅ Done        |
| AI agent                                                                  | ❌ Not started |
| Stand-out features (QR kiosk, SMS/WhatsApp, appointments, nearest-branch) | ❌ Not started |
| Production hardening (tests, CI, docs, security)                          | ❌ Not started |

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
- [ ] Revisit the counter/queue decision above if it's earned a schema change by now

**Depends on:** Phase 2's dashboard shell.

### Implementation details
- `ManagerPanel.jsx` — tabbed interface: Overview, Staff, Counters, Tickets
- `OverviewTab.jsx` — tiles for waiting/called/completed today, average wait, queue lengths, counter status
- `StaffTab.jsx` — list staff with served-today count, create new staff, deactivate (managers excluded)
- `CountersTab.jsx` — create counters, assign/unassign staff, open/close toggle, status badges
- `TicketsTab.jsx` — sub-tabs for Waiting/Skipped, mark priority, recall skipped tickets
- CSS: `ManagerPanel.module.css` — shared styles reused by admin panel

---

## Phase 4 — Admin Dashboard ✅

Same shell, `role: admin`, network-wide instead of branch-scoped.

**Ships:**
- [x] Branch management (create, list, delete)
- [x] Queue management across branches
- [x] Network-wide staff management, including cross-branch reassignment (`PATCH /api/staff/:staffId/assign`)
- [x] Cross-branch view of the analytics already built for managers, same components, a branch picker on top

**Depends on:** Phase 3's dashboard shell and components.

### Implementation details
- `AdminPanel.jsx` — tabbed interface: Branches, Services, Staff, Counters, Overview
- `BranchesTab.jsx` — create/delete branches with name + location
- `ServicesTab.jsx` — create/delete queues, pick branch per service
- `AdminStaffTab.jsx` — create staff with role picker (staff/manager), branch assignment, reassign dropdown, deactivate
- Reuses `CountersTab` and `OverviewTab` from manager with a branch picker on top
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

### New files
- `backend/src/models/token.model.js` — verification + password reset tokens
- `frontend/src/pages/ForgotPassword/ForgotPassword.jsx`
- `frontend/src/pages/ResetPassword/ResetPassword.jsx`
- `frontend/src/pages/VerifyEmail/VerifyEmail.jsx`
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
- [x] `CustomerHome.jsx` — staggered fadeUp entrance for header, ticket view, change password
- [x] `Settings.jsx` — staggered motion.div for profile, verification, password sections
- [x] `CounterConsole.jsx` — entrance animation wrapping the console
- [x] All auth pages (Login, Register, ForgotPassword, ResetPassword) — existing fadeUp + new MotionBackground

### New files
- `frontend/src/features/theme/ThemeContext.jsx` — dark mode context
- `frontend/src/components/MotionBackground/MotionBackground.jsx` — animated background
- `frontend/src/components/MotionBackground/MotionBackground.module.css` — orb + grid styles
- `frontend/src/components/EmailVerificationBadge/EmailVerificationBadge.jsx`
- `frontend/src/components/EmailVerificationBadge/EmailVerificationBadge.module.css`
- `frontend/src/pages/Settings/Settings.jsx`
- `frontend/src/pages/Settings/Settings.module.css`

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

## Phase 6 — Stand-Out Features ❌ Not started

Additive, not required for the system to work end to end:

- [ ] QR/kiosk check-in (join a queue without logging in)
- [ ] SMS/WhatsApp notifications alongside email
- [ ] Appointment booking, alongside walk-in tickets
- [ ] Nearest-branch-with-shortest-wait finder

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

These were built during Phases 1–4 as natural extensions:

- **Seed script** (`npm run seed:all`) — creates Branch, Queues, Counters, Admin, Manager, Staff, and Customer accounts with env-overridable defaults
- **Public branch info page** (`/branch/:branchId`) — shows branch details, live queue status, counter availability, and CTAs to join queue or view board
- **Staff ticket recall** — extended the recall endpoint from manager-only to staff, so any counter worker can recall a skipped ticket
- **Staff ticket history** — `GET /tickets/my-history` + `TicketHistory` component showing recently completed/skipped tickets with inline recall
- **Bug fixes** — stray character in ServicesTab, missing ticket branch route, branch route middleware restructuring for public access

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
