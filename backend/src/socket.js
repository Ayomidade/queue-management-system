import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.data.userId = decoded.id;
        socket.data.role = decoded.role;
      } catch {
        // Invalid token — proceed as anonymous (public board access only)
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    // Public: anyone (a lobby TV, a customer's phone) can watch a branch's live board
    socket.on("branch:join", (branchId) => {
      socket.join(`branch:${branchId}`);
    });

    // Private: a customer's own client listens for updates to their own ticket
    socket.on("user:join", (userId) => {
      // If authenticated, only allow joining your own room
      if (socket.data.userId && socket.data.userId !== userId) {
        return;
      }
      socket.join(`user:${userId}`);
    });
  });

  return io;
};

// Guarded so a socket hiccup never breaks the underlying REST flow
export const emitToBranch = (branchId, event, payload) => {
  if (!io) return;
  io.to(`branch:${branchId}`).emit(event, payload);
};

export const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};
