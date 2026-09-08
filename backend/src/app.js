import express, { json, urlencoded } from "express";
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
