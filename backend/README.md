# Cue — Backend API

Cue's backend is a hosted, multi-tenant queue integration service. It provides public guest ticket APIs, a JWT-authenticated operations dashboard, and a scoped API-key integration API. Banks use their own customer-facing applications; Cue's frontend customer pages are a proof-of-concept.

## Features

- Public guest ticket creation, lookup, and cancellation
- Branch, queue, counter, ticket, and appointment management
- Staff-only ticket serving operations
- Manager branch oversight and analytics
- Bank-admin team and branch provisioning
- Superadmin platform console for API keys, usage, and key requests
- Four identity collections: `Staff`, `Manager`, `Admin`, and `Superadmin`
- JWT `kind` and `role` claims with model-aware authentication dispatch
- Scoped, bcrypt-hashed API keys with rate limits, expiry, suspension, revocation, and rotation
- Bank isolation through `bankScope` and `tenantMatch`
- One-time encrypted bank-admin API-key reveal using AES-256-GCM
- Socket.io live board and ticket events
- Appointment and kiosk flows
- OpenAPI route catalog and Swagger UI

## Tech stack

| Layer          | Choice                  |
| -------------- | ----------------------- |
| Runtime        | Node.js ESM             |
| Framework      | Express 5               |
| Database       | MongoDB + Mongoose      |
| Real-time      | Socket.io               |
| Authentication | JWT, bcrypt             |
| Validation     | express-validator       |
| Documentation  | OpenAPI 3 + Swagger UI  |
| Key encryption | Node crypto AES-256-GCM |
| Testing        | Vitest                  |

## API documentation

The complete route catalog is [`src/docs/openapi.yaml`](./src/docs/openapi.yaml).

When the server is running:

- Swagger UI: `GET /api/docs`
- OpenAPI JSON: `GET /api/docs/openapi.json`

The OpenAPI document covers system, authentication, dashboard, public v1, authenticated v1, platform, branch, staff, manager, ticket, analytics, kiosk, appointment, webhook, and integration routes. Authenticated v1 operations include their required API-key scope as an `x-required-scope` extension.

## Authentication surfaces

### Dashboard JWT

```http
Authorization: Bearer <jwt>
```

JWTs contain `{ id, kind, role }`. `kind` selects the identity model: `staff`, `manager`, `admin`, or `superadmin`.

| Identity   | Login endpoint                 | Dashboard access               |
| ---------- | ------------------------------ | ------------------------------ |
| Staff      | `POST /api/auth/login/staff`   | `/staff`                       |
| Manager    | `POST /api/auth/login/manager` | `/staff` with branch oversight |
| Bank admin | `POST /api/auth/login/admin`   | `/staff` and `/integration`    |
| Superadmin | `POST /api/platform/login`     | `/platform`                    |

Bank admins onboard through `POST /api/auth/register/admin` using the server-configured `X-Admin-Registration-Secret`; the bank name must be the verified onboarding tenant. Managers and staff are provisioned with invites or server-generated temporary passwords.

### Public guest API

No JWT or API key is required:

```text
GET   /api/v1/queues
POST  /api/v1/tickets
GET   /api/v1/tickets/public/:id
PATCH /api/v1/tickets/:id/cancel
```

Public ticket creation returns a one-time `publicToken`. Send it as `X-Ticket-Token` or the `token` query parameter for public status lookup and cancellation. Ticket IDs alone are not sufficient for public cancellation.

### Authenticated integration API

```http
X-API-Key: cue_<key>
```

Authenticated v1 requests pass through:

```text
authenticateApiKey
  → resolveStaffUser
  → tenantMatch
  → apiKeyRateLimit
  → bankScope
  → resource router
```

Every request is restricted to the API key's bank. Scope checks use the key's `scopes` array; the `admin` scope bypasses individual scope checks.

Available scopes:

| Scope             | Access                                                              |
| ----------------- | ------------------------------------------------------------------- |
| `branches:read` | Read branches and boards |
| `branches:write` | Create, update, and delete branches |
| `tickets:read` | Ticket status, branch tickets, and ticket reads |
| `tickets:write` | Ticket creation, cancellation, calling, completion, and day control |
| `staff:read` | Staff listing |
| `staff:write` | Staff provisioning, queue assignment, and deactivation |
| `queues:read` | Queue reads |
| `queues:write` | Queue creation, updates, and deletion |
| `counters:read` | Counter reads |
| `counters:write` | Counter creation, assignment, opening, and closing |
| `analytics:read` | Analytics and staff-performance reports |
| `webhooks:manage` | Webhook operations |
| `admin` | Full access; reserved for superadmin-created keys |

### API key test connection

`GET /api/test-connection` validates an active key without requiring a scope or consuming the v1 rate limiter. It returns the key's bank, prefix, scopes, rate limit, active state, and creation time.

## Route groups

