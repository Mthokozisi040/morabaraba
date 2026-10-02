const express = require("express");

const {
  testDatabaseConnection,
} = require("../config/database");

const router = express.Router();

router.get("/", async (req, res) => {
  res.json({
    success: true,
    data: {
      service: "Align It API",
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
  });
});

router.get("/database", async (req, res) => {
  try {
    const result =
      await testDatabaseConnection();

    res.json({
      success: true,
      data: {
        service: "Neon PostgreSQL",
        status: "connected",
        databaseTime: result.current_time,
      },
    });
  } catch (error) {
    console.error(
      "[HEALTH] Database health check failed:",
      error
    );

    res.status(503).json({
      success: false,
      error: {
        code: "DATABASE_UNAVAILABLE",
        message:
          "The database is currently unavailable.",
      },
    });
  }
});

module.exports = router;