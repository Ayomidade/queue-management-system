import express, { json, urlencoded } from "express";
import compression from "compression";
import errorHandler from "./middlewares/error.middleware.js";
import notFoundHandler from "./middlewares/notFound.js";
import auth_router from "./routes/auth.routes.js";
import branch_router from "./routes/branch.route.js";
import userRouter from "./routes/user.routes.js";
import staff_router from "./routes/staff.routes.js";
import queue_router from "./routes/queue.routes.js";
import counter_router from "./routes/counter.routes.js";
import ticketRouter from "./routes/ticket.routes.js";
import analyticsRouter from "./routes/analytics.routes.js";
import boardRouter from "./routes/board.routes.js";
import kioskRouter from "./routes/kiosk.routes.js";
import appointmentRouter from "./routes/appointment.routes.js";
import contactRouter from "./routes/contact.routes.js";
import agentRouter from "./routes/agent.routes.js";
import webhookRouter from "./routes/webhook.routes.js";
import staffImportRouter from "./routes/staffImport.routes.js";
import exportRouter from "./routes/export.routes.js";
import advancedAnalyticsRouter from "./routes/advancedAnalytics.routes.js";
import pushRouter from "./routes/push.routes.js";
import { sendSuccess } from "./utils/response.js";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import * as yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const openapiSpec = yaml.load(
  readFileSync(join(__dirname, "docs", "openapi.yaml"), "utf-8")
);

const app = express();
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);

// Body parser middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// routes handlers

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Smart Queue System API ",
  });
});

app.get("/health", (req, res) => {
  sendSuccess(res, {
    statusCode: 200,
    message: "Service is healthy",
    data: { ok: true },
  });
});
app.use("/api/auth", auth_router);
app.use("/api/branches/", branch_router);
app.use("/api/users", userRouter);
app.use("/api/staff", staff_router);
app.use("/api/queues", queue_router);
app.use("/api/counters", counter_router);
app.use("/api/tickets", ticketRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/board", boardRouter);
app.use("/api/kiosk", kioskRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/contact", contactRouter);
app.use("/api/agent", agentRouter);
app.use("/api/webhooks", webhookRouter);
app.use("/api/staff-import", staffImportRouter);
app.use("/api/export", exportRouter);
app.use("/api/advanced-analytics", advancedAnalyticsRouter);
app.use("/api/push", pushRouter);

// Swagger API docs
app.get("/api/docs/openapi.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(openapiSpec, null, 2));
});
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Cue API Documentation",
  }),
);

// error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
