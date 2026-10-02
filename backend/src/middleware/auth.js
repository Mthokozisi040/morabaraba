const {
  clerkMiddleware,
  getAuth,
} = require("@clerk/express");

const env = require("../config/env");

const clerkAuthMiddleware = clerkMiddleware({
  secretKey: env.clerkSecretKey,
});

async function requireAuth(req, res, next) {
  try {
    const auth = getAuth(req);

    if (!auth || !auth.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message:
            "Authentication is required to access this resource.",
        },
      });
    }

    req.auth = auth;
    req.clerkUserId = auth.userId;

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  clerkAuthMiddleware,
  requireAuth,
};