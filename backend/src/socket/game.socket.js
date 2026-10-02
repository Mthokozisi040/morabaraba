// backend/src/socket/game.socket.js
const {
  getGame,
  getGameInfo,
  getPlayerColor,
  makeMove,
  getPlayerLegalMoves,
  getCaptureTargets,
  resignGame,
} = require("../services/game.service");

function registerGameSocket(io, socket) {
  
  socket.on("game:join", (payload = {}) => {
    try {
      const { gameId, playerId } = payload;

      if (!gameId || !playerId) {
        socket.emit("game:error", {
          message: "gameId and playerId are required",
        });

        return;
      }

      const game = getGame(gameId);

      // Verify that this player actually belongs to the game.
      const playerColor = getPlayerColor(game, playerId);

      // Leave any previous game room.
      if (socket.gameId) {
        socket.leave(socket.gameId);
      }

      // Join the game room.
      socket.join(gameId);

      // Store connection information on this socket.
      socket.gameId = gameId;
      socket.playerId = playerId;
      socket.playerColor = playerColor;

      // Send the current state to the player who just joined.
      socket.emit("game:state", {
        game: game,
      });

      // Tell everyone in the room that this player joined.
      socket.to(gameId).emit("game:player_joined", {
        playerId,
        playerColor,
      });

      // Tell the room how many sockets are currently connected.
      const room = io.sockets.adapter.rooms.get(gameId);

      io.to(gameId).emit("game:presence", {
        connectedPlayers: room ? room.size : 0,
      });

      console.log(
        `[SOCKET] ${playerId} joined game ${gameId} as ${playerColor}`
      );
    } catch (error) {
      socket.emit("game:error", {
        message: error.message,
      });
    }
  });

  /*
   * MAKE MOVE
   *
   * Client sends:
   * {
   *   gameId: "game-001",
   *   playerId: "player-white",
   *   action: {
   *     type: "PLACE",
   *     player: "white",
   *     position: 0
   *   }
   * }
   */
  socket.on("game:move", (payload = {}) => {
    try {
      const {
        gameId,
        playerId,
        action,
      } = payload;

      if (!gameId || !playerId || !action) {
        socket.emit("game:error", {
          message: "gameId, playerId and action are required",
        });

        return;
      }

      // Make sure the socket actually joined this game.
      if (
        socket.gameId !== gameId ||
        socket.playerId !== playerId
      ) {
        socket.emit("game:error", {
          message: "You are not connected to this game",
        });

        return;
      }

      const game = getGame(gameId);

      // Convert authenticated/player identity into the engine color.
      const playerColor = getPlayerColor(game, playerId);

      // Never trust the player value sent by the browser.
      const serverAction = {
        ...action,
        player: playerColor,
      };

      const updatedGame = makeMove(
        gameId,
        serverAction
      );

      // Broadcast the authoritative result to everyone.
      io.to(gameId).emit("game:state", {
        game: updatedGame,
      });

      // Also tell clients specifically what happened.
      io.to(gameId).emit("game:move", {
        playerId,
        playerColor,
        action: serverAction,
        game: updatedGame,
      });

      console.log(
        `[SOCKET] ${playerId} made ${serverAction.type} in ${gameId}`
      );
    } catch (error) {
      // Only the player who attempted the invalid move gets the error.
      socket.emit("game:error", {
        message: error.message,
      });
    }
  });

  /*
   * RESIGN
   */
  socket.on("game:resign", (payload = {}) => {
    try {
      const { gameId, playerId } = payload;

      if (!gameId || !playerId) {
        socket.emit("game:error", {
          message: "gameId and playerId are required",
        });

        return;
      }

      if (
        socket.gameId !== gameId ||
        socket.playerId !== playerId
      ) {
        socket.emit("game:error", {
          message: "You are not connected to this game",
        });

        return;
      }

      const updatedGame = resignGame(
        gameId,
        playerId
      );

      io.to(gameId).emit("game:state", {
        game: updatedGame,
      });

      io.to(gameId).emit("game:finished", {
        game: updatedGame,
        reason: "resignation",
      });

      console.log(
        `[SOCKET] ${playerId} resigned game ${gameId}`
      );
    } catch (error) {
      socket.emit("game:error", {
        message: error.message,
      });
    }
  });

  /*
   * REQUEST CURRENT STATE
   */
  socket.on("game:state", (payload = {}) => {
    try {
      const { gameId } = payload;

      const game = getGame(gameId);

      socket.emit("game:state", {
        game,
      });
    } catch (error) {
      socket.emit("game:error", {
        message: error.message,
      });
    }
  });

  /*
   * REQUEST LEGAL MOVES
   */
  socket.on("game:legal_moves", (payload = {}) => {
    try {
      const { gameId, playerId } = payload;

      const moves = getPlayerLegalMoves(
        gameId,
        playerId
      );

      socket.emit("game:legal_moves", {
        gameId,
        playerId,
        moves,
      });
    } catch (error) {
      socket.emit("game:error", {
        message: error.message,
      });
    }
  });

  /*
   * REQUEST CAPTURE TARGETS
   */
  socket.on("game:capture_targets", (payload = {}) => {
    try {
      const { gameId, playerId } = payload;

      const targets = getCaptureTargets(
        gameId,
        playerId
      );

      socket.emit("game:capture_targets", {
        gameId,
        playerId,
        targets,
      });
    } catch (error) {
      socket.emit("game:error", {
        message: error.message,
      });
    }
  });

  /*
   * DISCONNECT
   *
   * We DO NOT end the game.
   *
   * A player can reconnect.
   */
  socket.on("disconnect", (reason) => {
    if (!socket.gameId) {
      return;
    }

    console.log(
      `[SOCKET] ${socket.playerId} disconnected from ${socket.gameId}: ${reason}`
    );

    socket.to(socket.gameId).emit("game:player_disconnected", {
      playerId: socket.playerId,
      playerColor: socket.playerColor,
      reason,
    });

    const room = io.sockets.adapter.rooms.get(
      socket.gameId
    );

    io.to(socket.gameId).emit("game:presence", {
      connectedPlayers: room ? room.size : 0,
    });
  });
}

module.exports = registerGameSocket;