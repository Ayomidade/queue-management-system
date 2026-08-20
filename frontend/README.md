# Cue — Frontend

The customer-and-branch-facing interface for the Smart Queue Management System. Built with React and Vite, on a design system grounded in the physical world of bank ledgers and queue tickets rather than generic SaaS conventions.

## Status

Design-first build. The public landing page is complete, running on placeholder data, no API calls yet. Customer app, staff dashboard, and manager/admin dashboards are still to come, see [Roadmap](#roadmap).

## Tech Stack

| Tool                  | Role                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------- |
| React + Vite          | App shell, dev server, build                                                           |
| Framer Motion         | Declarative component reveals (fades, mount transitions, mobile nav)                   |
| GSAP + ScrollTrigger  | Scroll-driven and timeline animation (kinetic type, marquee, scroll-scrubbed progress) |
| CSS Modules           | Scoped component styling                                                               |
| CSS custom properties | Design tokens (color, type, spacing)                                                   |

**Why two animation libraries:** Framer Motion handles per-component declarative reveals well, a card fading up when it scrolls into view, the mobile nav opening. GSAP's ScrollTrigger and timeline control handle the more choreographed pieces, the kinetic hero headline, the infinite marquee, the scroll-scrubbed progress rail, more cleanly than Framer Motion's viewport API can. Each is used where it's the better tool, not layered redundantly.

## Design System

**Palette**, grounded in old bank ledgers and vault fixtures, not generic fintech blue or dark-mode neon:

| Token            | Hex       | Role                                                      |
| ---------------- | --------- | --------------------------------------------------------- |
| `--ink`          | `#101F17` | Near-black forest green, dark sections                    |
| `--ink-raised`   | `#1B3324` | Lifted surface on dark                                    |
| `--paper`        | `#EFE6CF` | Aged ledger paper, light sections                         |
| `--paper-raised` | `#E2D3A8` | Card surface on light                                     |
| `--verdigris`    | `#4FA37B` | Primary interactive accent, oxidized copper               |
| `--brass`        | `#C9A227` | Fine-detail accent, gold-leaf lettering                   |
| `--signal`       | `#C1432B` | Alert/live states only (rubber-stamp red), used sparingly |

**Type:**

- **Fraunces** — display and headlines, editorial character
- **IBM Plex Sans** — body copy
- **IBM Plex Mono** — anything number-shaped: ticket numbers, stats, terminal-style readouts (IBM's own history building bank teller terminals made this an easy, well-justified pick)

**Signature elements:**

- A split-flap "Now Serving" board in the hero (`components/Hero/SplitFlapBoard.jsx`)
- A kinetic word-reveal headline (`components/Hero/KineticHeadline.jsx`)
- An infinite GSAP marquee of live branch activity (`components/Marquee`)
- A scroll-scrubbed progress rail through the "How it Works" steps

## Folder Structure

Each section of the page owns its own folder: component, styles, and any sub-components only it uses, so nothing requires hunting across a flat directory.

```
src/
  lib/
      apiClient.js
    features/
      auth/
        AuthContext.jsx
        authApi.js
        ProtectedRoute.jsx
  pages/
    Login/
      Login.jsx
      Login.module.css
    Register/
      Register.jsx
    CustomerHome/
      CustomerHome.jsx
      CustomerHome.module.css
    StaffHome/
      StaffHome.jsx
  components/
    Navbar/
    Hero/
      Hero.jsx
      Hero.module.css
      KineticHeadline.jsx
      FlapUnit.jsx
      FlapUnit.module.css
      SplitFlapBoard.jsx
      SplitFlapBoard.module.css
    Marquee/
    StatsStrip/
    HowItWorks/
    FeaturesGrid/
    CTASection/
    Footer/
  styles/
    global.css       # design tokens + base styles
  utils/
    prefersReducedMotion.js
  App.jsx
  main.jsx
```

## Getting Started

```bash
npm create vite@latest . -- --template react
npm install framer-motion gsap
```

Add font links to `index.html`'s `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

```bash
npm run dev
```

## Accessibility

CSS-based motion respects `prefers-reduced-motion` globally. Because GSAP animations run in JavaScript, not CSS, they're guarded separately through `src/utils/prefersReducedMotion.js`, checked before the kinetic headline, marquee, and scroll rail run.

## Roadmap

- Customer app: join a queue, track a ticket, live position/ETA
- Staff counter dashboard: call next, complete, skip
- Manager/admin dashboards: analytics, staff and counter management
- Wire up the real API (currently placeholder data throughout)
