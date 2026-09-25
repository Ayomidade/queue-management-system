# Cue — Hosted Queue Integration Service

Cue is a hosted, multi-tenant queue platform for banks. Customers interact with a bank's own application; that application uses Cue's public guest API to create and track tickets. Bank staff and managers use Cue's JWT-authenticated operations console, while bank integrations use scoped API keys against the authenticated v1 API.

## What Cue does

- Customers pull a ticket, see live position and estimated wait, and cancel their ticket without creating a Cue account.
- Staff call, complete, skip, and track tickets from assigned counters.
- Managers oversee a branch, manage staff and counters, and review analytics.
- Bank admins manage their bank's branches, teams, API-key requests, and integration keys.
- Platform superadmins review key requests and operate API keys and usage across banks.
- Socket.io events provide real-time board and ticket updates.

## Repository layout

```text
backend/   Express, MongoDB, Socket.io, JWT, API-key auth, OpenAPI
frontend/  React/Vite demo customer UI and JWT operations console
```

The frontend customer experience is a proof-of-concept. Production bank customers use the bank's own UI and call Cue's public API.

## API surfaces

### Public guest API

Public guest ticket operations return a one-time capability token for later status polling and cancellation. The demo stores that token locally; bank integrations should store it in the customer's session or secure receipt flow. These routes do not require an API key:

```text
GET   /api/v1/queues
POST  /api/v1/tickets
GET   /api/v1/tickets/public/:id
PATCH /api/v1/tickets/:id/cancel
```

### Bank integration API

Authenticated v1 routes use:

```http
X-API-Key: cue_<key>
```

They are restricted to the API key's bank, rate-limited per key, and checked against the key's scopes:

- `branches:read`, `branches:write`
- `tickets:read`, `tickets:write`
- `staff:read`, `staff:write`
- `queues:read`, `queues:write`
- `counters:read`, `counters:write`
- `analytics:read`
- `webhooks:manage`
- `admin` — superadmin-created keys only

The v1 integration pipeline also resolves a Staff identity. Requests can provide `X-Staff-Id` when the key has multiple permitted staff identities; otherwise the key's configured default staff identity is used.

### Operations dashboard

Dashboard and management routes use JWT Bearer tokens:

- `/api/auth/*` — four-role login, registration, invitations, identity, password changes
- `/api/branches/*`, `/api/staff/*`, `/api/managers/*` — bank operations
- `/api/admin/*` — bank admin overview and API-key requests
- `/api/platform/*` — superadmin platform operations

The complete route catalog is in [`backend/src/docs/openapi.yaml`](./backend/src/docs/openapi.yaml). Swagger UI is available at `/api/docs`, and the raw document is served at `/api/docs/openapi.json`.

## Authentication model

| Identity | Collection | Login |
|---|---|---|
| Staff | `Staff` | `POST /api/auth/login/staff` |
| Manager | `Manager` | `POST /api/auth/login/manager` |
| Bank admin | `Admin` | `POST /api/auth/register/admin` then `POST /api/auth/login/admin` |
| Platform operator | `Superadmin` | `POST /api/platform/login` |

JWTs carry `{ id, kind, role }`. The dashboard never uses an API key, and customers never need a Cue account or API key.

## API key lifecycle

1. A bank admin requests a key with a label, scopes, and rate limit.
2. A superadmin approves or rejects the request.
3. The raw key is shown once to the superadmin and encrypted for the bank admin's one-time reveal.
4. The bank admin reveals and copies the key into the bank's own system.
5. Cue stores only a bcrypt hash; plaintext key material is not retained after reveal.
6. Superadmins can suspend, revoke, or rotate keys. Rotation provides a grace period.

## Local development

Start MongoDB, then run the backend and frontend:

```bash
cd backend
cp .env.example .env
npm install
npm run seed:dev
npm run dev
```

`seed:dev` creates two banks with three branches, queues, managers, staff, and counters for local end-to-end testing. Set `SEED_DEFAULT_PASSWORD` in `backend/.env` first.

In another terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Default frontend API URL: `http://localhost:3000/api`.

Admin onboarding requires `ADMIN_REGISTRATION_SECRET` in the backend environment and the matching `X-Admin-Registration-Secret` header.

## Documentation

- [`UPDATE.md`](./UPDATE.md) — current product direction and phase status
- [`BUILD_PLAN.md`](./BUILD_PLAN.md) — implementation phases and work status
- [`backend/README.md`](./backend/README.md) — backend setup, auth, routes, and operations
- [`frontend/README.md`](./frontend/README.md) — frontend pages, routes, and setup
- [`backend/src/docs/openapi.yaml`](./backend/src/docs/openapi.yaml) — complete OpenAPI route catalog

## Verification

```bash
cd backend && npm test
cd frontend && npm test && npm run build
```

The current suite has 137 backend tests across 17 test files and 8 frontend tests.

## License

ISC
