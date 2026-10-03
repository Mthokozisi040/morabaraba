const express =
  require("express");

const cors =
  require("cors");

const helmet =
  require("helmet");

const rateLimit =
  require("express-rate-limit");

const morgan =
  require("morgan");

const gamesRoutes =
  require("./routes/games.routes");

const lobbyRoutes = 
  require("./routes/lobby.routes");

const userRoutes =
  require("./routes/user.routes");

const healthRoutes =
  require("./routes/health.routes");

const {
  clerkAuthMiddleware,
} = require("./middleware/clerk");

const env =
  require("./config/env");

const notFound =
  require("./middleware/notFound");

const errorHandler =
  require("./middleware/errorHandler");

const app =
  express();

app.disable(
  "x-powered-by"
);

app.set(
  "trust proxy",
  1
);

app.use(
  helmet({
    crossOriginResourcePolicy:
      false,
  })
);

const allowedOrigins =
  env.corsOrigins
    .split(",")
    .map(
      (origin) =>
        origin.trim()
    )
    .filter(Boolean);

app.use(
  cors({
    origin(
      origin,
      callback
    ) {
      /*
       * Allow non-browser requests.
       */
      if (!origin) {
        return callback(
          null,
          true
        );
      }

      if (
        allowedOrigins.includes(
          origin
        )
      ) {
        return callback(
          null,
          true
        );
      }

      return callback(
        new Error(
          "Origin is not allowed by CORS."
        )
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

if (
  env.nodeEnv !==
  "test"
) {
  app.use(
    morgan(
      env.nodeEnv ===
        "production"
        ? "combined"
        : "dev"
    )
  );
}

const limiter =
  rateLimit({
    windowMs:
      env.rateLimitWindowMs,

    limit:
      env.rateLimitMaxRequests,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      success: false,
      error: {
        code:
          "RATE_LIMITED",
        message:
          "Too many requests. Please try again later.",
      },
    },
  });

app.use(
  "/api",
  limiter
);

/*
 * Public root endpoint.
 */
app.get(
  "/",
  (req, res) => {
    res.json({
      success: true,
      data: {
        name:
          "Align It API",

        tagline:
          "Morabaraba. Connect. Strategize. Conquer.",

        version:
          "1.0.0",

        environment:
          env.nodeEnv,
      },
    });
  }
);

/*
 * Public health endpoint.
 */
app.use(
  "/api/health",
  healthRoutes
);


app.use(
  clerkAuthMiddleware
);

/*
 * Protected game API.
 */
app.use(
  "/api/games",
  gamesRoutes
);

app.use(
  "/api/lobby",
  lobbyRoutes
);


app.use(
  "/api/users",
  userRoutes
);

app.use(
  notFound
);

app.use(
  errorHandler
);

module.exports =
  app;