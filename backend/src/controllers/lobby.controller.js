const lobbyService = require("../services/lobby.service");

const {
  successResponse,
  errorResponse,
} = require("../utils/apiResponse");

function handleError(res, error) {
  const statusMap = {
    SELF_CHALLENGE: 400,
    CHALLENGE_EXISTS: 409,
    CHALLENGE_NOT_FOUND: 404,
    CHALLENGE_NOT_PENDING: 409,
    CLERK_USER_NOT_FOUND: 404,
    OPPONENT_NOT_FOUND: 404,
    FORBIDDEN: 403,
  };

  const status =
    statusMap[error.code] || 500;

  return errorResponse(
    res,
    error.code || "LOBBY_ERROR",
    error.message || "Lobby request failed.",
    status
  );
}

async function getLobby(req, res, next) {
  try {
    const data =
      await lobbyService.getLobbyData(
        req.clerkUserId
      );

    return successResponse(res, data);
  } catch (error) {
    next(error);
  }
}

async function searchPlayers(req, res, next) {
  try {
    const players =
      await lobbyService.searchPlayers(
        req.clerkUserId,
        req.query.q
      );

    return successResponse(res, {
      players,
    });
  } catch (error) {
    next(error);
  }
}

async function createChallenge(req, res) {
  try {
    const challenge =
      await lobbyService.createChallenge({
        challengerClerkUserId:
          req.clerkUserId,
        challengedClerkUserId:
          req.body.opponentClerkUserId,
        colorPreference:
          req.body.colorPreference || "random",
        timeControlSeconds:
          req.body.timeControlSeconds ?? null,
      });

    return successResponse(
      res,
      { challenge },
      201
    );
  } catch (error) {
    return handleError(res, error);
  }
}

async function acceptChallenge(req, res) {
  try {
    const result =
      await lobbyService.acceptChallenge(
        req.params.challengeId,
        req.clerkUserId
      );

    return successResponse(
      res,
      result
    );
  } catch (error) {
    return handleError(res, error);
  }
}

async function declineChallenge(req, res) {
  try {
    const challenge =
      await lobbyService.declineChallenge(
        req.params.challengeId,
        req.clerkUserId
      );

    return successResponse(
      res,
      { challenge }
    );
  } catch (error) {
    return handleError(res, error);
  }
}

async function cancelChallenge(req, res) {
  try {
    const challenge =
      await lobbyService.cancelChallenge(
        req.params.challengeId,
        req.clerkUserId
      );

    return successResponse(
      res,
      { challenge }
    );
  } catch (error) {
    return handleError(res, error);
  }
}

async function joinMatchmaking(req, res) {
  try {
    const result =
      await lobbyService.joinMatchmaking({
        clerkUserId:
          req.clerkUserId,
        timeControlSeconds:
          req.body.timeControlSeconds ?? null,
        colorPreference:
          req.body.colorPreference || "random",
      });

    return successResponse(
      res,
      result,
      201
    );
  } catch (error) {
    return handleError(res, error);
  }
}

async function leaveMatchmaking(req, res) {
  try {
    const result =
      await lobbyService.leaveMatchmaking(
        req.clerkUserId
      );

    return successResponse(
      res,
      result
    );
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  getLobby,
  searchPlayers,
  createChallenge,
  acceptChallenge,
  declineChallenge,
  cancelChallenge,
  joinMatchmaking,
  leaveMatchmaking,
};