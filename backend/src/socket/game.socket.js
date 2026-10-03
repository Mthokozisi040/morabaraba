const {
  getGame,
  getGameInfo,
  getPlayerColor,
  makePlayerMove,
  getPlayerLegalMoves,
  getCaptureTargets,
  resignGame,
} = require("../services/game.service");

async function registerGameSocket(
  io,
  socket
) {
  const clerkUserId =
    socket.userId;

  /*
   * JOIN GAME
   */
  socket.on(
    "game:join",
    async (payload = {}) => {
      try {
        const {
          gameId,
        } = payload;

        if (!gameId) {
          return socket.emit(
            "game:error",
            {
              message:
                "gameId is required.",
            }
          );
        }

        const game =
          await getGame(
            gameId
          );

        /*
         * This also verifies that
         * the Clerk user is actually
         * one of the players.
         */
        const playerColor =
          getPlayerColor(
            game,
            clerkUserId
          );

        if (
          socket.gameId
        ) {
          socket.leave(
            socket.gameId
          );
        }

        socket.join(
          gameId
        );

        socket.gameId =
          gameId;

        socket.playerColor =
          playerColor;

        socket.emit(
          "game:state",
          {
            game,
            playerColor,
          }
        );

        socket
          .to(gameId)
          .emit(
            "game:player_joined",
            {
              playerColor,
            }
          );

        const room =
          io.sockets.adapter.rooms.get(
            gameId
          );

        io.to(gameId).emit(
          "game:presence",
          {
            connectedPlayers:
              room
                ? room.size
                : 0,
          }
        );

        console.log(
          `[SOCKET] ${clerkUserId} joined ${gameId} as ${playerColor}`
        );
      } catch (error) {
        socket.emit(
          "game:error",
          {
            message:
              error.message,
          }
        );
      }
    }
  );

  /*
   * MAKE MOVE
   *
   * Client sends:
   *
   * {
   *   gameId,
   *   action: {
   *     type,
   *     position,
   *     from,
   *     to
   *   }
   * }
   *
   * Client does NOT send player.
   */
  socket.on(
    "game:move",
    async (payload = {}) => {
      try {
        const {
          gameId,
          action,
        } = payload;

        if (
          !gameId ||
          !action
        ) {
          return socket.emit(
            "game:error",
            {
              message:
                "gameId and action are required.",
            }
          );
        }

        if (
          socket.gameId !==
          gameId
        ) {
          return socket.emit(
            "game:error",
            {
              message:
                "You are not connected to this game.",
            }
          );
        }

        /*
         * The service derives
         * player color from Clerk.
         */
        const updatedGame =
          await makePlayerMove(
            gameId,
            clerkUserId,
            action
          );

        io.to(gameId).emit(
          "game:state",
          {
            game:
              updatedGame,
          }
        );

        io.to(gameId).emit(
          "game:move",
          {
            playerColor:
              socket.playerColor,
            action,
            game:
              updatedGame,
          }
        );

        if (
          updatedGame.status ===
            "finished" ||
          updatedGame.status ===
            "draw"
        ) {
          io.to(gameId).emit(
            "game:finished",
            {
              game:
                updatedGame,
            }
          );
        }

        console.log(
          `[SOCKET] ${clerkUserId} made ${action.type} in ${gameId}`
        );
      } catch (error) {
        socket.emit(
          "game:error",
          {
            message:
              error.message,
          }
        );
      }
    }
  );

  /*
   * RESIGN
   */
  socket.on(
    "game:resign",
    async (payload = {}) => {
      try {
        const {
          gameId,
        } = payload;

        if (!gameId) {
          return socket.emit(
            "game:error",
            {
              message:
                "gameId is required.",
            }
          );
        }

        if (
          socket.gameId !==
          gameId
        ) {
          return socket.emit(
            "game:error",
            {
              message:
                "You are not connected to this game.",
            }
          );
        }

        const updatedGame =
          await resignGame(
            gameId,
            clerkUserId
          );

        io.to(gameId).emit(
          "game:state",
          {
            game:
              updatedGame,
          }
        );

        io.to(gameId).emit(
          "game:finished",
          {
            game:
              updatedGame,
            reason:
              "resignation",
          }
        );
      } catch (error) {
        socket.emit(
          "game:error",
          {
            message:
              error.message,
          }
        );
      }
    }
  );

  /*
   * CURRENT STATE
   */
  socket.on(
    "game:state",
    async (payload = {}) => {
      try {
        const {
          gameId,
        } = payload;

        if (
          socket.gameId !==
          gameId
        ) {
          return socket.emit(
            "game:error",
            {
              message:
                "You are not connected to this game.",
            }
          );
        }

        const game =
          await getGame(
            gameId
          );

        const playerColor =
          getPlayerColor(
            game,
            clerkUserId
          );

        socket.emit(
          "game:state",
          {
            game,
            playerColor,
          }
        );
      } catch (error) {
        socket.emit(
          "game:error",
          {
            message:
              error.message,
          }
        );
      }
    }
  );

  /*
   * LEGAL MOVES
   */
  socket.on(
    "game:legal_moves",
    async (payload = {}) => {
      try {
        const {
          gameId,
        } = payload;

        if (
          socket.gameId !==
          gameId
        ) {
          return socket.emit(
            "game:error",
            {
              message:
                "You are not connected to this game.",
            }
          );
        }

        const moves =
          await getPlayerLegalMoves(
            gameId,
            clerkUserId
          );

        socket.emit(
          "game:legal_moves",
          {
            gameId,
            playerColor:
              socket.playerColor,
            moves,
          }
        );
      } catch (error) {
        socket.emit(
          "game:error",
          {
            message:
              error.message,
          }
        );
      }
    }
  );

  /*
   * CAPTURE TARGETS
   */
  socket.on(
    "game:capture_targets",
    async (payload = {}) => {
      try {
        const {
          gameId,
        } = payload;

        if (
          socket.gameId !==
          gameId
        ) {
          return socket.emit(
            "game:error",
            {
              message:
                "You are not connected to this game.",
            }
          );
        }

        const targets =
          await getCaptureTargets(
            gameId,
            clerkUserId
          );

        socket.emit(
          "game:capture_targets",
          {
            gameId,
            playerColor:
              socket.playerColor,
            targets,
          }
        );
      } catch (error) {
        socket.emit(
          "game:error",
          {
            message:
              error.message,
          }
        );
      }
    }
  );

  /*
   * DISCONNECT
   *
   * Do not automatically end
   * the game.
   */
  socket.on(
    "disconnect",
    (reason) => {
      if (
        !socket.gameId
      ) {
        return;
      }

      const gameId =
        socket.gameId;

      console.log(
        `[SOCKET] ${clerkUserId} disconnected from ${gameId}: ${reason}`
      );

      socket
        .to(gameId)
        .emit(
          "game:player_disconnected",
          {
            playerColor:
              socket.playerColor,
            reason,
          }
        );

      const room =
        io.sockets.adapter.rooms.get(
          gameId
        );

      io.to(gameId).emit(
        "game:presence",
        {
          connectedPlayers:
            room
              ? room.size
              : 0,
        }
      );
    }
  );
}

module.exports =
  registerGameSocket;