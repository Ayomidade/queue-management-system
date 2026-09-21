import { Router } from "express";
import boardRouter from "./board.routes.js";
import branchRouter from "./branch.routes.js";
import queueRouter from "./queue.routes.js";
import counterRouter from "./counter.routes.js";
import ticketRouter from "./ticket.routes.js";
import kioskRouter from "./kiosk.routes.js";
import appointmentRouter from "./appointment.routes.js";
import { bankScope } from "../../middlewares/bankScope.middleware.js";
import { getme } from "../../controllers/v1Auth.controller.js";

/**
 * V1 Routes Index
 *
 * Mounts all v1 API routes under a common router.
 * The bankScope middleware is applied here so that all downstream
 * routes have access to req.bankBranchIds and req.bankFilter.
 *
 * Authentication (authenticateApiKey) and rate limiting (apiKeyRateLimit)
 * are applied at the app.js level before these routes are reached.
 *
 * Route structure:
 *   /api/v1/board/*          → boardRouter
 *   /api/v1/branches/*       → branchRouter
 *   /api/v1/queues/*         → queueRouter
 *   /api/v1/counters/*       → counterRouter
 *   /api/v1/tickets/*        → ticketRouter
 *   /api/v1/kiosk/*          → kioskRouter
 *   /api/v1/appointments/*   → appointmentRouter
 */

const v1Router = Router();

// Apply bank scope middleware to all v1 routes.
// This finds all branches belonging to the API key's bank
// and attaches them to req.bankBranchIds for downstream use.
v1Router.use(bankScope);

// Mount all v1 resource routes
v1Router.use("/board", boardRouter);
v1Router.use("/branches", branchRouter);
v1Router.use("/queues", queueRouter);
v1Router.use("/counters", counterRouter);
v1Router.use("/tickets", ticketRouter);
v1Router.use("/kiosk", kioskRouter);
v1Router.use("/appointments", appointmentRouter);
v1Router.get("/auth/me", getme)

export default v1Router;
