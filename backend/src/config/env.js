const dotenv = require("dotenv");

dotenv.config();

const requiredVariables = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
];

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    console.warn(
      `[ENV] Warning: ${variable} is not configured.`
    );
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",

  port: Number(process.env.PORT) || 3001,

  databaseUrl: process.env.DATABASE_URL || "",

  clerkSecretKey: process.env.CLERK_SECRET_KEY || "",

  clientUrl:
    process.env.CLIENT_URL || "http://localhost:3000",

  corsOrigins:
    process.env.CORS_ORIGINS ||
    "http://localhost:3000",

  rateLimitWindowMs:
    Number(process.env.RATE_LIMIT_WINDOW_MS) ||
    15 * 60 * 1000,

  rateLimitMaxRequests:
    Number(process.env.RATE_LIMIT_MAX_REQUESTS) ||
    200,
};

module.exports = env;