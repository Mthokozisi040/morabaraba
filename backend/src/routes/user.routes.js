const express = require("express");

const {
  createGame,
  getGameInfo,
  getGameState,
  makeMove,
  getPlayerLegalMoves,
  getCaptureTargets,
  getPlayerColor,
  resignGame,
} = require("../services/game.service");

const {
  requireAuth,
} = require("../middleware/clerk");

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

const router =
  express.Router();
router.use(requireAuth);

/**
 * POST /api/games
 *
 * Authenticated user = White.
 */
router.post(
  "/",
  async (req, res, next) => {
    try {
      const {
        gameId,
        opponentClerkUserId,
        timeControl,
      } = req.body || {};

      if (
        !opponentClerkUserId
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code:
              "OPPONENT_REQUIRED",
            message:
              "opponentClerkUserId is required.",
          },
        });
      }

      if (
        opponentClerkUserId ===
        req.clerkUserId
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "SELF_GAME",
            message:
              "You cannot play against yourself.",
          },
        });
      }

      const game =
        await createGame({
          gameId,
          whitePlayerId:
            req.clerkUserId,
          blackPlayerId:
            opponentClerkUserId,
          timeControl,
        });

      res.status(201).json({
        success: true,
        message:
          "Game created successfully",
        game:
          await getGameInfo(
            game.gameId
          ),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/games/:gameId
 */
router.get(
  "/:gameId",
  async (req, res, next) => {
    try {
      const game =
        await getGameState(
          req.params.gameId
        );

      /*
       * Make sure this authenticated
       * user belongs to the game.
       */
      getPlayerColor(
        game,
        req.clerkUserId
      );

      res.json({
        success: true,
        game,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/games/:gameId/summary
 */
router.get(
  "/:gameId/summary",
  async (req, res, next) => {
    try {
      const gameState =
        await getGameState(
          req.params.gameId
        );

      getPlayerColor(
        gameState,
        req.clerkUserId
      );

      const game =
        await getGameInfo(
          req.params.gameId
        );

      res.json({
        success: true,
        game,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/games/:gameId/legal-moves
 */
router.get(
  "/:gameId/legal-moves",
  async (req, res, next) => {
    try {
      const game =
        await getGameState(
          req.params.gameId
        );

      const playerColor =
        getPlayerColor(
          game,
          req.clerkUserId
        );

      const moves =
        await getPlayerLegalMoves(
          req.params.gameId,
          req.clerkUserId
        );

      res.json({
        success: true,
        player: playerColor,
        moves,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/games/:gameId/capture-targets
 */
router.get(
  "/:gameId/capture-targets",
  async (req, res, next) => {
    try {
      const game =
        await getGameState(
          req.params.gameId
        );

      const playerColor =
        getPlayerColor(
          game,
          req.clerkUserId
        );

      const targets =
        await getCaptureTargets(
          req.params.gameId,
          req.clerkUserId
        );

      res.json({
        success: true,
        player: playerColor,
        targets,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/games/:gameId/moves
 */
router.post(
  "/:gameId/moves",
  async (req, res, next) => {
    try {
      const {
        type,
        position,
        from,
        to,
      } = req.body || {};

      const game =
        await getGameState(
          req.params.gameId
        );

      const playerColor =
        getPlayerColor(
          game,
          req.clerkUserId
        );

      /*
       * The player comes from Clerk.
       * Never from req.body.
       */
      const action = {
        type,
        player: playerColor,
      };

      if (
        position !== undefined
      ) {
        action.position =
          position;
      }

      if (
        from !== undefined
      ) {
        action.from = from;
      }

      if (
        to !== undefined
      ) {
        action.to = to;
      }

      const updatedGame =
        await makeMove(
          req.params.gameId,
          action
        );

      res.json({
        success: true,
        message: "Move accepted",
        game: updatedGame,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/games/:gameId/resign
 */
router.post(
  "/:gameId/resign",
  async (req, res, next) => {
    try {
      const updatedGame =
        await resignGame(
          req.params.gameId,
          req.clerkUserId
        );

      res.json({
        success: true,
        message:
          "Game resigned",
        game: updatedGame,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;