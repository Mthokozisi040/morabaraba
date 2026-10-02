function errorHandler(error, req, res, next) {
  console.error("[ERROR]", {
    method: req.method,
    url: req.originalUrl,
    message: error.message,
    stack:
      process.env.NODE_ENV === "development"
        ? error.stack
        : undefined,
  });

  if (res.headersSent) {
    return next(error);
  }

  const statusCode =
    error.statusCode ||
    error.status ||
    500;

  let code = "INTERNAL_SERVER_ERROR";

  if (statusCode === 400) {
    code = "BAD_REQUEST";
  }

  if (statusCode === 401) {
    code = "UNAUTHORIZED";
  }

  if (statusCode === 403) {
    code = "FORBIDDEN";
  }

  if (statusCode === 404) {
    code = "NOT_FOUND";
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message:
        statusCode >= 500
          ? "An unexpected server error occurred."
          : error.message,
    },
  });
}

module.exports = errorHandler;