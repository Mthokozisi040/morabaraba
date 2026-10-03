const {
  createInitialState,
  applyAction,
  getLegalMoves,
  getAvailableCaptureTargets,
  getGameSummary,
  ACTIONS,
} = require("morabaraba-game-engine");

const repository =
  require("./game.repository");

const {
  getOrCreateUser,
} = require("./user.service");

/*
 * Create a new game.
 *
 * The authenticated creator can choose
 * whether they want White or Black.
 *
 * The opponent is verified through Clerk
 * inside getOrCreateUser().
 */
async function createGame({
  gameId,
  creatorClerkUserId,
  opponentClerkUserId,
  playerColor = "white",
  timeControl = null,
}) {
  if (!gameId) {
    throw new Error(
      "gameId is required"
    );
  }

  if (!creatorClerkUserId) {
    throw new Error(
      "creatorClerkUserId is required"
    );
  }

  if (!opponentClerkUserId) {
    throw new Error(
      "opponentClerkUserId is required"
    );
  }

  if (
    creatorClerkUserId ===
    opponentClerkUserId
  ) {
    throw new Error(
      "A player cannot play against themselves."
    );
  }

  if (
    playerColor !== "white" &&
    playerColor !== "black"
  ) {
    throw new Error(
      "playerColor must be white or black."
    );
  }

  const existingGame =
    await repository.findGameByPublicId(
      gameId
    );

  if (existingGame) {
    throw new Error(
      "Game already exists."
    );
  }

  /*
   * IMPORTANT:
   *
   * Both users are verified against Clerk.
   *
   * This also synchronizes them into Neon.
   */
  const creatorUser =
    await getOrCreateUser(
      creatorClerkUserId
    );

  const opponentUser =
    await getOrCreateUser(
      opponentClerkUserId
    );

  /*
   * Decide colors on the server.
   */
  let whitePlayerId;
  let blackPlayerId;
  let whiteUserId;
  let blackUserId;

  if (
    playerColor === "white"
  ) {
    whitePlayerId =
      creatorClerkUserId;

    blackPlayerId =
      opponentClerkUserId;

    whiteUserId =
      creatorUser.id;

    blackUserId =
      opponentUser.id;
  } else {
    whitePlayerId =
      opponentClerkUserId;

    blackPlayerId =
      creatorClerkUserId;

    whiteUserId =
      opponentUser.id;

    blackUserId =
      creatorUser.id;
  }

  const state =
    createInitialState({
      gameId,
      whitePlayerId,
      blackPlayerId,
      timeControl,
    });

  await repository.createGame(
    state,
    {
      whiteUserId,
      blackUserId,
    }
  );

  return state;
}

/*
 * Get game from Neon.
 */
async function getGame(
  gameId
) {
  const record =
    await repository.findGameByPublicId(
      gameId
    );

  if (!record) {
    const error =
      new Error(
        "Game not found."
      );

    error.code =
      "GAME_NOT_FOUND";

    throw error;
  }

  return record.game_state;
}

async function gameExists(
  gameId
) {
  const record =
    await repository.findGameByPublicId(
      gameId
    );

  return Boolean(record);
}

/*
 * Apply an engine action.
 *
 * This function is intentionally
 * internal to the game service.
 */
async function makeMove(
  gameId,
  action
) {
  const currentState =
    await getGame(gameId);

  const updatedState =
    applyAction(
      currentState,
      action
    );

  await repository.updateGame(
    updatedState
  );

  return updatedState;
}

/*
 * Make a move for a specific
 * authenticated Clerk user.
 *
 * The caller cannot choose the player color.
 */
async function makePlayerMove(
  gameId,
  clerkUserId,
  action
) {
  const state =
    await getGame(gameId);

  const playerColor =
    getPlayerColor(
      state,
      clerkUserId
    );

  const serverAction = {
    ...action,
    player:
      playerColor,
  };

  return makeMove(
    gameId,
    serverAction
  );
}

/*
 * Get legal moves for a player.
 */
async function getPlayerLegalMoves(
  gameId,
  playerId
) {
  const state =
    await getGame(gameId);

  if (
    state.status !==
    "active"
  ) {
    return [];
  }

  const playerColor =
    getPlayerColor(
      state,
      playerId
    );

  if (
    state.currentPlayer !==
    playerColor
  ) {
    return [];
  }

  return getLegalMoves(
    state
  );
}

/*
 * Get capture targets.
 */
async function getCaptureTargets(
  gameId,
  playerId
) {
  const state =
    await getGame(gameId);

  const playerColor =
    getPlayerColor(
      state,
      playerId
    );

  if (
    state.currentPlayer !==
    playerColor
  ) {
    return [];
  }

  if (
    !state.pendingCapture
  ) {
    return [];
  }

  return getAvailableCaptureTargets(
    state,
    playerColor
  );
}

/*
 * Determine the player's color
 * from the authoritative game state.
 */
function getPlayerColor(
  state,
  playerId
) {
  if (
    state.players.white ===
    playerId
  ) {
    return "white";
  }

  if (
    state.players.black ===
    playerId
  ) {
    return "black";
  }

  const error =
    new Error(
      "Player is not part of this game."
    );

  error.code =
    "NOT_GAME_PLAYER";

  throw error;
}

/*
 * Resign a game.
 */
async function resignGame(
  gameId,
  playerId
) {
  const state =
    await getGame(gameId);

  const player =
    getPlayerColor(
      state,
      playerId
    );

  return makeMove(
    gameId,
    {
      type:
        ACTIONS.RESIGN,
      player,
    }
  );
}

async function getGameInfo(
  gameId
) {
  const state =
    await getGame(gameId);

  return getGameSummary(
    state
  );
}

async function getGameState(
  gameId
) {
  return getGame(gameId);
}

async function deleteGame(
  gameId
) {
  return repository.deleteGame(
    gameId
  );
}

async function getAllGames() {
  return repository.getAllGames();
}

module.exports = {
  createGame,
  getGame,
  gameExists,
  makeMove,
  makePlayerMove,
  getPlayerLegalMoves,
  getCaptureTargets,
  getPlayerColor,
  resignGame,
  getGameInfo,
  getGameState,
  deleteGame,
  getAllGames,
};