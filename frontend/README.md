# Cue — Frontend

The customer-and-branch-facing interface for the Smart Queue Management System. Built with React and Vite, on a design system grounded in the physical world of bank ledgers and queue tickets rather than generic SaaS conventions.

## Tech Stack

| Tool                  | Role                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------- |
| React 19 + Vite 8    | App shell, dev server, build, code splitting                                           |
| React Router 7        | Client-side routing                                                                    |
| Framer Motion         | Declarative component reveals (fades, mount transitions, mobile nav)                   |
| GSAP + ScrollTrigger  | Scroll-driven and timeline animation (kinetic type, marquee, scroll-scrubbed progress) |
| Socket.io Client      | Real-time queue updates                                                                |
| CSS Modules           | Scoped component styling                                                               |
| CSS custom properties | Design tokens (color, type, spacing)                                                   |
| Vitest + Testing Library | Component and utility tests                                                         |

**Why two animation libraries:** Framer Motion handles per-component declarative reveals well. GSAP's ScrollTrigger and timeline control handle the more choreographed pieces more cleanly. Each is used where it's the better tool.

## Design System

**Palette**, grounded in old bank ledgers and vault fixtures:

| Token            | Hex       | Role                                                      |
| ---------------- | --------- | --------------------------------------------------------- |
| `--ink`          | `#101F17` | Near-black forest green, dark sections                    |
| `--ink-raised`   | `#1B3324` | Lifted surface on dark                                    |
| `--paper`        | `#EFE6CF` | Aged ledger paper, light sections                         |
| `--paper-raised` | `#E2D3A8` | Card surface on light                                     |
| `--verdigris`    | `#4FA37B` | Primary interactive accent, oxidized copper               |
| `--brass`        | `#C9A227` | Fine-detail accent, gold-leaf lettering                   |
| `--signal`       | `#C1432B` | Alert/live states only, used sparingly                    |

**Type:**

- **Fraunces** — display and headlines, editorial character
- **IBM Plex Sans** — body copy
- **IBM Plex Mono** — ticket numbers, stats, terminal-style readouts

## Features

- **Code splitting** — all 18 page components lazy-loaded via `React.lazy()`, main bundle ~240KB
- **Dark/light theming** — toggle with localStorage persistence, auto-detects system preference
- **AI Assistant** — floating chat widget on customer and staff dashboards, powered by Groq API
- **Live queue boards** — real-time Socket.io updates for branch boards
- **Kiosk check-in** — anonymous ticket creation with animated display
- **Appointment booking** — date/time slot picker with availability counts
- **Nearest branch finder** — browser Geolocation API with sorted branch cards
- **Email verification** — complete flow with resend support
- **Password reset** — forgot/reset flow with token expiry
- **Contact form** — validated submission to backend
- **Staff dashboard** — counter console, ticket history, day control
- **Manager panel** — overview, branch, staff, counters, tickets, analytics tabs
- **Admin dashboard** — branch management, staff management, inline editing
- **Error boundary** — catches runtime errors with fallback UI
- **Responsive** — mobile-first across all pages
- **Accessibility** — `prefers-reduced-motion` respected for all animations

## Pages

| Route                | Component      | Access              | Description                          |
| -------------------- | -------------- | ------------------- | ------------------------------------ |
| `/`                  | Landing        | Public              | Marketing landing page               |
| `/login`             | Login          | Public              | Customer login                       |
| `/admin-login`       | AdminLogin     | Public              | Admin login                          |
| `/register`          | Register       | Public              | Customer registration                |
| `/boards`            | Boards         | Public              | All-branches live board hub          |
| `/board/:branchId`   | Board          | Public              | Per-branch live board                |
| `/branch/:branchId`  | Branch         | Public              | Branch info + queue status           |
| `/kiosk/:branchId`   | Kiosk          | Public              | Kiosk check-in                       |
| `/appointment/:bid`  | Appointment    | Public              | Appointment booking                  |
| `/find-nearby`       | NearestBranch  | Public              | Geolocation branch finder            |
| `/contact`           | Contact        | Public              | Contact form                         |
| `/account`           | CustomerHome   | Customer            | Dashboard, active ticket, join queue |
| `/staff`             | StaffHome      | Staff, Manager, Admin | Counter console, management panels |
| `/settings`          | Settings       | Any authenticated   | Profile, verification, password      |
| `/forgot-password`   | ForgotPassword | Public              | Request password reset               |
| `/reset-password`    | ResetPassword  | Public              | Reset password with token            |
| `/verify-email`      | VerifyEmail    | Public              | Email verification                   |

## Folder Structure

```
src/
  components/
    AgentChat/         # AI assistant floating chat widget
    AdvancedAnalytics/ # Peak hours heatmap, leaderboard, wait targets, webhooks
    ErrorBoundary/     # React error boundary
    Footer/
    MotionBackground/
    Navbar/
  features/
    agent/             # AI agent API functions
    auth/              # AuthContext, ProtectedRoute, authApi
    manager/           # Manager API functions
    staff/             # Staff hooks (useMyCounter, useMyStats)
    theme/             # ThemeContext (dark/light)
    tickets/           # useMyTicket hook with Socket.io
    admin/             # Admin API functions
  lib/
    apiClient.js       # HTTP client with auth interceptor
  pages/
    Landing/
    Login/
    Register/
    CustomerHome/
    StaffHome/
      CounterConsole.jsx
      TicketHistory.jsx
      admin/           # AdminPanel, BranchesTab, StaffTab
      manager/         # ManagerPanel, OverviewTab, AnalyticsTab, etc.
    Board/
    Boards/
    Branch/
    Kiosk/
    Appointment/
    NearestBranch/
    Contact/
    Settings/
    ForgotPassword/
    ResetPassword/
    VerifyEmail/
    AdminLogin/
    NotFound/
  styles/
    global.css         # design tokens + base styles
  App.jsx              # Routes + lazy loading + ErrorBoundary
  main.jsx
```

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running (see `../backend/README.md`)

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create a `.env` file in the frontend root:

| Variable     | Required | Default                      | Description           |
| ------------ | -------- | ---------------------------- | --------------------- |
| `VITE_API_URL`| No      | `http://localhost:3000/api`  | Backend API base URL  |

### Running

```bash
npm run dev     # development server
npm run build   # production build
npm run preview # preview production build
```

### Testing

```bash
npm test        # single run
npm run test:watch  # watch mode
```

## Code Splitting

All 18 page components are lazy-loaded via `React.lazy()` with a `<Suspense>` fallback. This reduces the main bundle from ~670KB to ~240KB, with each page loading as a separate chunk on demand.

## Accessibility

CSS-based motion respects `prefers-reduced-motion` globally. GSAP animations are guarded through `src/utils/prefersReducedMotion.js`.

## License

ISC
