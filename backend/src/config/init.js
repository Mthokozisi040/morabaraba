const fs = require("fs");
const path = require("path");

const {
  pool,
  closeDatabaseConnection,
} = require("../config/database");

async function initializeDatabase() {
  try {
    console.log("[DATABASE] Starting database initialization...");

    const schemaPath = path.join(
      __dirname,
      "schema.sql"
    );

    const schema = fs.readFileSync(
      schemaPath,
      "utf8"
    );

    await pool.query(schema);

    console.log(
      "[DATABASE] Database schema initialized successfully."
    );
  } catch (error) {
    console.error(
      "[DATABASE] Database initialization failed:"
    );

    console.error(error);

    process.exitCode = 1;
  } finally {
    await closeDatabaseConnection();
  }
}

initializeDatabase();