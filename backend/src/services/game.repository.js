const {
  pool,
} = require("../config/database");

/*
 * Convert engine state into
 * database columns.
 */
function stateToDatabase(
  game
) {
  return {
    publicId:
      game.gameId,

    status:
      game.status,

    phase:
      game.phase,

    currentPlayer:
      game.currentPlayer,

    boardState:
      game.board,

    gameState:
      game,

    moveNumber:
      game.moveNumber,

    startedAt:
      game.createdAt || null,

    finishedAt:
      game.status ===
        "finished" ||
      game.status ===
        "draw"
        ? game.updatedAt ||
          new Date().toISOString()
        : null,
  };
}

/*
 * Create game + players
 * in one transaction.
 */
async function createGame(
  game,
  {
    whiteUserId,
    blackUserId,
  }
) {
  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const data =
      stateToDatabase(game);

    const gameResult =
      await client.query(
        `
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
        `,
        [
          data.publicId,
          "casual",
          data.status,
          data.phase,
          data.currentPlayer,
          JSON.stringify(
            data.boardState
          ),
          JSON.stringify(
            data.gameState
          ),
          data.moveNumber,
          data.startedAt,
        ]
      );

    const gameRow =
      gameResult.rows[0];

    await client.query(
      `
        INSERT INTO game_players (
          game_id,
          user_id,
          player_number,
          color
        )
        VALUES
          ($1, $2, 1, 'white'),
          ($1, $3, 2, 'black');
      `,
      [
        gameRow.id,
        whiteUserId,
        blackUserId,
      ]
    );

    await client.query(
      "COMMIT"
    );

    return gameRow;
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}

/*
 * Find game by public ID.
 */
async function findGameByPublicId(
  gameId
) {
  const result =
    await pool.query(
      `
        SELECT *
        FROM games
        WHERE public_id = $1
        LIMIT 1;
      `,
      [gameId]
    );

  return (
    result.rows[0] ||
    null
  );
}

/*
 * Update authoritative game state.
 */
async function updateGame(
  game
) {
  const data =
    stateToDatabase(game);

  const result =
    await pool.query(
      `
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
      `,
      [
        data.publicId,
        data.status,
        data.phase,
        data.currentPlayer,
        JSON.stringify(
          data.boardState
        ),
        JSON.stringify(
          data.gameState
        ),
        data.moveNumber,
        data.finishedAt,
      ]
    );

  if (
    !result.rows[0]
  ) {
    throw new Error(
      "Game could not be updated."
    );
  }

  return result.rows[0];
}

async function deleteGame(
  gameId
) {
  const result =
    await pool.query(
      `
        DELETE FROM games
        WHERE public_id = $1
        RETURNING public_id;
      `,
      [gameId]
    );

  return (
    result.rowCount > 0
  );
}

async function getAllGames() {
  const result =
    await pool.query(
      `
        SELECT *
        FROM games
        ORDER BY created_at DESC;
      `
    );

  return result.rows;
}

module.exports = {
  createGame,
  findGameByPublicId,
  updateGame,
  deleteGame,
  getAllGames,
};