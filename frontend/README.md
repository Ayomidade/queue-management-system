# Cue — Frontend

Cue's frontend has two roles:

1. A public/demo customer experience for queue tickets, boards, kiosks, appointments, and branch discovery.
2. Cue's internal JWT operations console for staff, managers, bank admins, and superadmins.

Production bank customers use the bank's own application and call Cue's public `/api/v1` guest endpoints. The public pages in this frontend are a proof-of-concept and integration demonstration, not a required customer account system.

## Tech stack

| Tool                     | Role                                 |
| ------------------------ | ------------------------------------ |
| React 19 + Vite 8        | App shell, build, and code splitting |
| React Router 7           | Client-side routing                  |
| Framer Motion            | Declarative UI transitions           |
| GSAP                     | Board and landing-page animation     |
| Socket.io Client         | Live queue and ticket events         |
| CSS Modules              | Component-scoped styles              |
| Vitest + Testing Library | Frontend tests                       |

## Routes

### Public and demo routes

| Route                    | Page            | Purpose                                        |
| ------------------------ | --------------- | ---------------------------------------------- |
| `/`                      | `Landing`       | Product landing page                           |
| `/contact`               | `Contact`       | Contact/support form                           |
| `/ticket`                | `TicketPage`    | Pull a guest ticket and view its live status   |
| `/ticket/:ticketId`      | `TicketPage`    | Open a guest ticket by ID                      |
| `/boards`                | `Boards`        | Network-wide live board hub                    |
| `/board/:branchId`       | `Board`         | Real-time branch board and now-serving display |
| `/branch/:branchId`      | `Branch`        | Public branch information and queue status     |
| `/kiosk/:branchId`       | `Kiosk`         | Walk-in kiosk ticket creation and tracking     |
| `/appointment/:branchId` | `Appointment`   | Appointment slot booking and tracking          |
| `/find-nearby`           | `NearestBranch` | Geolocation-based branch finder                |
| `*`                      | `NotFound`      | Custom 404 page                                |

### Authentication routes

| Route             | Page                | Purpose                              |
| ----------------- | ------------------- | ------------------------------------ |
| `/login`          | Redirect            | Redirects to `/login/staff`          |
| `/login/staff`    | `LoginPage`         | Staff JWT login                      |
| `/login/manager`  | `LoginPage`         | Manager JWT login                    |
| `/login/admin`    | `LoginPage`         | Bank-admin JWT login                 |
| `/platform/login` | `PlatformLogin`     | Superadmin platform login            |
| `/platform`       | `PlatformDashboard` | Superadmin API-key and usage console |

### Protected operations routes

| Route          | Page               | Access                | Purpose                                 |
| -------------- | ------------------ | --------------------- | --------------------------------------- |
| `/staff`       | `StaffHome`        | Staff, Manager, Admin | Role-specific operations dashboard      |
| `/integration` | `IntegrationGuide` | Admin                 | Bank API integration guide and snippets |

`/staff` changes its tabs by identity:

- **Staff:** Console and ticket history
- **Manager:** Branch overview and management
- **Admin:** Bank overview and management

## Public ticket flow

The guest ticket pages use the public API directly and never attach a JWT or API key:

```text
GET   /api/v1/queues
POST  /api/v1/tickets
GET   /api/v1/tickets/public/:id
PATCH /api/v1/tickets/:id/cancel
```

Ticket status refreshes through polling and Socket.io events. The ticket identifier is stored in local storage so a customer can return to the status page.

## Operations console

The operations console uses JWT Bearer tokens from `AuthContext`.

### Staff

- View assigned counter and served-ticket stats
- Call the next ticket
- Call, complete, or skip a specific ticket
- View ticket history

Managers cannot serve tickets. They can oversee branch operations, manage staff and counters, control the branch day, and review analytics.

### Managers

- View branch analytics and queue status
- Manage staff and counter assignments
- Recall and prioritize tickets
- Open and close the branch day

### Bank admins

- View all branches in their bank
- Create branches
- Provision managers and staff
- View managers and staff counts
- Request API keys
- Reveal an approved key once
- View key health: active, suspended, or revoked
- Use integration snippets and test a revealed key

The admin integration surface includes cURL, JavaScript, Python, and Node examples. See `/integration` for the full guide.

### Superadmin

- Review and approve/reject bank API-key requests
- Create, suspend, revoke, and rotate API keys
- Inspect API usage and platform statistics

## Design system

Cue uses a Verdant Trust visual system:

| Token             | Value             | Use                               |
| ----------------- | ----------------- | --------------------------------- |
| `--brand-primary` | `#0d7c66`         | Primary actions and active states |
| `--brand-accent`  | `#c9a227`         | Secondary emphasis                |
| `--brand-alert`   | `#dc2626`         | Errors and destructive states     |
| `--paper`         | Light surface     | Cards and content surfaces        |
| `--ink`           | Dark text/surface | High-contrast text and dark UI    |

Theme and branding are environment-driven. The frontend supports light and dark themes and respects `prefers-reduced-motion`.

## Project structure

```text
src/
  components/       Shared navigation, footer, error boundary, animation, password UI
  features/
    auth/           AuthContext, ProtectedRoute, auth API
    board/          Live board hooks
    brand/          Environment-driven brand context
    kiosk/          Kiosk API
    staff/          Staff, manager, counter, analytics, and API-key API modules
    theme/          Light/dark theme context
    tickets/        Ticket API and guest ticket hook
  lib/              API client and error types
  pages/
    Landing/
    Contact/
    Login/
    Platform/
    TicketPage/
    Boards/
    Board/
    Branch/
    Kiosk/
    Appointment/
    NearestBranch/
    StaffHome/
    NotFound/
  App.jsx           Routes, providers, lazy loading, and error boundary
  main.jsx
```

## Getting started

### Prerequisites

- Node.js 18+
- Backend API running; see [`../backend/README.md`](../backend/README.md)

### Install and run

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Default API URL:

```text
VITE_API_URL=http://localhost:3000/api
```

### Build and test

```bash
npm run build
npm test
npm run lint
```

The current frontend suite has 8 passing tests. The production build is generated in `dist/`.

## Code splitting

Route pages are lazy-loaded with `React.lazy()` and a shared `Suspense` fallback. The main bundle stays separate from route chunks such as the staff console, platform console, ticket page, and integration guide.

## License

ISC
