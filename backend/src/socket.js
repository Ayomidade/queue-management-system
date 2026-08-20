import { Server } from "socket.io";

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    // Public: anyone (a lobby TV, a customer's phone) can watch a branch's live board
    socket.on("branch:join", (branchId) => {
      socket.join(`branch:${branchId}`);
    });

    // Private: a customer's own client listens for updates to their own ticket
    socket.on("user:join", (userId) => {
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
