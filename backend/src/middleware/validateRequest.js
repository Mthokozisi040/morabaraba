function validateBody(schema) {
  return (req, res, next) => {
    try {
      const result = schema(req.body);

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: result.message || "Invalid request body.",
            details: result.details || null,
          },
        });
      }

      req.validatedBody = result.data || req.body;

      next();
    } catch (error) {
      next(error);
    }
  };
}

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isValidUsername(username) {
  if (!isNonEmptyString(username)) {
    return false;
  }

  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

module.exports = {
  validateBody,
  isNonEmptyString,
  isValidUsername,
};