const express = require("express");

const {
  requireAuth,
} = require("../middleware/auth");

const {
  validateBody,
  isNonEmptyString,
  isValidUsername,
} = require("../middleware/validateRequest");

const {
  getCurrentUser,
  createCurrentUser,
  updateCurrentUser,
  getUserByUsername,
} = require("../controllers/user.controller");

const router = express.Router();

router.get(
  "/me",
  requireAuth,
  getCurrentUser
);

router.post(
  "/me",
  requireAuth,
  validateBody((body) => {
    const {
      username,
      displayName,
      country,
      avatarUrl,
    } = body;

    if (!isValidUsername(username)) {
      return {
        valid: false,
        message:
          "Username must contain 3-20 letters, numbers, or underscores.",
      };
    }

    if (
      displayName !== undefined &&
      displayName !== null &&
      !isNonEmptyString(displayName)
    ) {
      return {
        valid: false,
        message: "Display name must be a valid string.",
      };
    }

    if (
      country !== undefined &&
      country !== null &&
      !isNonEmptyString(country)
    ) {
      return {
        valid: false,
        message: "Country must be a valid string.",
      };
    }

    return {
      valid: true,
      data: {
        username: username.trim(),
        displayName:
          displayName?.trim() || null,
        country: country?.trim() || null,
        avatarUrl: avatarUrl?.trim() || null,
      },
    };
  }),
  createCurrentUser
);

router.patch(
  "/me",
  requireAuth,
  validateBody((body) => {
    const allowed = {};

    if (body.username !== undefined) {
      if (!isValidUsername(body.username)) {
        return {
          valid: false,
          message:
            "Username must contain 3-20 letters, numbers, or underscores.",
        };
      }

      allowed.username = body.username.trim();
    }

    if (body.displayName !== undefined) {
      allowed.displayName =
        body.displayName?.trim() || null;
    }

    if (body.country !== undefined) {
      allowed.country =
        body.country?.trim() || null;
    }

    if (body.avatarUrl !== undefined) {
      allowed.avatarUrl =
        body.avatarUrl?.trim() || null;
    }

    return {
      valid: true,
      data: allowed,
    };
  }),
  updateCurrentUser
);

router.get(
  "/:username",
  getUserByUsername
);

module.exports = router;