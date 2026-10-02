const http = require("http");

const app = require("./app");

const env = require("./config/env");

const {
  testDatabaseConnection,
  closeDatabaseConnection,
} = require("./config/database");

const createSocketServer = require("./socket/socket");

const httpServer = http.createServer(app);

const io = createSocketServer(
  httpServer
);

let server;

async function startServer() {
  try {
    console.log(
      "[ALIGN IT] Starting backend..."
    );

    await testDatabaseConnection();

    console.log(
      "[DATABASE] Neon PostgreSQL connected."
    );

    server = httpServer.listen(
      env.port,
      () => {
        console.log("");
        console.log(
          "======================================"
        );
        console.log(
          "       ALIGN IT BACKEND SERVER"
        );
        console.log(
          "======================================"
        );
        console.log(
          `API: http://localhost:${env.port}`
        );
        console.log(
          `Environment: ${env.nodeEnv}`
        );
        console.log(
          "Socket.IO: enabled"
        );
        console.log(
          "======================================"
        );
        console.log("");
      }
    );
  } catch (error) {
    console.error(
      "[ALIGN IT] Failed to start server."
    );

    console.error(error);

    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(
    `\n[ALIGN IT] ${signal} received. Shutting down...`
  );

  try {
    io.close();

    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }

    await closeDatabaseConnection();

    console.log(
      "[ALIGN IT] Shutdown complete."
    );

    process.exit(0);
  } catch (error) {
    console.error(
      "[ALIGN IT] Shutdown error:",
      error
    );

    process.exit(1);
  }
}

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "[ALIGN IT] Uncaught exception:",
      error
    );

    shutdown("uncaughtException");
  }
);

process.on(
  "unhandledRejection",
  (reason) => {
    console.error(
      "[ALIGN IT] Unhandled rejection:",
      reason
    );

    shutdown("unhandledRejection");
  }
);

startServer();