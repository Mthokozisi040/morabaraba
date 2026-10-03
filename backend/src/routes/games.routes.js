const express =
  require("express");

const {
  createGame,
  getGameInfo,
  getGameState,
  makePlayerMove,
  getPlayerLegalMoves,
  getCaptureTargets,
  getPlayerColor,
  resignGame,
} = require("../services/game.service");

const {
  requireAuth,
} = require("../middleware/clerk");

const router =
  express.Router();

/*
 * Every game endpoint requires
 * an authenticated Clerk user.
 */
router.use(requireAuth);

/*
 * POST /api/games
 *
 * Body:
 * {
 *   "gameId": "ABC123",
 *   "opponentClerkUserId": "user_xxxxx",
 *   "playerColor": "black",
 *   "timeControl": null
 * }
 *
 * The server determines which user
 * is White and which is Black.
 */
router.post(
  "/",
  async (req, res, next) => {
    try {
      const {
        opponentClerkUserId,
        playerColor = "white",
        timeControl,
        gameId,
      } = req.body || {};

      const creatorClerkUserId =
        req.clerkUserId;

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
        creatorClerkUserId
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code:
              "SELF_GAME",
            message:
              "You cannot create a game against yourself.",
          },
        });
      }

      if (
        playerColor !== "white" &&
        playerColor !== "black"
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code:
              "INVALID_PLAYER_COLOR",
            message:
              "playerColor must be white or black.",
          },
        });
      }

      /*
       * createGame() will:
       *
       * 1. Verify creator through Clerk
       * 2. Verify opponent through Clerk
       * 3. Sync both users into Neon
       * 4. Assign colors
       * 5. Create game
       * 6. Create game_players
       */
      const game =
        await createGame({
          gameId,
          creatorClerkUserId,
          opponentClerkUserId,
          playerColor,
          timeControl,
        });

      res.status(201).json({
        success: true,
        message:
          "Game created successfully.",
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

/*
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
       * user is actually a player.
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

/*
 * GET /api/games/:gameId/summary
 */
router.get(
  "/:gameId/summary",
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

      const summary =
        await getGameInfo(
          req.params.gameId
        );

      res.json({
        success: true,
        player:
          playerColor,
        game: summary,
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
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
        player:
          playerColor,
        moves,
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
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
        player:
          playerColor,
        targets,
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * POST /api/games/:gameId/moves
 *
 * The client sends ONLY the action.
 *
 * It does NOT send player/color.
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

      const action = {
        type,
      };

      if (
        position !==
        undefined
      ) {
        action.position =
          position;
      }

      if (
        from !==
        undefined
      ) {
        action.from =
          from;
      }

      if (
        to !==
        undefined
      ) {
        action.to =
          to;
      }

      /*
       * makePlayerMove() gets the color
       * directly from the authenticated
       * Clerk user.
       */
      const updatedGame =
        await makePlayerMove(
          req.params.gameId,
          req.clerkUserId,
          action
        );

      res.json({
        success: true,
        message:
          "Move accepted.",
        game:
          updatedGame,
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * POST /api/games/:gameId/resign
 *
 * No playerId in the body.
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
          "Game resigned.",
        game:
          updatedGame,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;