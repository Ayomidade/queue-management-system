import { config } from "dotenv";
import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./socket.js";
import { startNoShowSweeper } from "./jobs/noShowSweeper.js";

config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);
  startNoShowSweeper();

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
