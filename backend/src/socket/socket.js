const {
  Server,
} = require("socket.io");

const {
  clerkClient,
} = require("@clerk/backend");

const env = require("../config/env");

function createSocketServer(httpServer) {
  const allowedOrigins =
    env.corsOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },

    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token;

      if (!token) {
        return next(
          new Error("Authentication required.")
        );
      }

      const sessionClaims =
        await clerkClient.verifyToken(token, {
          secretKey: env.clerkSecretKey,
        });

      if (!sessionClaims?.sub) {
        return next(
          new Error("Invalid authentication token.")
        );
      }

      socket.userId = sessionClaims.sub;

      next();
    } catch (error) {
      console.error(
        "[SOCKET] Authentication failed:",
        error.message
      );

      next(
        new Error(
          "Socket authentication failed."
        )
      );
    }
  });

  io.on("connection", (socket) => {
    console.log(
      `[SOCKET] User connected: ${socket.userId}`
    );

    socket.on("disconnect", (reason) => {
      console.log(
        `[SOCKET] User disconnected: ${socket.userId} (${reason})`
      );
    });

    socket.on("ping:server", () => {
      socket.emit("pong:server", {
        timestamp: Date.now(),
      });
    });
  });

  return io;
}

module.exports = createSocketServer;