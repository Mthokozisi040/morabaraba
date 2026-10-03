const {
  clerkMiddleware,
  getAuth,
} = require("@clerk/express");

/*
 * Clerk middleware:
 *
 * Reads the Clerk session from the incoming
 * request and makes authentication information
 * available through getAuth(req).
 */
const clerkAuthMiddleware =
  clerkMiddleware();

/*
 * Require an authenticated Clerk user.
 *
 * We do NOT trust user IDs coming from
 * request bodies or URL parameters.
 */
function requireAuth(req, res, next) {
  try {
    const auth = getAuth(req);

    if (
      !auth ||
      !auth.isAuthenticated ||
      !auth.userId
    ) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message:
            "Authentication is required.",
        },
      });
    }

    /*
     * Store the verified Clerk user ID
     * on the request for convenient access.
     */
    req.clerkUserId = auth.userId;

    /*
     * Compatibility alias.
     */
    req.userId = auth.userId;

    /*
     * Keep the full auth object available.
     */
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