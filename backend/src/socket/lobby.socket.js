const {
  getLobbyData,
} = require("../services/lobby.service");

async function emitLobbyState(
  io,
  socket
) {
  try {
    const data =
      await getLobbyData(
        socket.userId
      );

    socket.emit(
      "lobby:state",
      data
    );
  } catch (error) {
    socket.emit(
      "lobby:error",
      {
        code:
          error.code ||
          "LOBBY_STATE_ERROR",

        message:
          error.message ||
          "Unable to load lobby.",
      }
    );
  }
}

function registerLobbySocket(
  io,
  socket
) {
  socket.join(
    `user:${socket.userId}`
  );

  socket.on(
    "lobby:refresh",
    async () => {
      await emitLobbyState(
        io,
        socket
      );
    }
  );

  socket.on(
    "lobby:watch",
    async () => {
      await emitLobbyState(
        io,
        socket
      );
    }
  );

  socket.emit(
    "lobby:connected",
    {
      userId: socket.userId,
    }
  );
}

function notifyUser(
  io,
  clerkUserId,
  event,
  payload
) {
  io.to(
    `user:${clerkUserId}`
  ).emit(
    event,
    payload
  );
}

module.exports = {
  registerLobbySocket,
  emitLobbyState,
  notifyUser,
};