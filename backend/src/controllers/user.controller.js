const {
  findUserByClerkId,
  findUserByUsername,
  createUser,
  updateUser,
} = require("../services/user.service");

const {
  successResponse,
  errorResponse,
} = require("../utils/apiResponse");

async function getCurrentUser(req, res, next) {
  try {
    const user = await findUserByClerkId(
      req.clerkUserId
    );

    if (!user) {
      return errorResponse(
        res,
        "PROFILE_NOT_FOUND",
        "Your Align It profile has not been created yet.",
        404
      );
    }

    return successResponse(res, {
      user,
    });
  } catch (error) {
    next(error);
  }
}

async function createCurrentUser(req, res, next) {
  try {
    const existingUser = await findUserByClerkId(
      req.clerkUserId
    );

    if (existingUser) {
      return successResponse(res, {
        user: existingUser,
        created: false,
      });
    }

    const {
      username,
      displayName,
      country,
      avatarUrl,
    } = req.validatedBody;

    const existingUsername =
      await findUserByUsername(username);

    if (existingUsername) {
      return errorResponse(
        res,
        "USERNAME_TAKEN",
        "That username is already in use.",
        409
      );
    }

    const user = await createUser({
      clerkUserId: req.clerkUserId,
      username,
      displayName,
      country,
      avatarUrl,
    });

    return successResponse(
      res,
      {
        user,
        created: true,
      },
      201
    );
  } catch (error) {
    if (error.code === "23505") {
      return errorResponse(
        res,
        "DUPLICATE_RESOURCE",
        "The username or account already exists.",
        409
      );
    }

    next(error);
  }
}

async function updateCurrentUser(req, res, next) {
  try {
    const user = await findUserByClerkId(
      req.clerkUserId
    );

    if (!user) {
      return errorResponse(
        res,
        "PROFILE_NOT_FOUND",
        "Your Align It profile was not found.",
        404
      );
    }

    const updatedUser = await updateUser(
      user.id,
      req.validatedBody
    );

    return successResponse(res, {
      user: updatedUser,
    });
  } catch (error) {
    if (error.code === "23505") {
      return errorResponse(
        res,
        "USERNAME_TAKEN",
        "That username is already in use.",
        409
      );
    }

    next(error);
  }
}

async function getUserByUsername(req, res, next) {
  try {
    const { username } = req.params;

    const user = await findUserByUsername(username);

    if (!user) {
      return errorResponse(
        res,
        "USER_NOT_FOUND",
        "Player not found.",
        404
      );
    }

    return successResponse(res, {
      user,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCurrentUser,
  createCurrentUser,
  updateCurrentUser,
  getUserByUsername,
};