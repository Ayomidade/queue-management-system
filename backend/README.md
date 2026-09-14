# Cue — Backend API

A REST + real-time backend for managing customer queues across bank branches. Customers join a queue remotely and track their position and estimated wait time; staff pull the next customer with one call; managers run their branch; admins run the network.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Roles & Access](#roles--access)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Response Format](#response-format)
- [Real-Time Events](#real-time-events-socketio)

## Features

- **Role-based access** across four roles: customer, staff, manager, admin
- **Multi-branch, multi-queue** support (services are scoped per branch)
- **Priority-aware dispatch** — priority tickets (elderly, disabled, VIP) always served ahead
- **Live position & ETA** — customers see how many people are ahead and estimated wait time
- **Real-time updates** via Socket.io — branch boards and customer ticket status update instantly
- **Automatic no-show handling** — called tickets auto-expire to "skipped"
- **Branch analytics** — live dashboard, end-of-day reports, and per-staff performance tracking
- **AI Assistant** — natural-language queue operations and analytics summaries via Groq API
- **Kiosk & Appointment booking** — anonymous ticket creation and scheduled appointments
- **Public boards** — live "Now Serving" boards per branch and network-wide hub
- **Nearest branch finder** — geolocation-based branch discovery with live queue data
- **Contact form** — validated customer inquiries with email notifications
- **Webhook support** — subscribe to queue events via HTTP callbacks
- **Slack/Discord notifications** — get alerts for ticket calls, queue thresholds, day open/close
- **Browser push notifications** — VAPID-based Web Push for ticket status and queue alerts
- **Email notifications** — ticket created, called, completed, and cancelled emails via Resend
- **Audit log** — track who did what across the system
- **Bulk staff import** — CSV upload for onboarding multiple staff at once
- **Export analytics** — download reports as CSV or HTML
- **Peak hours heatmap** — visualize busiest times per branch
- **Staff leaderboard** — gamified daily/weekly/monthly performance rankings
- **Service-level wait time targets** — set expected handling times per queue, track on-target status
- **Compression** — gzip responses for faster transfers
- **Rate-limited auth** to slow down brute-force attempts
- **Automated tests** — 35 backend tests covering utils, middleware, and validators

## Tech Stack

| Layer         | Choice                |
| ------------- | --------------------- |
| Runtime       | Node.js (ESM)         |
| Framework     | Express 5             |
| Database      | MongoDB + Mongoose    |
| Real-time     | Socket.io             |
| Auth          | JWT, bcrypt           |
| Validation    | express-validator     |
| Email         | Resend SDK            |
| AI            | Groq API (LLaMA 3.3) |
| Rate limiting | express-rate-limit    |
| Compression   | compression           |
| File upload   | multer                |
| Testing       | vitest                |

## Roles & Access

| Role         | Scope                   | Can do                                                                                                                                                                                                                                                         |
| ------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **customer** | self only               | join a queue, view their own active ticket (with live position/ETA), cancel their own ticket, chat with AI assistant                                                                                                                                           |
| **staff**    | one counter, one branch | pull/call the next ticket, complete or skip a ticket, close their own assigned counter, chat with AI assistant (with analytics tools)                                                                                                                          |
| **manager**  | one branch              | everything staff can, plus: create/deactivate staff, full counter control, ticket overrides (recall, priority), branch analytics, daily reports, staff performance, wait time targets, bulk staff import, webhook management, export analytics, AI assistant    |
| **admin**    | entire network          | branches, queues, staff of any role/branch, cross-branch access, webhook management, network-wide analytics, AI assistant with full admin tools                                                                                                                |

Customers and admins live in the `User` collection; staff and managers live in a separate `Staff` collection with their own login.

## Project Structure

```
src/
  config/         # database connection
  controllers/    # request handlers
  jobs/           # background jobs (no-show sweeper)
  middlewares/    # auth, validation, error handling, rate limiting, audit logging
  models/         # Mongoose schemas
  routes/         # route definitions
  scripts/        # one-off scripts (admin seeding)
  services/       # email, Groq AI, webhooks, notifications
  utils/          # shared response helpers, pagination
  validators/     # express-validator rule sets
  app.js          # Express app + route mounting
  server.js       # HTTP server, DB connection, socket + job startup
  socket.js       # Socket.io initialization and emit helpers
```

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB instance (local or Atlas)
- Resend API key for outgoing email
- Groq API key for AI assistant (optional)

### Installation

```bash
git clone <repo-url>
cd backend
npm install
```

### Environment Variables

Create a `.env` file in the backend root:

| Variable                 | Required         | Default        | Description                                                       |
| ------------------------ | ---------------- | -------------- | ----------------------------------------------------------------- |
| `PORT`                   | No               | `3000`         | Port the server listens on                                        |
| `MONGO_URI`              | Yes              | —              | MongoDB connection string                                         |
| `JWT_SECRET`             | Yes              | —              | Secret used to sign auth tokens                                   |
| `RESEND_API_KEY`         | Yes              | —              | Resend API key for email                                          |
| `RESEND_FROM`            | No               | —              | "From" address for outgoing email                                 |
| `GROQ_API_KEY`           | No               | —              | Groq API key for AI assistant                                     |
| `GROQ_MODEL`             | No               | `llama-3.3-70b-versatile` | Groq model to use                                        |
| `CORS_ORIGIN`            | No               | `*`            | Allowed origin for CORS                                           |
| `TICKET_NO_SHOW_MINUTES` | No               | `5`            | Minutes a "called" ticket waits before auto-expiring to "skipped" |
| `SEED_ADMIN_EMAIL`       | Only for seeding | —              | Email for the one-time admin bootstrap script                     |
| `SEED_ADMIN_PASSWORD`    | Only for seeding | —              | Password for the bootstrap admin (min 8 characters)               |

### Bootstrap your first admin

```bash
npm run seed:admin
```

### Running the server

```bash
npm run dev     # development, with nodemon
npm start       # production
```

### Running tests

```bash
npm test        # single run
npm run test:watch  # watch mode
```

## API Reference

All routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Auth — `/api/auth`

| Method | Endpoint              | Access | Description                           |
| ------ | --------------------- | ------ | ------------------------------------- |
| POST   | `/register`           | Public | Register a customer account           |
| POST   | `/login`              | Public | Log in (customer or admin)            |
| POST   | `/verify-email`       | Public | Verify email address                  |
| POST   | `/resend-verification`| Public | Resend verification email             |
| POST   | `/forgot-password`    | Public | Request password reset                |
| POST   | `/reset-password`     | Public | Reset password with token             |

### Staff Auth & Management — `/api/staff`

| Method | Endpoint              | Access         | Description                                    |
| ------ | --------------------- | -------------- | ---------------------------------------------- |
| POST   | `/login`              | Public         | Staff/manager login                            |
| POST   | `/`                   | Admin, Manager | Create a staff account                         |
| GET    | `/`                   | Admin, Manager | List staff                                     |
| PATCH  | `/:staffId/assign`    | Admin          | Move staff to a different branch               |
| DELETE | `/:staffId`           | Admin, Manager | Deactivate a staff account                     |
| POST   | `/import`             | Admin, Manager | Bulk import staff from CSV                     |

### Branches — `/api/branches`

| Method | Endpoint | Access         | Description                 |
| ------ | -------- | -------------- | --------------------------- |
| POST   | `/`      | Admin          | Create a branch             |
| GET    | `/`      | Admin, Public  | List all active branches    |
| GET    | `/:id`   | Admin, Public  | Get a single branch         |
| PUT    | `/:id`   | Admin, Manager | Update branch details       |
| DELETE | `/:id`   | Admin          | Soft delete (sets isActive) |

### Tickets — `/api/tickets`

| Method | Endpoint        | Access                | Description                                                              |
| ------ | --------------- | --------------------- | ------------------------------------------------------------------------ |
| POST   | `/`             | Customer              | Join a queue, get a ticket                                               |
| GET    | `/my-ticket`    | Customer              | Get active ticket with live position/ETA                                 |
| PATCH  | `/:id/cancel`   | Customer              | Cancel own ticket                                                        |
| POST   | `/call-next`    | Staff, Manager, Admin | Pull next waiting ticket (priority-aware)                                |
| PATCH  | `/:id/call`     | Staff, Manager, Admin | Manually call a specific ticket                                          |
| PATCH  | `/:id/complete` | Staff, Manager, Admin | Mark ticket completed                                                    |
| PATCH  | `/:id/skip`     | Staff, Manager, Admin | Mark ticket skipped                                                      |
| PATCH  | `/:id/recall`   | Staff, Manager, Admin | Recall skipped ticket back into queue                                    |
| PATCH  | `/:id/priority` | Manager, Admin        | Flag ticket as priority                                                  |
| POST   | `/close-day`    | Manager               | Close the day, complete active tickets                                   |
| POST   | `/open-day`     | Manager               | Open the day for new tickets                                             |

### Kiosk — `/api/kiosk`

| Method | Endpoint                  | Access | Description                   |
| ------ | ------------------------- | ------ | ----------------------------- |
| POST   | `/tickets`                | Public | Create anonymous kiosk ticket  |
| GET    | `/tickets/:kioskId`       | Public | Track kiosk ticket status      |
| PATCH  | `/tickets/:kioskId/cancel`| Public | Cancel kiosk ticket            |

### Appointments — `/api/appointments`

| Method | Endpoint      | Access | Description                          |
| ------ | ------------- | ------ | ------------------------------------ |
| GET    | `/slots`      | Public | Available time slots for a date      |
| POST   | `/`           | Public | Book an appointment ticket           |
| GET    | `/:kioskId`   | Public | Look up appointment details          |

### Analytics — `/api/analytics`

| Method | Endpoint                                    | Access         | Description                                  |
| ------ | ------------------------------------------- | -------------- | -------------------------------------------- |
| GET    | `/branch/:branchId`                         | Admin, Manager | Live dashboard                               |
| GET    | `/branch/:branchId/daily-report?date=`      | Admin, Manager | End-of-day summary                           |
| GET    | `/branch/:branchId/staff-performance?date=` | Admin, Manager | Staff performance rankings                   |

### Advanced Analytics — `/api/advanced-analytics`

| Method | Endpoint                                       | Access         | Description                             |
| ------ | ---------------------------------------------- | -------------- | --------------------------------------- |
| GET    | `/branch/:branchId/peak-hours?days=`           | Admin, Manager | Peak hours heatmap data                 |
| GET    | `/branch/:branchId/leaderboard?period=`        | Admin, Manager | Staff leaderboard                       |
| GET    | `/branch/:branchId/wait-targets`               | Admin, Manager | Service wait time targets               |
| PUT    | `/branch/:branchId/wait-targets`               | Admin, Manager | Update wait time targets                |

### Webhooks — `/api/webhooks`

| Method | Endpoint       | Access         | Description             |
| ------ | -------------- | -------------- | ----------------------- |
| POST   | `/`            | Admin, Manager | Create a webhook        |
| GET    | `/`            | Admin, Manager | List webhooks           |
| DELETE | `/:id`         | Admin          | Delete a webhook        |
| PATCH  | `/:id/toggle`  | Admin          | Enable/disable webhook  |

### Export — `/api/export`

| Method | Endpoint                          | Access         | Description              |
| ------ | --------------------------------- | -------------- | ------------------------ |
| GET    | `/branch/:branchId/csv?date=`     | Admin, Manager | Export analytics as CSV  |
| GET    | `/branch/:branchId/pdf?date=`     | Admin, Manager | Export analytics as HTML |

### Agent — `/api/agent`

| Method | Endpoint | Access | Description                      |
| ------ | -------- | ------ | -------------------------------- |
| POST   | `/chat`  | Any    | Send messages to AI assistant    |

### Contact — `/api/contact`

| Method | Endpoint | Access | Description          |
| ------ | -------- | ------ | -------------------- |
| POST   | `/`      | Public | Submit contact form   |

## Response Format

Every endpoint returns the same envelope.

**Success:**

```json
{
  "status": "success",
  "message": "Ticket created successfully",
  "data": { "...": "..." }
}
```

**Error:**

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": ["Email is required"]
}
```

## Real-Time Events (Socket.io)

Clients connect and join rooms to receive live updates:

```js
socket.emit("branch:join", branchId); // live branch board
socket.emit("user:join", userId);     // customer's own ticket
```

| Event              | Room                                 | Fired when                          |
| ------------------ | ------------------------------------ | ----------------------------------- |
| `queue:updated`    | `branch:{branchId}`                  | A new ticket is created             |
| `ticket:called`    | `branch:{branchId}`, `user:{userId}` | A ticket is called                  |
| `ticket:completed` | same                                 | A ticket is completed               |
| `ticket:skipped`   | same                                 | Staff/manager skips a ticket        |
| `ticket:cancelled` | same                                 | A customer cancels their ticket     |
| `ticket:recalled`  | same                                 | Manager recalls a skipped ticket    |
| `day:opened`       | `branch:{branchId}`                  | Day is opened                       |
| `day:closed`       | `branch:{branchId}`                  | Day is closed                       |

## Testing

```bash
npm test        # run all tests
npm run test:watch  # watch mode
```

Tests cover utility functions, middleware (auth, validation, error handling), and response formatting.

## License

ISC
