const {
  clerkMiddleware,
  getAuth,
} = require("@clerk/express");

const env = require("../config/env");

if (!env.clerkSecretKey) {
  console.warn(
    "[CLERK] CLERK_SECRET_KEY is not configured."
  );
}

const clerkAuthMiddleware =
  clerkMiddleware({
    secretKey: env.clerkSecretKey,
  });

function requireAuth(req, res, next) {
  try {
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    req.auth = auth;

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  clerkAuthMiddleware,
  requireAuth,
};