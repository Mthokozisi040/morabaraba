const express = require("express");

const {
  createGame,
  getGameInfo,
  getGameState,
  makeMove,
  getPlayerLegalMoves,
  getCaptureTargets,
  resignGame,
} = require("../services/game.service");

const router = express.Router();

/**
 * POST /api/games
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      gameId,
      whitePlayerId,
      blackPlayerId,
      timeControl,
    } = req.body || {};

    const game = await createGame({
      gameId,
      whitePlayerId,
      blackPlayerId,
      timeControl,
    });

    res.status(201).json({
      success: true,
      message: "Game created successfully",
      game: await getGameInfo(game.gameId),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/games/:gameId
 */
router.get(
  "/:gameId",
  async (req, res, next) => {
    try {
      const game = await getGameState(
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
 * GET /api/games/:gameId/summary
 */
router.get(
  "/:gameId/summary",
  async (req, res, next) => {
    try {
      const game = await getGameInfo(
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
 * GET legal moves.
 */
router.get(
  "/:gameId/legal-moves/:playerId",
  async (req, res, next) => {
    try {
      const moves =
        await getPlayerLegalMoves(
          req.params.gameId,
          req.params.playerId
        );

      res.json({
        success: true,
        moves,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET capture targets.
 */
router.get(
  "/:gameId/capture-targets/:playerId",
  async (req, res, next) => {
    try {
      const targets =
        await getCaptureTargets(
          req.params.gameId,
          req.params.playerId
        );

      res.json({
        success: true,
        targets,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST move.
 */
router.post(
  "/:gameId/moves",
  async (req, res, next) => {
    try {
      const {
        type,
        player,
        position,
        from,
        to,
      } = req.body || {};

      const action = {
        type,
        player,
      };

      if (position !== undefined) {
        action.position = position;
      }

      if (from !== undefined) {
        action.from = from;
      }

      if (to !== undefined) {
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
 * POST resign.
 */
router.post(
  "/:gameId/resign",
  async (req, res, next) => {
    try {
      const { playerId } =
        req.body || {};

      const updatedGame =
        await resignGame(
          req.params.gameId,
          playerId
        );

      res.json({
        success: true,
        message: "Game resigned",
        game: updatedGame,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;