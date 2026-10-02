const { pool } = require("../config/database");

/**
 * Convert engine state into database columns.
 */
function stateToDatabase(game) {
  return {
    publicId: game.gameId,
    status: game.status,
    phase: game.phase,
    currentPlayer: game.currentPlayer,
    boardState: game.board,
    gameState: game,
    moveNumber: game.moveNumber,
    startedAt: game.createdAt || null,
    finishedAt:
      game.status === "finished" || game.status === "draw"
        ? game.updatedAt || new Date().toISOString()
        : null,
  };
}

/**
 * Save a new game.
 */
async function createGame(game) {
  const data = stateToDatabase(game);

  const query = `
    INSERT INTO games (
      public_id,
      game_type,
      status,
      phase,
      current_player,
      board_state,
      game_state,
      move_number,
      started_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6::jsonb,
      $7::jsonb,
      $8,
      $9
    )
    RETURNING *;
  `;

  const values = [
    data.publicId,
    "casual",
    data.status,
    data.phase,
    data.currentPlayer,
    JSON.stringify(data.boardState),
    JSON.stringify(data.gameState),
    data.moveNumber,
    data.startedAt,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

/**
 * Find a game by its public Align It game ID.
 */
async function findGameByPublicId(gameId) {
  const query = `
    SELECT *
    FROM games
    WHERE public_id = $1
    LIMIT 1;
  `;

  const result = await pool.query(query, [gameId]);

  return result.rows[0] || null;
}

/**
 * Update the persisted game state.
 */
async function updateGame(game) {
  const data = stateToDatabase(game);

  const query = `
    UPDATE games
    SET
      status = $2,
      phase = $3,
      current_player = $4,
      board_state = $5::jsonb,
      game_state = $6::jsonb,
      move_number = $7,
      finished_at = $8,
      updated_at = NOW()
    WHERE public_id = $1
    RETURNING *;
  `;

  const values = [
    data.publicId,
    data.status,
    data.phase,
    data.currentPlayer,
    JSON.stringify(data.boardState),
    JSON.stringify(data.gameState),
    data.moveNumber,
    data.finishedAt,
  ];

  const result = await pool.query(query, values);

  return result.rows[0] || null;
}

/**
 * Delete a game.
 */
async function deleteGame(gameId) {
  const query = `
    DELETE FROM games
    WHERE public_id = $1
    RETURNING public_id;
  `;

  const result = await pool.query(query, [gameId]);

  return result.rowCount > 0;
}

/**
 * Get all persisted games.
 */
async function getAllGames() {
  const query = `
    SELECT *
    FROM games
    ORDER BY created_at DESC;
  `;

  const result = await pool.query(query);

  return result.rows;
}

module.exports = {
  createGame,
  findGameByPublicId,
  updateGame,
  deleteGame,
  getAllGames,
};