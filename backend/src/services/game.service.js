const {
  createInitialState,
  applyAction,
  getLegalMoves,
  getAvailableCaptureTargets,
  getGameSummary,
  ACTIONS,
} = require("morabaraba-game-engine");

const repository = require("./game.repository");

/**
 * Create a new Morabaraba game.
 */
async function createGame({
  gameId,
  whitePlayerId,
  blackPlayerId,
  timeControl = null,
}) {
  if (!gameId) {
    throw new Error("gameId is required");
  }

  if (!whitePlayerId) {
    throw new Error("whitePlayerId is required");
  }

  if (!blackPlayerId) {
    throw new Error("blackPlayerId is required");
  }

  if (whitePlayerId === blackPlayerId) {
    throw new Error(
      "A player cannot play against themselves"
    );
  }

  const existingGame =
    await repository.findGameByPublicId(gameId);

  if (existingGame) {
    throw new Error("Game already exists");
  }

  const state = createInitialState({
    gameId,
    whitePlayerId,
    blackPlayerId,
    timeControl,
  });

  await repository.createGame(state);

  return state;
}

/**
 * Get a game from Neon.
 */
async function getGame(gameId) {
  const record =
    await repository.findGameByPublicId(gameId);

  if (!record) {
    throw new Error("Game not found");
  }

  return record.game_state;
}

/**
 * Check whether a game exists.
 */
async function gameExists(gameId) {
  const record =
    await repository.findGameByPublicId(gameId);

  return Boolean(record);
}

/**
 * Apply an authoritative engine action
 * and persist the resulting state.
 */
async function makeMove(gameId, action) {
  const currentState = await getGame(gameId);

  const updatedState = applyAction(
    currentState,
    action
  );

  await repository.updateGame(updatedState);

  return updatedState;
}

/**
 * Get legal moves for a player.
 */
async function getPlayerLegalMoves(
  gameId,
  playerId
) {
  const state = await getGame(gameId);

  if (state.status !== "active") {
    return [];
  }

  if (
    state.currentPlayer !==
    getPlayerColor(state, playerId)
  ) {
    return [];
  }

  return getLegalMoves(state);
}

/**
 * Get possible capture targets.
 */
async function getCaptureTargets(
  gameId,
  playerId
) {
  const state = await getGame(gameId);

  const playerColor =
    getPlayerColor(state, playerId);

  if (state.currentPlayer !== playerColor) {
    return [];
  }

  if (!state.pendingCapture) {
    return [];
  }

  return getAvailableCaptureTargets(
    state,
    playerColor
  );
}

/**
 * Convert player ID into engine color.
 */
function getPlayerColor(state, playerId) {
  if (state.players.white === playerId) {
    return "white";
  }

  if (state.players.black === playerId) {
    return "black";
  }

  throw new Error(
    "Player is not part of this game"
  );
}

/**
 * Resign a game.
 */
async function resignGame(
  gameId,
  playerId
) {
  const state = await getGame(gameId);

  const player =
    getPlayerColor(state, playerId);

  return makeMove(gameId, {
    type: ACTIONS.RESIGN,
    player,
  });
}

/**
 * Return frontend-safe summary.
 */
async function getGameInfo(gameId) {
  const state = await getGame(gameId);

  return getGameSummary(state);
}

/**
 * Return complete game state.
 */
async function getGameState(gameId) {
  return getGame(gameId);
}

/**
 * Delete a game.
 */
async function deleteGame(gameId) {
  return repository.deleteGame(gameId);
}

/**
 * Get all persisted games.
 */
async function getAllGames() {
  return repository.getAllGames();
}

module.exports = {
  createGame,
  getGame,
  gameExists,
  makeMove,
  getPlayerLegalMoves,
  getCaptureTargets,
  getPlayerColor,
  resignGame,
  getGameInfo,
  getGameState,
  deleteGame,
  getAllGames,
};