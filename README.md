# Cue — Smart Queue Management System

A queue management platform built for banks: customers join a queue remotely and track their position in real time, staff clear the line with one button, and managers and admins get the visibility to run a branch, or a whole network, without a physical waiting room.

This repo holds both halves of the project.

```
/
  backend/     REST + real-time API (Node, Express, MongoDB, Socket.io)
  frontend/    Customer, staff, and admin-facing interface (React, Vite)
```

## The idea

Physical bank queues are a solved problem everywhere except the bank. Cue replaces the take-a-number machine with a system that:

- lets a customer pull a ticket from their phone and see their live position and estimated wait,
- lets staff pull the next customer with a single call, priority customers served first, automatically,
- lets a branch manager run their own branch, staff, counters, and analytics, without needing admin looped into every decision,
- lets a network admin see and manage every branch from one login,
- clears itself up when a called customer never shows.

## Status

| Piece       | Status                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend API | Built: auth, roles (customer/staff/manager/admin), branches, queues, counters, tickets, real-time updates, no-show handling, branch analytics |
| Frontend    | In progress: public landing page complete (placeholder data), customer/staff/admin apps not yet started                                       |
| AI agent    | Planned, not yet started                                                                                                                      |

See [`backend/README.md`](./backend/README.md) and [`frontend/README.md`](./frontend/README.md) for the details of each.

## Roles

| Role     | Scope                                                         |
| -------- | ------------------------------------------------------------- |
| Customer | Joins a queue, tracks their own ticket                        |
| Staff    | Runs one counter in one branch                                |
| Manager  | Runs one branch: staff, counters, ticket overrides, analytics |
| Admin    | Runs the network: every branch, every role                    |

## Roadmap

- Customer ticket app, staff counter dashboard, manager/admin dashboards
- Wire the frontend up to the real API
- AI agent: a tool-using assistant for customers (book/check/cancel a ticket) and for staff/admin (natural-language operations summaries)
- Stand-out features: public live board, QR/kiosk check-in, SMS/WhatsApp notifications, appointment booking, nearest-branch finder

## License

ISC
