# Smart Queue Management System — Backend API

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
- [Roadmap](#roadmap)

## Features

- **Role-based access** across four roles: customer, staff, manager, admin
- **Multi-branch, multi-queue** support (services are scoped per branch)
- **Priority-aware dispatch** — staff pull the next waiting ticket with one call; priority tickets (elderly, disabled, VIP) are always served ahead of the regular line
- **Live position & ETA** — customers see how many people are ahead of them and an estimated wait time, calculated from recent service times for that queue
- **Real-time updates** via Socket.io — branch boards and a customer's own ticket status update instantly, no polling
- **Automatic no-show handling** — a called ticket that's never served expires back to "skipped" on its own
- **Branch analytics** — live dashboard, end-of-day reports, and per-staff performance tracking, all scoped to a manager's own branch
- **Email notifications** on ticket creation, ticket call, and staff onboarding
- **Consistent response envelope** across every endpoint
- **Rate-limited auth** to slow down brute-force attempts

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| Database | MongoDB + Mongoose |
| Real-time | Socket.io |
| Auth | JWT, bcrypt |
| Validation | express-validator |
| Email | Nodemailer |
| Rate limiting | express-rate-limit |

## Roles & Access

| Role | Scope | Can do |
|---|---|---|
| **customer** | self only | join a queue, view their own active ticket (with live position/ETA), cancel their own ticket |
| **staff** | one counter, one branch | pull/call the next ticket, complete or skip a ticket, close their own assigned counter |
| **manager** | one branch | everything staff can, plus: create/deactivate staff in their branch, full counter control (open, close, assign, unassign any counter in-branch), ticket overrides (recall a skipped ticket, flag priority), branch analytics, daily reports, staff performance |
| **admin** | entire network | branches, queues, staff of any role/branch, cross-branch staff reassignment, network-wide access to everything managers can do per-branch |

Customers and admins live in the `User` collection; staff and managers live in a separate `Staff` collection with their own login.

## Project Structure

```
src/
  config/         # database connection
  controllers/    # request handlers
  jobs/           # background jobs (no-show sweeper)
  middlewares/    # auth, validation, error handling, rate limiting
  models/         # Mongoose schemas
  routes/         # route definitions
  scripts/        # one-off scripts (admin seeding)
  services/       # email sending
  utils/          # shared response helpers
  validators/     # express-validator rule sets
  app.js          # Express app + route mounting
  server.js       # HTTP server, DB connection, socket + job startup
  socket.js       # Socket.io initialization and emit helpers
```

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB instance (local or Atlas)
- SMTP credentials for outgoing email (a service like Mailtrap works for local development)

### Installation

```bash
git clone <repo-url>
cd smart-queue-management-system
npm install
```

### Environment Variables

Create a `.env` file in the project root:

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | Port the server listens on |
| `MONGO_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | Secret used to sign auth tokens |
| `SMTP_HOST` | Yes | — | SMTP server host |
| `SMTP_PORT` | Yes | — | SMTP server port |
| `SMTP_USER` | Yes | — | SMTP username |
| `SMTP_PASS` | Yes | — | SMTP password |
| `SMTP_FROM` | Yes | — | "From" address for outgoing email |
| `CORS_ORIGIN` | No | `*` | Allowed origin for Socket.io connections |
| `TICKET_NO_SHOW_MINUTES` | No | `5` | Minutes a "called" ticket waits before auto-expiring to "skipped" |
| `SEED_ADMIN_EMAIL` | Only for seeding | — | Email for the one-time admin bootstrap script |
| `SEED_ADMIN_PASSWORD` | Only for seeding | — | Password for the bootstrap admin (min 8 characters) |
| `SEED_ADMIN_NAME` | No | `System Admin` | Display name for the bootstrap admin |

### Bootstrap your first admin

Public registration always creates a `customer` account, there's no HTTP path to `admin`, on purpose. Create the first one with:

```bash
npm run seed:admin
```

This refuses to run again once an admin already exists. Remove `SEED_ADMIN_PASSWORD` from `.env` once it's done, there's no reason for it to stay there.

### Running the server

```bash
npm run dev     # development, with nodemon
npm start       # production
```

## API Reference

All routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Auth — `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Register a customer account |
| POST | `/login` | Public | Log in (customer or admin) |

### Staff Auth & Management — `/api/staff`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/login` | Public | Staff/manager login |
| POST | `/` | Admin, Manager | Create a staff account (manager is locked to their own branch, role forced to `staff`) |
| GET | `/` | Admin, Manager | List staff (manager sees only their branch) |
| PATCH | `/:staffId/assign` | Admin | Move staff to a different branch |
| DELETE | `/:staffId` | Admin, Manager | Deactivate a staff account (manager can't deactivate other managers) |

### Users — `/api/users`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/profile` | Any authenticated account | Get the logged-in account's own profile |
| GET | `/admin-only` | Admin | Demo endpoint confirming admin access |

### Branches — `/api/branches`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Admin | Create a branch |
| GET | `/` | Admin | List all branches |
| GET | `/:id` | Admin | Get a single branch |
| DELETE | `/:id` | Admin | Delete a branch |

### Queues — `/api/queues`

A queue represents one service offered at a branch (e.g. "Loan Services").

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Admin | Create a queue for a branch |
| GET | `/` | Any authenticated account | List active queues |
| PUT | `/:id` | Admin | Update a queue |
| DELETE | `/:id` | Admin | Delete a queue |

### Counters — `/api/counters`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Admin, Manager | Create a counter (manager's is locked to their own branch) |
| GET | `/:branchId` | Admin, Manager, Staff | List counters for a branch |
| PATCH | `/:counterId/assign-staff` | Admin, Manager | Assign a staff member to a counter |
| PATCH | `/:counterId/unassign-staff` | Admin, Manager | Pull a staff member off a counter |
| PATCH | `/:counterId/open` | Admin, Manager | Reopen a counter |
| PATCH | `/:counterId/close` | Admin, Manager, Staff | Close a counter (staff can only close their own) |

### Tickets — `/api/tickets`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Customer | Join a queue, get a ticket |
| GET | `/my-ticket` | Customer | Get their active ticket, with live `position` and `estimatedWaitMinutes` |
| PATCH | `/:id/cancel` | Customer | Cancel their own ticket |
| POST | `/call-next` | Staff, Manager, Admin | Pull the next waiting ticket for a queue (priority-aware) |
| PATCH | `/:id/call` | Staff, Manager, Admin | Manually call a specific ticket, out of order |
| PATCH | `/:id/complete` | Staff, Manager, Admin | Mark a ticket completed |
| PATCH | `/:id/skip` | Staff, Manager, Admin | Mark a ticket skipped |
| PATCH | `/:id/recall` | Manager, Admin | Recall a skipped ticket back into the queue |
| PATCH | `/:id/priority` | Manager, Admin | Flag a ticket as priority |

### Analytics — `/api/analytics`

All scoped: managers only see their own branch, admin can view any branch.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/branch/:branchId` | Admin, Manager | Live dashboard: queue lengths, today's ticket counts, average wait, counter status |
| GET | `/branch/:branchId/daily-report?date=` | Admin, Manager | End-of-day summary (defaults to today) |
| GET | `/branch/:branchId/staff-performance?date=` | Admin, Manager | Tickets served per staff member (defaults to today) |

### Email — `/api/email`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/welcome` | Public | Send a welcome email |

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
socket.emit("branch:join", branchId); // live branch board (queue lengths, now-serving)
socket.emit("user:join", userId);     // updates about the customer's own ticket
```

| Event | Room | Fired when |
|---|---|---|
| `queue:updated` | `branch:{branchId}` | A new ticket is created |
| `ticket:called` | `branch:{branchId}`, `user:{userId}` | A ticket is called (next or manual) |
| `ticket:completed` | same | A ticket is marked completed |
| `ticket:skipped` | same | Staff/manager skips a ticket |
| `ticket:no-show` | same | A called ticket auto-expires |
| `ticket:cancelled` | same | A customer cancels their ticket |
| `ticket:recalled` | same | A manager recalls a skipped ticket |

## Roadmap

- **AI agent** — a tool-using agent for customers (book/check/cancel a ticket, ask about wait times) and for staff/admin (natural-language operations summaries)
- **React + Vite frontend**
- **Stand-out features**: public live "Now Serving" board, QR/kiosk check-in, SMS/WhatsApp notifications, appointment booking, nearest-branch-with-shortest-wait finder

**Known limitation:** the ETA calculation assumes one active server per queue at a time. If a branch runs multiple counters on the same service in parallel, the estimate will run high, this needs counters tied to specific queues to fix properly.

## License

ISC