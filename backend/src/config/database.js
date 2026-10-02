// backend/src/config/database.js
const { Pool } = require("pg");
const env = require("./env");

if (!env.databaseUrl) {
  console.warn(
    "[DATABASE] DATABASE_URL is not configured."
  );
}

const pool = new Pool({
  connectionString: env.databaseUrl,

  ssl: {
    rejectUnauthorized: false,
  },

  max: 10,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 10000,
});

pool.on("connect", () => {
  console.log("[DATABASE] PostgreSQL client connected.");
});

pool.on("error", (error) => {
  console.error(
    "[DATABASE] Unexpected PostgreSQL pool error:",
    error
  );
});

async function testDatabaseConnection() {
  const result = await pool.query(
    "SELECT NOW() AS current_time"
  );

  return result.rows[0];
}

async function closeDatabaseConnection() {
  await pool.end();

  console.log("[DATABASE] Connection pool closed.");
}

module.exports = {
  pool,
  testDatabaseConnection,
  closeDatabaseConnection,
};