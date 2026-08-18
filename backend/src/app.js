import express, { json, urlencoded } from "express";
import routes from "./routes/index.js";
import errorHandler from "./middlewares/error.middleware.js";
import notFoundHandler from "./middlewares/notFound.js";
import auth_router from "./routes/auth.routes.js";
import branch_router from "./routes/branch.route.js";
import userRouter from "./routes/user.routes.js";
import emailRouter from "./routes/email.routes.js";
import staff_router from "./routes/staff.routes.js";
import queue_router from "./routes/queue.routes.js";
import counter_router from "./routes/counter.routes.js";
import ticketRouter from "./routes/ticket.routes.js";
import analyticsRouter from "./routes/analytics.routes.js";
import { sendSuccess } from "./utils/response.js";

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use("/api/email", emailRouter);
app.use("/api/staff", staff_router);
app.use("/api/queues", queue_router);
app.use("/api/counters", counter_router);
app.use("/api/tickets", ticketRouter);
app.use("/api/analytics", analyticsRouter);

// error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