| Prefix                      | Authentication        | Purpose                                                                |
| --------------------------- | --------------------- | ---------------------------------------------------------------------- |
| `/health`                   | Public                | Service health                                                         |
| `/api/auth/*`               | Public/JWT            | Four-role login, registration, invitations, identity, password changes |
| `/api/users/*`              | JWT                   | Current profile and password                                           |
| `/api/branches/*`           | Public/JWT            | Public branch details, nearest-branch search, branch administration    |
| `/api/staff/*`              | Public/JWT            | Staff login, listing, provisioning, queue assignment, deactivation     |
| `/api/managers/*`           | JWT admin             | Manager provisioning and branch assignment                             |
| `/api/admin/*`              | JWT admin             | Bank overview and API-key requests                                     |
| `/api/queues/*`             | Public/JWT            | Public queue lookup and queue administration                           |
| `/api/counters/*`           | JWT                   | Counter creation, assignment, opening, and closing                     |
| `/api/tickets/*`            | Public/JWT            | Guest tickets and staff serving operations                             |
| `/api/analytics/*`          | JWT                   | Branch analytics and reports                                           |
| `/api/advanced-analytics/*` | JWT                   | Peak hours, leaderboard, and wait targets                              |
| `/api/board/*`              | Public                | Public board hub and branch boards                                     |
| `/api/kiosk/*`              | Public                | Kiosk ticket flow                                                      |
| `/api/appointments/*`       | Public                | Legacy guest appointment flow                                          |
| `/api/webhooks/*`           | JWT                   | Webhook lifecycle                                                      |
| `/api/platform/*`           | Public/JWT superadmin | Platform login, keys, usage, and key-request review                    |
| `/api/v1/*`                 | Public/API key        | Customer guest flow and bank integration API                           |
| `/api/test-connection`      | API key               | Key validation                                                         |
| `/api/docs/*`               | Public                | OpenAPI JSON and Swagger UI                                            |

See the OpenAPI document for the complete method/path list and operation summaries.

## Project structure

```text
src/
  config/       database and environment configuration
  controllers/  route handlers
  docs/         OpenAPI YAML
  middlewares/  JWT, API-key, tenant, validation, rate limiting, audit, errors
  models/       Staff, Manager, Admin, Superadmin, branches, queues, tickets, keys
  routes/       legacy, dashboard, platform, and v1 routers
  scripts/      superadmin, single-admin, full development fixture, API-key seeds, migrations
  services/     webhooks and supporting services
  utils/        responses, pagination, key encryption, validation helpers
  validators/   express-validator rule sets
  app.js        Express app and route mounting
  server.js     HTTP, database, Socket.io, and jobs startup
  socket.js     Socket.io setup and event helpers
```

## Getting started

### Prerequisites

- Node.js 18+
- MongoDB 6+ or MongoDB Atlas
- OpenSSL-compatible Node runtime for AES-256-GCM

### Install

```bash
cd backend
npm install
cp .env.example .env
```

Set at least `MONGO_URI` and `JWT_SECRET`. Set `KEY_WRAP_SECRET` independently in production for key-reveal encryption.

### Seed the platform operator

```bash
npm run seed:superadmin
```

The superadmin is the only account intended to be seeded in production. Bank admins onboard through the protected registration endpoint; managers and staff are provisioned at runtime.

### Seed the full local test graph

For a realistic two-bank development environment:

```bash
npm run seed:dev
```

This idempotently creates:

- One superadmin
- Two bank admins: `Wema Bank` and `Demo Trust Bank`
- Three branches for each bank
- Two queues per branch: `Teller` and `Customer Service`
- One manager per bank
- Four staff accounts per bank
- Three counters per bank, assigned to staff across the branches

The script uses `SEED_DEFAULT_PASSWORD` for seeded accounts. It prints all generated login emails and the shared password once. It does not create API keys; use the superadmin console or `npm run seed:apikey` for API-key testing.

### Run

```bash
npm run dev
npm start
```

### Test

```bash
npm test
npm run test:watch
```

The backend currently has 144 passing tests across 18 test files.

## Environment variables

See [`.env.example`](./.env.example) for the complete template.

| Variable                 |   Required | Description                                                            |
| ------------------------ | ---------: | ---------------------------------------------------------------------- |
| `MONGO_URI`              |        Yes | MongoDB connection string                                              |
| `JWT_SECRET`             |        Yes | JWT signing secret                                                     |
| `JWT_EXPIRES_IN`         |         No | JWT lifetime, default `1d`                                             |
| `PORT`                   |         No | HTTP port, default `3000`                                              |
| `CORS_ORIGIN`            |         No | Allowed frontend origin                                                |
| `KEY_WRAP_SECRET` | Production | AES-256-GCM secret for one-time key reveal; falls back to `JWT_SECRET` |
| `ADMIN_REGISTRATION_SECRET` | Yes for admin onboarding | Secret required in `X-Admin-Registration-Secret` when registering a bank admin |
| `TICKET_NO_SHOW_MINUTES` |         No | No-show timeout, default `5`                                           |
| `RESEND_API_KEY`         |   Optional | Email delivery                                                         |
| `RESEND_FROM`            |   Optional | Email sender                                                           |
| `SEED_SUPERADMIN_*`      |    Seeding | Superadmin bootstrap values                                            |
| `SEED_DEFAULT_PASSWORD`  |  Local dev | Shared password for the `seed:dev` fixture                            |
| `SEED_ADMIN_*`           |  Local dev | Optional legacy admin seed values                                      |
| `SEED_API_KEY_*`         |  Local dev | Optional local API-key seed values                                     |
| `BRAND_*`                |         No | Environment-only brand configuration                                   |

## Response format

Success:

```json
{
  "status": "success",
  "message": "Request completed",
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "status": "error",
  "message": "Request failed",
  "errors": ["Optional validation details"]
}
```

Authenticated v1 rate-limit responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` when the limit is exceeded.

## Real-time events

Clients can connect to Socket.io and join rooms:

```js
socket.emit("branch:join", branchId);
```

Common events include `queue:updated`, `ticket:called`, `ticket:completed`, `ticket:skipped`, `ticket:cancelled`, `ticket:recalled`, `day:opened`, and `day:closed`.

## License

ISC
