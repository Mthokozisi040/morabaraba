const {
  Server,
} = require("socket.io");

const {
  verifyToken,
} = require("@clerk/backend");

const env =
  require("../config/env");

const registerGameSocket =
  require("./game.socket");

const {
  registerLobbySocket,
} = require("./lobby.socket");

function createSocketServer(
  httpServer
) {
  const allowedOrigins =
    env.corsOrigins
      .split(",")
      .map(
        (origin) =>
          origin.trim()
      )
      .filter(Boolean);

  const io =
    new Server(
      httpServer,
      {
        cors: {
          origin:
            allowedOrigins,
          credentials: true,
        },

        transports: [
          "websocket",
          "polling",
        ],
      }
    );

  /*
   * Authenticate every Socket.IO
   * connection using a Clerk
   * session token.
   */
  io.use(
    async (socket, next) => {
      try {
        const token =
          socket.handshake.auth
            ?.token;

        if (!token) {
          return next(
            new Error(
              "Authentication required."
            )
          );
        }

        const options = {
          secretKey:
            env.clerkSecretKey,
        };

        /*
         * Only accept tokens intended
         * for our configured frontend.
         */
        if (
          allowedOrigins.length
        ) {
          options.authorizedParties =
            allowedOrigins;
        }

        const verifiedToken =
          await verifyToken(
            token,
            options
          );

        if (
          !verifiedToken?.sub
        ) {
          return next(
            new Error(
              "Invalid authentication token."
            )
          );
        }

        /*
         * Verified Clerk user ID.
         */
        socket.userId =
          verifiedToken.sub;

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
    }
  );

  io.on(
    "connection",
    (socket) => {
      console.log(
        `[SOCKET] Authenticated user connected: ${socket.userId}`
      );

      socket.emit(
        "socket:connected",
        {
          socketId:
            socket.id,

          userId:
            socket.userId,

          message:
            "Connected to Align It real-time server.",
        }
      );

      /*
       * Register all game events.
       */
      registerGameSocket(
        io,
        socket
      );
    }
  );

  console.log(
    "[SOCKET] Socket.IO server initialized."
  );

  return io;
}

module.exports =
  createSocketServer;