const express = require("express");

const {
  requireAuth,
} = require("../middleware/clerk");

const controller =
  require("../controllers/lobby.controller");

const router = express.Router();

router.use(requireAuth);

router.get(
  "/",
  controller.getLobby
);

router.get(
  "/players/search",
  controller.searchPlayers
);

router.post(
  "/challenges",
  controller.createChallenge
);

router.post(
  "/challenges/:challengeId/accept",
  controller.acceptChallenge
);

router.post(
  "/challenges/:challengeId/decline",
  controller.declineChallenge
);

router.post(
  "/challenges/:challengeId/cancel",
  controller.cancelChallenge
);

router.post(
  "/matchmaking/join",
  controller.joinMatchmaking
);

router.post(
  "/matchmaking/leave",
  controller.leaveMatchmaking
);

module.exports = router;